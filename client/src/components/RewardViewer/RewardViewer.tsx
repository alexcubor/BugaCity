import React, { useEffect, useRef } from 'react';
import { 
  Engine, 
  Scene, 
  Vector3, 
  HemisphericLight, 
  ArcRotateCamera,
  SceneLoader,
  AbstractMesh,
  Mesh,
  Color4,
  DynamicTexture,
  MeshUVSpaceRenderer,
  MeshBuilder,
  StandardMaterial,
  Color3
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
  userName
}) => {
  // Логика работы с URL для модального окна
  useEffect(() => {
    if (isModal && onClose) {
      const handleUrlChange = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const rewardParam = urlParams.get('reward');
        if (!rewardParam) {
          onClose();
        }
      };

      window.addEventListener('popstate', handleUrlChange);
      return () => window.removeEventListener('popstate', handleUrlChange);
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
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Создаем движок и сцену
    const canvas = canvasRef.current;
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    
    // Устанавливаем прозрачный фон
    scene.clearColor = new Color4(0, 0, 0, 0);
    
    // Принудительно устанавливаем размер canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Создаем камеру
    const camera = new ArcRotateCamera(
      'camera',
      1.5 * Math.PI, // alpha - горизонтальный угол (270°)
      Math.PI / 2,   // beta - вертикальный угол (90°)
      0.5,           // radius - расстояние от центра (близко)
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 0.5; // Разрешаем подойти очень близко
    camera.upperRadiusLimit = 20;
    camera.fov = 0.8; // Фокусное расстояние (в радианах)
    camera.minZ = 0.1; // Минимальная дистанция отсечения (ближняя плоскость)

    // Создаем освещение
    const light = new HemisphericLight(
      'light',
      new Vector3(0, 1, 0),
      scene
    );
    light.intensity = 3.2; // Увеличили яркость

    // Настраиваем автовращение
    if (autoRotate) {
      (camera as any).autoRotate = true;
      (camera as any).autoRotateSpeed = 0.5;
    }

    // Загружаем 3D модель
    const modelPath = `/models/rewards/${rewardId}/${rewardId}.gltf`;
    
    SceneLoader.ImportMesh(
      '',
      '',
      modelPath,
      scene,
      (meshes) => {
        // Центрируем модель
        if (meshes.length > 0) {
          const rootMesh = meshes[0];
          if (rootMesh instanceof Mesh) {
            // Масштабируем модель в зависимости от размера
            const scale = size === 'small' ? 0.5 : size === 'large' ? 2 : 1;
            rootMesh.scaling = new Vector3(scale, scale, scale);

            // Ищем дочерний меш для декали
            let targetMesh = rootMesh;
            for (let child of rootMesh.getChildren(undefined, false)) {
              if (child instanceof Mesh && (child.name === 'shape')) {
                targetMesh = child;
                break;
              }
            }

            // Создаем текстуру с черным текстом
            const decalTexture = new DynamicTexture('decalTexture', 512, scene);
            const textureContext = decalTexture.getContext() as CanvasRenderingContext2D;
            
            textureContext.clearRect(0, 0, 512, 512);
            textureContext.fillStyle = 'black';
            textureContext.font = 'bold 24px Arial';
            textureContext.textAlign = 'center';
            textureContext.textBaseline = 'middle';
            textureContext.fillText(userName, 256, 256);
            
            decalTexture.update();

            // Создаем decalMap и рендерим декаль
            if (targetMesh.getTotalVertices() > 0 && targetMesh.material) {
              targetMesh.decalMap = new MeshUVSpaceRenderer(targetMesh, scene, {width: 2048, height: 2048});
              
              const material = targetMesh.material as any;
              if (material.decalMap) {
                material.decalMap.smoothAlpha = true;
                material.decalMap.isEnabled = true;
              }

              // Рендерим статичную декаль
              targetMesh.decalMap.renderTexture(decalTexture, new Vector3(0, 0, 0), new Vector3(0, 0, 1), new Vector3(0.3, 0.3, 0.3));
            }
          }
        }
        
        if (onLoad) {
          onLoad();
        }
      },
      (progress) => {
        // Прогресс загрузки (можно убрать)
      },
      (error) => {
        console.error('Ошибка загрузки 3D модели:', error);
        if (onError) {
          onError(`Ошибка загрузки модели: ${error.toString()}`);
        }
      }
    );

    // Запускаем рендер
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Обработка изменения размера окна
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      // Очистка при размонтировании
      window.removeEventListener('resize', handleResize);
      if (engineRef.current) {
        engineRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.dispose();
      }
    };
  }, [rewardId, size, autoRotate, onLoad, onError]);



  // Если это модальное окно, рендерим с модальной оберткой
  if (isModal) {
    return (
      <div className="modal-overlay" onClick={handleBackdropClick}>
        <div>
          <button className="modal-close" onClick={handleClose}>
            ✕
          </button>
          <h2>{modalTitle || `Награда: ${rewardId}`}</h2>
          <div className="modal-canvas-container">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    );
  }

  // Обычный рендер без модального окна
  return (
    <div data-size={size}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default RewardViewerComponent;
