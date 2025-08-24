import React, { useEffect, useRef, useState } from 'react';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  HDRCubeTexture,
  Vector3,
  Mesh,
  SceneLoader,
  Color4,
  MeshBuilder,
  BackgroundMaterial,
  Texture
} from '@babylonjs/core';
import '@babylonjs/loaders';

interface LightingConfig {
  environmentIntensity: number;
  exposure: number;
  contrast: number;
  toneMappingEnabled: boolean;
  toneMappingType: number;
  showHDRIAsBackground: boolean;
}

const defaultConfig: LightingConfig = {
  environmentIntensity: 1.0,
  exposure: 1.0,
  contrast: 1.0,
  toneMappingEnabled: true,
  toneMappingType: 0,
  showHDRIAsBackground: false
};

const SceneEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Загружаем сохраненные настройки из localStorage
  const loadSavedConfig = (): LightingConfig => {
    try {
      const saved = localStorage.getItem('sceneEditorConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultConfig, ...parsed };
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек из localStorage:', error);
    }
    return defaultConfig;
  };

  const [config, setConfig] = useState<LightingConfig>(loadSavedConfig);
  const [scene, setScene] = useState<Scene | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const [availableHDRIs, setAvailableHDRIs] = useState<string[]>([]);
  
  // Загружаем сохраненную HDRI карту
  const loadSavedHDRI = (): string => {
    try {
      const saved = localStorage.getItem('sceneEditorCurrentHDRI');
      return saved || 'studio.hdr';
    } catch (error) {
      console.error('Ошибка загрузки HDRI из localStorage:', error);
      return 'studio.hdr';
    }
  };
  
  const [currentHDRI, setCurrentHDRI] = useState(loadSavedHDRI);
  const [isHDRIListLoaded, setIsHDRIListLoaded] = useState(false);
  const hdrTextureRef = useRef<HDRCubeTexture | null>(null);
  const skydomeRef = useRef<Mesh | null>(null);

  // Инициализируем сцену
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    
    // Устанавливаем черный фон
    scene.clearColor = new Color4(0, 0, 0, 1);

    // Камера
    const camera = new ArcRotateCamera('camera', Math.PI, Math.PI / 3, 3, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 0.3;
    camera.upperRadiusLimit = 50;
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    camera.wheelPrecision = 50;
    camera.pinchPrecision = 50;
    
    camera.onViewMatrixChangedObservable.add(() => {
      // Предотвращаем скролл страницы
    });

    // HDRI освещение
    const verifiedHDRI = isHDRIListLoaded ? findAvailableHDRI(currentHDRI) : 'studio.hdr';
    const hdrTexture = new HDRCubeTexture(`/textures/environment/${verifiedHDRI}`, scene, 512);
    hdrTexture.onLoadObservable.add(() => {
      console.log('HDRI текстура загружена:', hdrTexture);
      hdrTextureRef.current = hdrTexture;
      scene.environmentTexture = hdrTexture;
      scene.environmentIntensity = config.environmentIntensity;
      
      // Создаем skydome для background
      const skydome = MeshBuilder.CreateSphere("sky", { diameter: 2000, sideOrientation: Mesh.BACKSIDE }, scene);
      skydome.isPickable = false;
      skydome.receiveShadows = true;
      
      const sky = new BackgroundMaterial("skyMaterial", scene);
      sky.reflectionTexture = hdrTexture.clone();
      sky.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
      sky.enableGroundProjection = false;
      skydome.material = sky;
      
      skydomeRef.current = skydome;
      skydome.visibility = 0;
    });

    // Дополнительное освещение
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    light.intensity = 0.3;

    // Загружаем модель
    SceneLoader.ImportMesh('', '/models/rewards/pioneer/', 'pioneer.gltf', scene, (meshes) => {
      if (meshes.length > 0) {
        const rootMesh = meshes[0];
        if (rootMesh instanceof Mesh) {
          rootMesh.scaling = new Vector3(-1, 1, 1);
          setIsModelLoaded(true);
        }
      }
    });

    setScene(scene);

    engine.runRenderLoop(() => {
      scene.render();
    });

    window.addEventListener('resize', () => {
      engine.resize();
    });

    // Предотвращаем скролл страницы при взаимодействии с canvas
    const preventScroll = (e: WheelEvent) => {
      e.preventDefault();
    };
    
    canvas.addEventListener('wheel', preventScroll, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', preventScroll);
      engine.dispose();
    };
  }, []);

  // Загружаем список доступных HDRI карт при монтировании компонента
  useEffect(() => {
    loadAvailableHDRIs();
  }, []);

  // Обновляем HDRI текстуру после загрузки списка файлов
  useEffect(() => {
    if (!scene || !isHDRIListLoaded) return;
    
    // Проверяем, нужно ли обновить HDRI текстуру
    const verifiedHDRI = findAvailableHDRI(currentHDRI);
    if (verifiedHDRI !== currentHDRI) {
      console.log('Обновляем HDRI текстуру на:', verifiedHDRI);
      setCurrentHDRI(verifiedHDRI);
      try {
        localStorage.setItem('sceneEditorCurrentHDRI', verifiedHDRI);
      } catch (error) {
        console.error('Ошибка сохранения HDRI в localStorage:', error);
      }
      
      // Переключаем на правильную HDRI карту
      switchHDRI(verifiedHDRI);
    }
  }, [isHDRIListLoaded, scene]);

  // Применяем настройки освещения
  useEffect(() => {
    if (!scene) return;

    scene.environmentIntensity = config.environmentIntensity;
    scene.imageProcessingConfiguration!.exposure = config.exposure;
    scene.imageProcessingConfiguration!.contrast = config.contrast;
    scene.imageProcessingConfiguration!.toneMappingEnabled = config.toneMappingEnabled;
    scene.imageProcessingConfiguration!.toneMappingType = config.toneMappingType;
    
    // Показываем/скрываем HDRI как background
    if (config.showHDRIAsBackground) {
      scene.clearColor = new Color4(0, 0, 0, 0); // Прозрачный фон
      scene.autoClear = false; // Не очищаем фон автоматически
      // Показываем skydome
      if (skydomeRef.current) {
        skydomeRef.current.visibility = 1;
      }
    } else {
      scene.clearColor = new Color4(0, 0, 0, 1); // Черный фон
      scene.autoClear = true; // Очищаем фон автоматически
      // Скрываем skydome
      if (skydomeRef.current) {
        skydomeRef.current.visibility = 0;
      }
    }
  }, [config, scene]);

  // Применяем сохраненную HDRI карту при загрузке
  useEffect(() => {
    if (!scene || !hdrTextureRef.current) return;
    
    // Проверяем, доступен ли сохраненный файл
    const availableHDRI = findAvailableHDRI(currentHDRI);
    if (availableHDRI !== currentHDRI) {
      console.log('Сохраненный файл недоступен, переключаемся на:', availableHDRI);
      setCurrentHDRI(availableHDRI);
      try {
        localStorage.setItem('sceneEditorCurrentHDRI', availableHDRI);
      } catch (error) {
        console.error('Ошибка сохранения fallback HDRI в localStorage:', error);
      }
    }
    
    // Если текущая HDRI отличается от загруженной, переключаем
    const currentTexturePath = hdrTextureRef.current.name;
    const expectedPath = `/textures/environment/${availableHDRI}`;
    
    if (currentTexturePath !== expectedPath) {
      console.log('Применяем HDRI карту:', availableHDRI);
      switchHDRI(availableHDRI);
    }
  }, [scene, currentHDRI, availableHDRIs]);

  const handleConfigChange = (key: keyof LightingConfig, value: number | boolean) => {
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      // Автоматически сохраняем в localStorage
      try {
        localStorage.setItem('sceneEditorConfig', JSON.stringify(newConfig));
      } catch (error) {
        console.error('Ошибка сохранения настроек в localStorage:', error);
      }
      return newConfig;
    });
  };

  // Функция для поиска доступного HDRI файла
  const findAvailableHDRI = (requestedHDRI: string): string => {
    // Сначала проверяем, есть ли запрошенный файл в списке доступных
    if (availableHDRIs.includes(requestedHDRI)) {
      return requestedHDRI;
    }
    
    // Если нет, возвращаем первый доступный файл
    if (availableHDRIs.length > 0) {
      return availableHDRIs[0];
    }
    
    // Если список пуст, возвращаем studio.hdr как fallback
    return 'studio.hdr';
  };

  // Функция для загрузки списка доступных HDRI карт
  const loadAvailableHDRIs = async () => {
    const fallbackList = [
      'studio.hdr',
      'reflect.hdr',
      'Verticle_symetric_thin_rimlight_a.hdr',
      'top_rim_high_a.hdr',
      'top_front_light_a.hdr',
      'three_stripes_a.hdr',
      'simple_lighting_g.hdr',
      'simple_lighting_d.hdr',
      'simple_lighting_c.hdr',
      'simple_3point_a.hdr',
      'simple_3_stripes_limitededition.hdr'
    ];

    try {
      const response = await fetch('/api/hdri-files');
      if (response.ok) {
        const hdriList = await response.json();
        setAvailableHDRIs(hdriList);
        console.log('Загружены HDRI файлы:', hdriList);
      } else {
        console.error('Ошибка загрузки списка HDRI файлов');
        setAvailableHDRIs(fallbackList);
      }
    } catch (error) {
      console.error('Ошибка загрузки списка HDRI:', error);
      setAvailableHDRIs(fallbackList);
    } finally {
      setIsHDRIListLoaded(true);
    }
  };

  // Функция для переключения HDRI карты
  const switchHDRI = (hdriName: string) => {
    if (!scene) return;
    
    console.log('Переключаем HDRI на:', hdriName);
    setCurrentHDRI(hdriName);
    
    // Сохраняем выбранную HDRI карту в localStorage
    try {
      localStorage.setItem('sceneEditorCurrentHDRI', hdriName);
    } catch (error) {
      console.error('Ошибка сохранения HDRI в localStorage:', error);
    }
    
    const newHDRTexture = new HDRCubeTexture(`/textures/environment/${hdriName}`, scene, 512);
    console.log('Создаем HDR текстуру:', hdriName);
    
    newHDRTexture.onLoadObservable.add(() => {
      console.log('HDRI текстура загружена:', hdriName);
      scene.environmentTexture = newHDRTexture;
      
      if (skydomeRef.current && config.showHDRIAsBackground) {
        const sky = skydomeRef.current.material as BackgroundMaterial;
        if (sky) {
          sky.reflectionTexture = newHDRTexture.clone();
        }
      }
      
      hdrTextureRef.current = newHDRTexture;
    });
    
    // Проверяем существование файла
    fetch(`/textures/environment/${hdriName}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Файл ${hdriName} не найден`);
        }
      })
      .catch(error => {
        console.error('Ошибка загрузки HDRI файла:', hdriName, error);
        
        const fallbackHDRI = findAvailableHDRI(hdriName);
        if (fallbackHDRI !== hdriName) {
          console.log('Переключаемся на доступный файл:', fallbackHDRI);
          setCurrentHDRI(fallbackHDRI);
          try {
            localStorage.setItem('sceneEditorCurrentHDRI', fallbackHDRI);
          } catch (error) {
            console.error('Ошибка сохранения fallback HDRI в localStorage:', error);
          }
          
          const fallbackTexture = new HDRCubeTexture(`/textures/environment/${fallbackHDRI}`, scene, 512);
          fallbackTexture.onLoadObservable.add(() => {
            console.log('Fallback HDRI текстура загружена:', fallbackHDRI);
            scene.environmentTexture = fallbackTexture;
            
            if (skydomeRef.current && config.showHDRIAsBackground) {
              const sky = skydomeRef.current.material as BackgroundMaterial;
              if (sky) {
                sky.reflectionTexture = fallbackTexture.clone();
              }
            }
            
            hdrTextureRef.current = fallbackTexture;
          });
        }
      });
    
    hdrTextureRef.current = newHDRTexture;
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 3D сцена */}
      <div style={{ flex: 1, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            outline: 'none'
          }}
        />
        {!isModelLoaded && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '18px'
          }}>
            Загрузка модели...
          </div>
        )}
      </div>

      {/* Панель настроек */}
      <div style={{
        width: '350px',
        backgroundColor: '#2a2a2a',
        color: 'white',
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
          3D Scene Editor
        </h2>

        {/* HDRI параметры */}
        <div style={{ marginBottom: '20px' }}>
          <h3>HDRI карта</h3>
          
          {/* Селектор HDRI карт */}
          <div style={{ marginBottom: '15px' }}>
            <label>Выберите HDRI карту:</label>
            <select
              value={currentHDRI}
              onChange={(e) => switchHDRI(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
                backgroundColor: '#1a1a1a',
                color: 'white',
                border: '1px solid #333',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {availableHDRIs.map((hdri) => (
                <option key={hdri} value={hdri}>
                  {hdri.replace('.hdr', '')}
                </option>
              ))}
            </select>
            <div style={{ 
              marginTop: '5px', 
              fontSize: '12px', 
              color: '#888' 
            }}>
              Текущая: {currentHDRI}
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Интенсивность окружения:</label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={config.environmentIntensity}
              onChange={(e) => handleConfigChange('environmentIntensity', parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: '5px' }}
            />
            <span>{config.environmentIntensity.toFixed(1)}</span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <input
                type="checkbox"
                checked={config.showHDRIAsBackground}
                onChange={(e) => handleConfigChange('showHDRIAsBackground', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Показать HDRI как background
            </label>
          </div>
        </div>

        {/* Image Processing */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Обработка изображения</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label>Экспозиция:</label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={config.exposure}
              onChange={(e) => handleConfigChange('exposure', parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: '5px' }}
            />
            <span>{config.exposure.toFixed(1)}</span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Контрастность:</label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={config.contrast}
              onChange={(e) => handleConfigChange('contrast', parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: '5px' }}
            />
            <span>{config.contrast.toFixed(1)}</span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <input
                type="checkbox"
                checked={config.toneMappingEnabled}
                onChange={(e) => handleConfigChange('toneMappingEnabled', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Tone Mapping
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneEditor;
