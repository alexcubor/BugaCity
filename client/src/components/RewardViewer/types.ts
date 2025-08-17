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
}

export type RewardSize = 'small' | 'medium' | 'large';
