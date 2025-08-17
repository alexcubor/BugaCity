import React, { useEffect, useRef } from 'react';
import { 
  Engine, 
  Scene, 
  Vector3, 
  HemisphericLight, 
  ArcRotateCamera,
  SceneLoader,
  AbstractMesh,
  Mesh
} from '@babylonjs/core';
import { GLTFFileLoader } from '@babylonjs/loaders';
import { RewardViewerComponentProps } from './types';

// Регистрируем GLTF лоадер
SceneLoader.RegisterPlugin(new GLTFFileLoader());

const RewardViewerComponent: React.FC<RewardViewerComponentProps> = ({
  rewardId,
  size = 'medium',
  autoRotate = true,
  showControls = false,
  onLoad,
  onError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Создаем движок и сцену
    const canvas = canvasRef.current;
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    
    engineRef.current = engine;
    sceneRef.current = scene;

    // Создаем камеру
    const camera = new ArcRotateCamera(
      'camera',
      0,
      Math.PI / 3,
      10,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 20;

    // Создаем освещение
    const light = new HemisphericLight(
      'light',
      new Vector3(0, 1, 0),
      scene
    );
    light.intensity = 0.7;

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

  const getCanvasSize = () => {
    switch (size) {
      case 'small':
        return { width: 100, height: 100 };
      case 'large':
        return { width: 400, height: 400 };
      default: // medium
        return { width: 200, height: 200 };
    }
  };

  const canvasSize = getCanvasSize();

  const handleResetView = () => {
    if (sceneRef.current) {
      const camera = sceneRef.current.activeCamera as ArcRotateCamera;
      if (camera) {
        camera.alpha = 0;
        camera.beta = Math.PI / 3;
        camera.radius = 10;
      }
    }
  };

  const handleToggleRotation = () => {
    if (sceneRef.current) {
      const camera = sceneRef.current.activeCamera as ArcRotateCamera;
      if (camera) {
        (camera as any).autoRotate = !(camera as any).autoRotate;
      }
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
      />
      {showControls && (
        <div>
          <button onClick={handleResetView}>Reset View</button>
          <button onClick={handleToggleRotation}>Toggle Rotation</button>
        </div>
      )}
    </div>
  );
};

export default RewardViewerComponent;
