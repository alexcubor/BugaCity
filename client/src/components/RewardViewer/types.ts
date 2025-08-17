export interface RewardViewerProps {
  rewardId: string;           // ID награды (например, "pioneer")
  size?: 'small' | 'medium' | 'large';  // Размер 3D модели
  autoRotate?: boolean;       // Автоматическое вращение
  showControls?: boolean;     // Показывать ли контролы
  onLoad?: () => void;        // Callback при загрузке
  onError?: (error: string) => void;  // Callback при ошибке
}

export interface RewardViewerComponentProps extends RewardViewerProps {
  // Дополнительные пропсы для внутреннего компонента
}

export type RewardSize = 'small' | 'medium' | 'large';
