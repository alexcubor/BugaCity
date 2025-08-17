import React from 'react';
import RewardViewerComponent from './RewardViewer';
import { RewardViewerProps } from './types';

const RewardViewer: React.FC<RewardViewerProps> = ({
  rewardId,
  size = 'medium',
  autoRotate = true,
  showControls = false,
  onLoad,
  onError
}) => {
  return (
    <RewardViewerComponent
      rewardId={rewardId}
      size={size}
      autoRotate={autoRotate}
      showControls={showControls}
      onLoad={onLoad}
      onError={onError}
    />
  );
};

export default RewardViewer;
