import React, { useEffect, useRef, useState } from 'react';
import { 
  Engine, 
  Scene, 
  Vector3, 
  ArcRotateCamera,
  SceneLoader,
  Mesh,
  Color4,
  DynamicTexture,
  MeshBuilder,
  StandardMaterial,
  Color3,
  HDRCubeTexture,
  TransformNode
} from '@babylonjs/core';
import { GLTFFileLoader } from '@babylonjs/loaders';
import { RewardViewerComponentProps } from './types';

// Регистрируем GLTF лоадер
SceneLoader.RegisterPlugin(new GLTFFileLoader());

const RewardViewerComponent: React.FC<RewardViewerComponentProps> = ({
  rewardId,
  size = 'medium',
  autoRotate = true,
  onLoad,
  onError,
  // Новые пропсы для модального окна
  isModal = false,
  onClose,
  modalTitle,
  userName,
  // Информация о награде
  rewardName,
  rewardPrice,
  rewardDescription,
  // Пропсы для кнопки поделиться
  isUserLoggedIn = false,
  onShareClick,
  onGetRewardClick,
  showNotification = false
}) => {
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  // Используем useRef для callback-ов, чтобы избежать пересоздания useEffect
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  
  // Обновляем ref-ы при изменении callback-ов
  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  }, [onLoad, onError]);
  
  // Логика работы с URL для модального окна и отключение скролла
  useEffect(() => {
    if (isModal && onClose) {
      // Отключаем скролл страницы
      document.body.style.overflow = 'hidden';
      
      const handleUrlChange = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const rewardParam = urlParams.get('reward');
        if (!rewardParam) {
          onClose();
        }
      };

      window.addEventListener('popstate', handleUrlChange);
      
      return () => {
        window.removeEventListener('popstate', handleUrlChange);
        // Восстанавливаем скролл при закрытии
        document.body.style.overflow = 'auto';
      };
    }
  }, [isModal, onClose]);

  const handleClose = () => {
    if (onClose) {
      // Убираем параметр из URL
      const url = new URL(window.location.href);
      url.searchParams.delete('reward');
      window.history.pushState({}, '', url);
      onClose();
    }
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);

  // Если это модальное окно и onClose не передан, не рендерим ничего
  if (isModal && !onClose) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Закрываем модальное окно при клике в любом месте, кроме canvas
    const target = e.target as HTMLElement;
    if (!target.closest('canvas')) {
      handleClose();
    }
  };

  useEffect(() => {
    
    if (!canvasRef.current) {
      return;
    }

    // Создаем движок и сцену
    const canvas = canvasRef.current;
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    
    
    // Устанавливаем прозрачный фон
    scene.clearColor = new Color4(0, 0, 0, 0);
    
    // Устанавливаем размер canvas в зависимости от режима
    
    if (isModal) {
      // В модальном режиме делаем canvas квадратным на основе viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const minDimension = Math.min(viewportWidth, viewportHeight);
      
      // Уменьшаем размер canvas, чтобы оставить место для описания (120px + отступы)
      const reservedSpace = 180; // Место для описания и отступов
      const availableHeight = viewportHeight - reservedSpace;
      const availableSize = Math.min(viewportWidth, availableHeight);
      
      // Canvas занимает 70% от доступного размера, но не меньше 250px и не больше 500px
      const canvasSize = Math.max(250, Math.min(500, Math.floor(availableSize * 0.7)));
      
      // Увеличиваем разрешение canvas для четкости на высоких DPI экранах
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = canvasSize * pixelRatio;
      canvas.height = canvasSize * pixelRatio;
      canvas.style.width = canvasSize + 'px';
      canvas.style.height = canvasSize + 'px';
    } else {
      // В обычном режиме используем размер контейнера, но делаем квадратным
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const containerSize = Math.min(rect.width, rect.height);
        
        // Увеличиваем разрешение canvas для четкости на высоких DPI экранах
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = containerSize * pixelRatio;
        canvas.height = containerSize * pixelRatio;
        canvas.style.width = containerSize + 'px';
        canvas.style.height = containerSize + 'px';
      }
    }
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Создаем камеру
    const camera = new ArcRotateCamera(
      'camera',
      0, // alpha - горизонтальный угол (0°) - вид сзади
      Math.PI / 2,   // beta - вертикальный угол (90°)
      5,             // radius - начинаем издалека
      Vector3.Zero(),
      scene
    );
    
    camera.attachControl(canvas, true);
    
    // Полностью отключаем ВСЕ стандартные входы камеры
    camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
    camera.inputs.removeByType("ArcRotateCameraPointersInput");
    camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    camera.inputs.removeByType("ArcRotateCameraGamepadInput");
    
    // Создаем полностью кастомный обработчик только для одиночного касания
    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    
    // Переменные для инерции
    let velocityX = 0;
    let velocityY = 0;
    let lastTime = 0;
    let animationId: number | null = null;
    
    const handlePointerDown = (evt: PointerEvent) => {
      if (evt.pointerType === 'touch' && evt.pointerId !== undefined) {
        // Для тач-устройств разрешаем только одиночное касание
        const touches = (evt.target as any).touches || [];
        if (touches.length > 1) {
          evt.preventDefault();
          return false;
        }
      }
      
      // Останавливаем инерцию при новом касании
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      velocityX = 0;
      velocityY = 0;
      
      isDragging = true;
      lastPointerX = evt.clientX;
      lastPointerY = evt.clientY;
      lastTime = Date.now();
      evt.preventDefault();
      return false;
    };
    
    const handlePointerMove = (evt: PointerEvent) => {
      if (!isDragging) return;
      
      // Блокируем все мультитач жесты
      if (evt.pointerType === 'touch') {
        const touches = (evt.target as any).touches || [];
        if (touches.length > 1) {
          isDragging = false;
          evt.preventDefault();
          return false;
        }
      }
      
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      const deltaX = evt.clientX - lastPointerX;
      const deltaY = evt.clientY - lastPointerY;
      
      // Рассчитываем скорость для инерции
      if (deltaTime > 0) {
        velocityX = deltaX / deltaTime;
        velocityY = deltaY / deltaTime;
      }
      
      // Только горизонтальное вращение вокруг оси Y (влево-вправо), блокируем вертикальное вращение
      camera.alpha -= deltaX * 0.01; // Горизонтальное вращение (влево-вправо)
      camera.beta -= deltaY * 0.01;  // Вертикальное вращение
      
      
      lastPointerX = evt.clientX;
      lastPointerY = evt.clientY;
      lastTime = currentTime;
      evt.preventDefault();
      return false;
    };
    
    const handlePointerUp = (evt: PointerEvent) => {
      isDragging = false;
      
      // Запускаем инерцию если есть скорость
      if (Math.abs(velocityX) > 1.0 || Math.abs(velocityY) > 1.0) {
        const friction = 1.0; // Коэффициент трения (0.98 = очень медленное замедление)
        const minVelocity = 0.001; // Минимальная скорость для остановки
        
        const animateInertia = () => {
          // Применяем трение
          velocityX *= friction;
          velocityY *= friction;
          
          // Вращаем камеру с инерцией (увеличиваем чувствительность)
          camera.alpha -= velocityX * 0.02;
          
          // Продолжаем анимацию если скорость еще достаточная
          if (Math.abs(velocityX) > minVelocity || Math.abs(velocityY) > minVelocity) {
            animationId = requestAnimationFrame(animateInertia);
          } else {
            animationId = null;
          }
        };
        
        animationId = requestAnimationFrame(animateInertia);
      }
      
      evt.preventDefault();
      return false;
    };
    
    // Добавляем обработчики событий
    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
    
    // Блокируем все остальные события
    canvas.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    camera.lowerRadiusLimit = 0.5; // Минимальное расстояние - очень близко
    camera.upperRadiusLimit = 1.0; // Максимальное расстояние - близко
    camera.fov = 0.4; // Уменьшаем поле зрения для большего приближения
    camera.minZ = 0.1;
    
    // Полностью отключаем все способы управления камерой кроме вращения
    camera.panningSensibility = 0; // Отключаем панорамирование мышью
    camera.wheelPrecision = 0; // Отключаем зум колесиком мыши
    camera.pinchPrecision = 0; // Отключаем зум пинчем на тач-устройствах
    camera.allowUpsideDown = false; // Запрещаем переворачивание
    camera.useNaturalPinchZoom = false; // Отключаем естественный зум пинчем
    camera.pinchToPanMaxDistance = 0; // Отключаем панорамирование пинчем
    camera.angularSensibilityX = 3000; // Еще больше замедляем горизонтальное вращение
    camera.angularSensibilityY = 3000; // Еще больше замедляем вертикальное вращение
    
    // Дополнительные настройки для полной блокировки
    camera.inertia = 0; // Отключаем инерцию
    camera.panningInertia = 0; // Отключаем инерцию панорамирования
    camera.panningAxis = new Vector3(0, 0, 0); // Блокируем ось панорамирования

    // Улучшаем качество рендеринга
    engine.setHardwareScalingLevel(1 / window.devicePixelRatio); // Учитываем DPI для четкости
    
    // Создаем HDR освещение
    const envTexture = new HDRCubeTexture('/textures/environment/studio.hdr', scene, 512);
    scene.environmentTexture = envTexture;
    scene.environmentIntensity = 1.0;

    // Применяем настройки постобработки из SceneEditor - увеличиваем контраст
    scene.imageProcessingConfiguration!.exposure = 0.6; // Немного увеличиваем экспозицию
    scene.imageProcessingConfiguration!.contrast = 2.5; // Увеличиваем контраст
    scene.imageProcessingConfiguration!.toneMappingEnabled = true;
    scene.imageProcessingConfiguration!.toneMappingType = 0;

    // Настраиваем автовращение
    if (autoRotate) {
      (camera as any).autoRotate = true;
      (camera as any).autoRotateSpeed = 0.5;
    }

    // Добавляем умный обработчик клика по пустому месту
    if (isModal && onClose) {
      let isClick = false;
      let startTime = 0;
      let startX = 0;
      let startY = 0;
      
      scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === 1) { // POINTERDOWN
          const pickResult = scene.pick(pointerInfo.event.offsetX, pointerInfo.event.offsetY);
          // Если клик не попал в меш (пустое место)
          if (!pickResult || !pickResult.hit || !pickResult.pickedMesh) {
            isClick = true;
            startTime = Date.now();
            startX = pointerInfo.event.clientX;
            startY = pointerInfo.event.clientY;
          }
        } else if (pointerInfo.type === 2) { // POINTERMOVE
          if (isClick) {
            const currentTime = Date.now();
            const deltaX = Math.abs(pointerInfo.event.clientX - startX);
            const deltaY = Math.abs(pointerInfo.event.clientY - startY);
            
            // Если движение больше 10px или прошло больше 200ms - это свайп, не клик
            if (deltaX > 10 || deltaY > 10 || (currentTime - startTime) > 200) {
              isClick = false;
            }
          }
        } else if (pointerInfo.type === 3) { // POINTERUP
          if (isClick) {
            const currentTime = Date.now();
            const deltaX = Math.abs(pointerInfo.event.clientX - startX);
            const deltaY = Math.abs(pointerInfo.event.clientY - startY);
            
            // Если это был короткий клик без движения - закрываем окно
            if (deltaX <= 10 && deltaY <= 10 && (currentTime - startTime) < 200) {
              onClose();
            }
          }
          isClick = false;
        }
      });
    }

    // Загружаем 3D модель
    const rootUrl = `/models/rewards/${rewardId}/`;
    const fileName = `${rewardId}.gltf`;
    
    // Сбрасываем состояние загрузки
    setIsLoading(true);
    setLoadingError(null);
    
    
    SceneLoader.ImportMesh(
      '',
      rootUrl,
      fileName,
      scene,
      (meshes) => {
        // Центрируем модель
        if (meshes.length > 0) {
          const rootMesh = meshes[0];
          if (rootMesh instanceof Mesh) {
            
            // Масштабируем модель в зависимости от размера - увеличиваем для лучшей видимости
            const scale = size === 'small' ? 0.8 : size === 'large' ? 2.5 : 1.2;
            rootMesh.scaling = new Vector3(-scale, scale, scale); // Отрицательный X для отражения по горизонтали
            
            // Начинаем с ограниченной видимости
            camera.minZ = 0.1; // Ограничиваем ближнюю видимость
            camera.maxZ = 2; // Ограничиваем дальнюю видимость


            // Ищем дочерний меш для декали
            let targetMesh = rootMesh;
            
            for (let child of rootMesh.getChildren(undefined, false)) {
              if (child instanceof Mesh) {
                // Пробуем найти меш с именем 'shape' или любой другой меш
                if (child.name === 'shape' || child.name.includes('shape') || child.name.includes('medal') || child.name.includes('badge')) {
                  targetMesh = child;
                  break;
                }
              }
            }

            // Создаем комбинированную текстуру с настоящим SVG и именем пользователя
            const combinedTexture = new DynamicTexture(`combinedTexture_${Date.now()}`, 2048, scene);
            const textureContext = combinedTexture.getContext() as CanvasRenderingContext2D;
            
            // Настройки для лучшего качества рендеринга
            textureContext.imageSmoothingEnabled = true;
            textureContext.imageSmoothingQuality = 'high';
            
            // Прозрачный фон - не заливаем ничего, чтобы не влиять на контраст медали
            // textureContext.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Убираем фон
            // textureContext.fillRect(0, 0, 2048, 2048);
            
            // Сохраняем текущее состояние контекста
            textureContext.save();
            
            // Перемещаем в правый нижний угол и поворачиваем на 30 градусов
            textureContext.translate(1130, 1250); // Смещаем в правый нижний угол
            textureContext.rotate(-30 * Math.PI / 180); // -30 градусов (по часовой стрелке)
            
            // Загружаем локальный шрифт Bad Script
            new Promise(async (resolve) => {
              try {
                const font = new FontFace('Bad Script', 'url(/fonts/BadScript-Regular.ttf)');
                await font.load();
                (document.fonts as any).add(font);
                resolve(void 0);
              } catch (error) {
                resolve(void 0);
              }
            }).then(() => {
            
              // Рисуем имя пользователя сверху
              textureContext.fillStyle = '#8C5502'; // Темно-золотистый цвет
              textureContext.font = '400 68px "Bad Script"';
              textureContext.textAlign = 'center';
              textureContext.textBaseline = 'middle';
              textureContext.fillText(userName, 0, -50);
              
              textureContext.fillStyle = '#8C5502'; // Темно-золотистый цвет
              textureContext.font = '400 42px "Bad Script"';
              textureContext.textAlign = 'center';
              textureContext.textBaseline = 'middle';
              textureContext.fillText('· Среди первых ·', 0, 50);
              
              // Восстанавливаем состояние контекста
              textureContext.restore();
              
              // Обновляем текстуру
              combinedTexture.update();
            });

            // Пробуем создать декаль стандартным способом Babylon.js
            if (targetMesh.getTotalVertices() > 0 && targetMesh.material) {
              
              // Создаем материал для декали с правильными настройками
              const decalMaterial = new StandardMaterial(`decalMaterial_${Date.now()}`, scene);
              decalMaterial.diffuseTexture = combinedTexture;
              decalMaterial.diffuseTexture.hasAlpha = true;
              decalMaterial.zOffset = -2;
              decalMaterial.backFaceCulling = true; // Включаем culling для одной стороны
              decalMaterial.alpha = 1.0; // Полная непрозрачность
              decalMaterial.useAlphaFromDiffuseTexture = true; // Используем альфа из текстуры
              
              // Создаем декаль стандартным способом
              const decal = MeshBuilder.CreateDecal(`decal_${Date.now()}`, targetMesh, {
                position: new Vector3(0, 0, 0),
                normal: new Vector3(0, 0, 1),
                size: new Vector3(0.5, 0.5, 0.5),
                angle: 0,
                cullBackFaces: true // Включаем culling для одной стороны
              });
              
              decal.material = decalMaterial;
              decal.visibility = 1.0; // Принудительно делаем видимой
            }
            
            // Создаем родительский объект для автоматического вращения
            const cameraParent = new TransformNode('cameraParent', scene);
            cameraParent.position = Vector3.Zero();
            
            // Прикрепляем камеру к родителю
            camera.parent = cameraParent;
            
            // Автоматическое вращение родительского объекта
            const rotationSpeed = 0.000; // Медленное вращение
            let rotationAngle = 0;
            
            const animateParentRotation = () => {
              rotationAngle += rotationSpeed;
              cameraParent.rotation.y = rotationAngle;
              requestAnimationFrame(animateParentRotation);
            };
            
            // Запускаем анимацию вращения родителя
            animateParentRotation();
          }

          // Анимация приближения и вращения камеры
          const startRadius = 5; // Начинаем издалека (как в конструкторе)
          const endRadius = 0.8; // Очень близко к модели
          const startAlpha = camera.alpha;
          const endAlpha = startAlpha - Math.PI / 2; // Поворот на -90° в другую сторону
          const animationDuration = 1500; // 1.5 секунды для более плавной анимации
          const startTime = Date.now();

          const animateCamera = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            
            // Более плавная кривая: медленное начало, плавное ускорение, плавное замедление
            const easeProgress = progress < 0.5 
              ? 2 * progress * progress 
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            // Приближение камеры
            const currentRadius = startRadius + (endRadius - startRadius) * easeProgress;
            camera.radius = currentRadius;
            
            // Плавное вращение камеры
            const currentAlpha = startAlpha + (endAlpha - startAlpha) * easeProgress;
            camera.alpha = currentAlpha;
            
            // Анимация расширения видимости
            camera.minZ = 0.01 + (0.1 - 0.01) * (1 - easeProgress);
            camera.maxZ = 10 + (2 - 10) * (1 - easeProgress);
            
            if (progress < 1) {
              requestAnimationFrame(animateCamera);
            } else {
              // Анимация завершена, скрываем кружочек загрузки
              setIsLoading(false);
            }
          };

          // Запускаем анимацию камеры сразу
          animateCamera();
        }
        
        if (onLoadRef.current) {
          onLoadRef.current();
        }
      },
      undefined, // Прогресс загрузки не нужен
      (error) => {
        // Ошибка загрузки
        console.error('❌ RewardViewer: Ошибка загрузки модели', {
          error: error.toString(),
          rewardId,
          rootUrl,
          fileName
        });
        
        setIsLoading(false);
        setLoadingError(`Ошибка загрузки модели: ${error.toString()}`);
        
        if (onErrorRef.current) {
          onErrorRef.current(`Ошибка загрузки модели: ${error.toString()}`);
        }
      }
    );

    // Запускаем рендер
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Обработка изменения размера окна
    const handleResize = () => {
      
      if (isModal) {
        // В модальном режиме делаем canvas квадратным на основе viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Уменьшаем размер canvas, чтобы оставить место для описания (120px + отступы)
        const reservedSpace = 180; // Место для описания и отступов
        const availableHeight = viewportHeight - reservedSpace;
        const availableSize = Math.min(viewportWidth, availableHeight);
        
        // Canvas занимает 70% от доступного размера, но не меньше 250px и не больше 500px
        const canvasSize = Math.max(250, Math.min(500, Math.floor(availableSize * 0.7)));
        
        // Увеличиваем разрешение canvas для четкости на высоких DPI экранах
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = canvasSize * pixelRatio;
        canvas.height = canvasSize * pixelRatio;
        canvas.style.width = canvasSize + 'px';
        canvas.style.height = canvasSize + 'px';
      } else {
        // В обычном режиме используем размер контейнера, но делаем квадратным
        const container = canvas.parentElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          const containerSize = Math.min(rect.width, rect.height);
          
          // Увеличиваем разрешение canvas для четкости на высоких DPI экранах
          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = containerSize * pixelRatio;
          canvas.height = containerSize * pixelRatio;
          canvas.style.width = containerSize + 'px';
          canvas.style.height = containerSize + 'px';
        }
      }
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      // Очистка при размонтировании
      window.removeEventListener('resize', handleResize);
      
      // Останавливаем анимацию инерции
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      
      // Удаляем кастомные обработчики событий
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', (e) => e.preventDefault());
      canvas.removeEventListener('touchstart', (e) => {
        if (e.touches.length > 1) e.preventDefault();
      });
      canvas.removeEventListener('touchmove', (e) => {
        if (e.touches.length > 1) e.preventDefault();
      });
      
      if (engineRef.current) {
        engineRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.dispose();
      }
    };
  }, [rewardId, size, autoRotate]);

  // Если это модальное окно, рендерим с модальной оберткой
  if (isModal) {
    
    return (
      <div className="modal-overlay" onClick={handleBackdropClick}>
        <div className="modal-container">
          <canvas 
            ref={canvasRef} 
            className="modal-canvas" 
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Кружочек загрузки */}
          {isLoading && (
            <div className="loading-spinner" onClick={(e) => e.stopPropagation()}>
              <div className="spinner"></div>
            </div>
          )}
          
          {/* Сообщение об ошибке */}
          {loadingError && (
            <div className="loading-error" onClick={(e) => e.stopPropagation()}>
              <div className="error-icon">⚠️</div>
              <div className="error-text">{loadingError}</div>
            </div>
          )}
          
          {/* Информация о награде поверх canvas */}
          <div className="modal-reward-info" onClick={(e) => e.stopPropagation()}>
            <div className="modal-reward-title">
              {rewardName || rewardId}
            </div>
            <div className="modal-reward-description">
              {rewardPrice && (
                <div className="modal-reward-price">
                  {rewardPrice} Глюкоинов
                </div>
              )}
              {rewardDescription && (
                <div className="modal-reward-description-text">
                  {rewardDescription}
                </div>
              )}
            </div>
            
            {/* Уведомление о копировании */}
            {showNotification && (
              <div className="copy-notification" onClick={(e) => e.stopPropagation()}>
                Ссылка скопирована, поделись ею с другом!
              </div>
            )}
            
            {/* Кнопка поделиться/получить под описанием */}
            <div className="modal-share-button" onClick={(e) => e.stopPropagation()}>
              {isUserLoggedIn ? (
                <button 
                  className="share-button"
                  onClick={onShareClick}
                  title="Поделиться наградой"
                >
                  <img src="/images/share.svg" alt="Поделиться" width="16" height="16" style={{ marginRight: '6px' }} />
                  Поделиться
                </button>
              ) : (
                <button 
                  className="get-reward-button"
                  onClick={() => {
                    onGetRewardClick?.();
                  }}
                  title="Получить такую же награду"
                >
                  Получить такую же!
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Обычный рендер без модального окна
  return (
    <div data-size={size} style={{ position: 'relative' }}>
      <canvas ref={canvasRef} />
      
      {/* Кружочек загрузки */}
      {isLoading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      )}
      
      {/* Сообщение об ошибке */}
      {loadingError && (
        <div className="loading-error">
          <div className="error-icon">⚠️</div>
          <div className="error-text">{loadingError}</div>
        </div>
      )}
    </div>
  );
};

export default RewardViewerComponent;
