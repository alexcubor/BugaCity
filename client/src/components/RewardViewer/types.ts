export interface RewardViewerComponentProps {
  rewardId: string;
  size?: RewardSize;
  autoRotate?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  // Пропсы для модального окна
  isModal?: boolean;
  onClose?: () => void;
  modalTitle?: string;
  userName: string;
  // Информация о награде
  rewardName?: string;
  rewardPrice?: number;
  rewardDescription?: string;
  // Пропсы для кнопки поделиться
  isUserLoggedIn?: boolean;
  onShareClick?: () => void;
  onGetRewardClick?: () => void;
  // Пропс для уведомления
  showNotification?: boolean;
}

export type RewardSize = 'small' | 'medium' | 'large';
