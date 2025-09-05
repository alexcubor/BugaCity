import React, { useEffect, useRef, useState, useCallback } from 'react';
import './ParallaxImage.css';

interface ParallaxImageProps {
  mainImage: string;
  depthMap: string;
  foregroundImage?: string;
  foregroundDepthMap?: string;
  intensity?: number;
  minOffset?: number;
  maxOffset?: number;
  sensitivity?: number;
  className?: string;
  children?: React.ReactNode;
}

const ParallaxImage: React.FC<ParallaxImageProps> = ({
  mainImage,
  depthMap,
  foregroundImage,
  foregroundDepthMap,
  intensity = 0.5,
  minOffset = 0,
  maxOffset = 20,
  sensitivity = 2.0,
  className = '',
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainImageRef = useRef<HTMLImageElement>(null);
  const depthImageRef = useRef<HTMLImageElement>(null);
  const foregroundImageRef = useRef<HTMLImageElement>(null);
  const foregroundDepthRef = useRef<HTMLImageElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [targetMousePosition, setTargetMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const animationFrameRef = useRef<number>();
  
  // Кэш для текстур и uniform locations
  const textureCacheRef = useRef<{
    mainTexture?: WebGLTexture;
    depthTexture?: WebGLTexture;
    fgTexture?: WebGLTexture;
    fgDepthTexture?: WebGLTexture;
  }>({});
  
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const lastUpdateTime = useRef<number>(0);

  // Создание текстуры из изображения
  const createTexture = useCallback((gl: WebGLRenderingContext, image: HTMLImageElement) => {
    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
  }, []);

  // Функция для обновления размера canvas
  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCanvasSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height)
      });
    }
  }, []);

  // WebGL шейдеры
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    
    uniform sampler2D u_mainTexture;
    uniform sampler2D u_depthTexture;
    uniform sampler2D u_foregroundTexture;
    uniform sampler2D u_foregroundDepthTexture;
    uniform vec2 u_mousePosition;
    uniform float u_intensity;
    uniform float u_minOffset;
    uniform float u_maxOffset;
    uniform vec2 u_resolution;
    uniform vec2 u_imageResolution;
    uniform bool u_hasForeground;
    
    varying vec2 v_texCoord;
    
    void main() {
      // Calculate aspect ratios
      float imageAspect = u_imageResolution.x / u_imageResolution.y;
      float screenAspect = u_resolution.x / u_resolution.y;
      
      // ВСЕГДА масштабируем по ширине (заполняем всю ширину экрана)
      // Вычисляем масштаб так, чтобы изображение заполнило всю ширину
      float scale = screenAspect / imageAspect;
      
      // Выравниваем по верхнему краю - начинаем с самого верха
      vec2 alignedCoord = vec2(v_texCoord.x, v_texCoord.y * scale);
      
      // Check if the coordinate is within bounds
      if (alignedCoord.x >= 0.0 && alignedCoord.x <= 1.0 &&
          alignedCoord.y >= 0.0 && alignedCoord.y <= 1.0) {
        
        // Получаем глубину из карты глубины
        vec4 depthColor = texture2D(u_depthTexture, alignedCoord);
        
        // Используем красный канал (все каналы одинаковые в черно-белом изображении)
        float depth = depthColor.r;
        
        // НЕ инвертируем - белые области = ближние объекты (максимальная глубина)
        // depth = 1.0 - depth; // Закомментировано
        
        
        // Вычисляем смещение для фона
        vec2 bgParallaxOffset = u_mousePosition * u_intensity * depth;
        bgParallaxOffset.x = clamp(bgParallaxOffset.x, u_minOffset, u_maxOffset);
        bgParallaxOffset.y = clamp(bgParallaxOffset.y, u_minOffset, u_maxOffset);
        
        // Применяем смещение к координатам текстуры фона
        vec2 bgTexCoord = alignedCoord - bgParallaxOffset * 0.01;
        
        // Получаем цвет фона
        vec4 bgColor = texture2D(u_mainTexture, bgTexCoord);
        
        // Если есть передний план
        if (u_hasForeground) {
          // Получаем глубину переднего плана
          vec4 fgDepthColor = texture2D(u_foregroundDepthTexture, alignedCoord);
          float fgDepth = fgDepthColor.r;
          
          // Вычисляем смещение для переднего плана (больше чем для фона)
          vec2 fgParallaxOffset = u_mousePosition * u_intensity * fgDepth * 1.5;
          fgParallaxOffset.x = clamp(fgParallaxOffset.x, u_minOffset, u_maxOffset);
          fgParallaxOffset.y = clamp(fgParallaxOffset.y, u_minOffset, u_maxOffset);
          
          // Применяем смещение к координатам текстуры переднего плана
          vec2 fgTexCoord = alignedCoord - fgParallaxOffset * 0.01;
          
          // Получаем цвет переднего плана
          vec4 fgColor = texture2D(u_foregroundTexture, fgTexCoord);
          
          // Смешиваем фон и передний план
          gl_FragColor = mix(bgColor, fgColor, fgColor.a);
        } else {
          // Только фон
          gl_FragColor = bgColor;
        }
      } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black bars
      }
    }
  `;

  // Инициализация кэша текстур
  const initializeCache = useCallback((gl: WebGLRenderingContext) => {
    const mainImg = mainImageRef.current;
    const depthImg = depthImageRef.current;
    const fgImg = foregroundImageRef.current;
    const fgDepthImg = foregroundDepthRef.current;
    
    if (!mainImg || !depthImg) return false;
    
    // Создаем текстуры только один раз
    if (!textureCacheRef.current.mainTexture) {
      const mainTex = createTexture(gl, mainImg);
      const depthTex = createTexture(gl, depthImg);
      if (mainTex) textureCacheRef.current.mainTexture = mainTex;
      if (depthTex) textureCacheRef.current.depthTexture = depthTex;
    }
    
    const hasForeground = foregroundImage && foregroundDepthMap && fgImg && fgDepthImg;
    if (hasForeground && !textureCacheRef.current.fgTexture) {
      const fgTex = createTexture(gl, fgImg);
      const fgDepthTex = createTexture(gl, fgDepthImg);
      if (fgTex) textureCacheRef.current.fgTexture = fgTex;
      if (fgDepthTex) textureCacheRef.current.fgDepthTexture = fgDepthTex;
    }
    
    return true;
  }, [createTexture, foregroundImage, foregroundDepthMap]);


  // Создание шейдера
  const createShader = useCallback((gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }, []);

  // Создание программы
  const createProgram = useCallback((gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }, []);

  // Инициализация WebGL
  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    if (!gl) {
      console.error('WebGL not supported');
      return false;
    }

    glRef.current = gl;

    // Создаем шейдеры
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return false;

    // Создаем программу
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return false;

    programRef.current = program;
    gl.useProgram(program);

    // Создаем буфер для полноэкранного квада
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    const positions = [
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    
    const texCoords = [
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

    // Настраиваем атрибуты
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    return true;
  }, [createShader, createProgram]);


  // WebGL рендеринг (оптимизированный)
  const drawParallax = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const mainImg = mainImageRef.current;
    const fgImg = foregroundImageRef.current;
    const fgDepthImg = foregroundDepthRef.current;
    
    if (!gl || !program || !mainImg || !isLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Инициализируем кэш если нужно
    if (!initializeCache(gl)) return;

    // Устанавливаем размер viewport
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Получаем uniform locations каждый раз (для текущей программы)
    const mouseLocation = gl.getUniformLocation(program, 'u_mousePosition');
    const intensityLocation = gl.getUniformLocation(program, 'u_intensity');
    const minOffsetLocation = gl.getUniformLocation(program, 'u_minOffset');
    const maxOffsetLocation = gl.getUniformLocation(program, 'u_maxOffset');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const imageResolutionLocation = gl.getUniformLocation(program, 'u_imageResolution');
    const hasForegroundLocation = gl.getUniformLocation(program, 'u_hasForeground');
    const mainTextureLocation = gl.getUniformLocation(program, 'u_mainTexture');
    const depthTextureLocation = gl.getUniformLocation(program, 'u_depthTexture');
    const fgTextureLocation = gl.getUniformLocation(program, 'u_foregroundTexture');
    const fgDepthTextureLocation = gl.getUniformLocation(program, 'u_foregroundDepthTexture');

    // Привязываем кэшированные текстуры
    const cache = textureCacheRef.current;
    
    if (cache.mainTexture && cache.depthTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, cache.mainTexture);
      gl.uniform1i(mainTextureLocation!, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, cache.depthTexture);
      gl.uniform1i(depthTextureLocation!, 1);
    }

    // Если есть передний план
    const hasForeground = foregroundImage && foregroundDepthMap && fgImg && fgDepthImg;
    if (hasForeground && cache.fgTexture && cache.fgDepthTexture) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, cache.fgTexture);
      gl.uniform1i(fgTextureLocation!, 2);

      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, cache.fgDepthTexture);
      gl.uniform1i(fgDepthTextureLocation!, 3);
    }

    // Устанавливаем uniform переменные
    gl.uniform2f(mouseLocation!, mousePosition.x, mousePosition.y);
    gl.uniform1f(intensityLocation!, intensity);
    gl.uniform1f(minOffsetLocation!, minOffset);
    gl.uniform1f(maxOffsetLocation!, maxOffset);
    gl.uniform2f(resolutionLocation!, canvas.width, canvas.height);
    gl.uniform2f(imageResolutionLocation!, mainImg.naturalWidth, mainImg.naturalHeight);
    gl.uniform1i(hasForegroundLocation!, hasForeground ? 1 : 0);

    // Рисуем
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [mousePosition, intensity, minOffset, maxOffset, isLoaded, initializeCache, foregroundImage, foregroundDepthMap]);

  // Обновляем размер canvas при загрузке и изменении размера окна
  useEffect(() => {
    updateCanvasSize();
    
    const handleResize = () => {
      updateCanvasSize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  useEffect(() => {
    if (isLoaded) {
      initWebGL();
    }
  }, [isLoaded, initWebGL]);

  useEffect(() => {
    if (isLoaded && glRef.current && programRef.current) {
      drawParallax();
    }
  }, [isLoaded, drawParallax]);

  // Пересоздаем WebGL при изменении размера canvas
  useEffect(() => {
    if (isLoaded) {
      initWebGL();
    }
  }, [canvasSize, isLoaded, initWebGL]);

  // Плавная анимация позиции мыши
  useEffect(() => {
    const animate = (currentTime: number) => {
      if (currentTime - lastUpdateTime.current < 16) { // ~60fps
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastUpdateTime.current = currentTime;
      
      // Быстрая плавность без задержки
      const lerpFactor = 0.5; // Быстрая плавность (0.5 = быстро, но плавно)
      setMousePosition(prev => ({
        x: prev.x + (targetMousePosition.x - prev.x) * lerpFactor,
        y: prev.y + (targetMousePosition.y - prev.y) * lerpFactor
      }));
      
      drawParallax();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    if (isLoaded) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawParallax, isLoaded, targetMousePosition]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Увеличиваем чувствительность - используем меньший делитель
      const x = (e.clientX - centerX) / (rect.width / sensitivity);
      const y = (e.clientY - centerY) / (rect.height / sensitivity);
      
      setTargetMousePosition({ x, y });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [sensitivity]);

  // Очистка кэша при размонтировании
  useEffect(() => {
    return () => {
      const gl = glRef.current;
      if (gl) {
        const cache = textureCacheRef.current;
        if (cache.mainTexture) gl.deleteTexture(cache.mainTexture);
        if (cache.depthTexture) gl.deleteTexture(cache.depthTexture);
        if (cache.fgTexture) gl.deleteTexture(cache.fgTexture);
        if (cache.fgDepthTexture) gl.deleteTexture(cache.fgDepthTexture);
      }
    };
  }, []);

  const handleImageLoad = () => {
    const mainImg = mainImageRef.current;
    const depthImg = depthImageRef.current;
    const fgImg = foregroundImageRef.current;
    const fgDepthImg = foregroundDepthRef.current;
    
    const hasForeground = foregroundImage && foregroundDepthMap;
    
    if (mainImg && depthImg && mainImg.complete && depthImg.complete) {
      if (hasForeground && fgImg && fgDepthImg && fgImg.complete && fgDepthImg.complete) {
        setIsLoaded(true);
      } else if (!hasForeground) {
        setIsLoaded(true);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`parallax-container ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100vh'
      }}
    >
      {/* Скрытые изображения для загрузки */}
      <img
        ref={mainImageRef}
        src={mainImage}
        alt="Main Image"
        onLoad={handleImageLoad}
        style={{ display: 'none' }}
      />
      <img
        ref={depthImageRef}
        src={depthMap}
        alt="Depth Map"
        onLoad={handleImageLoad}
        style={{ display: 'none' }}
      />
      {foregroundImage && (
        <img
          ref={foregroundImageRef}
          src={foregroundImage}
          alt="Foreground Image"
          onLoad={handleImageLoad}
          style={{ display: 'none' }}
        />
      )}
      {foregroundDepthMap && (
        <img
          ref={foregroundDepthRef}
          src={foregroundDepthMap}
          alt="Foreground Depth Map"
          onLoad={handleImageLoad}
          style={{ display: 'none' }}
        />
      )}

      {/* WebGL Canvas для рендеринга параллакс эффекта */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          width: '100%',
          height: '100%',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out'
        }}
      />


      {/* Контент поверх изображения */}
      {children && (
        <div className="parallax-content">
          {children}
        </div>
      )}

      {/* Градиент для плавного перехода */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '20%',
          background: 'linear-gradient(to bottom, transparent 0%, var(--color-background) 100%)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default ParallaxImage;
