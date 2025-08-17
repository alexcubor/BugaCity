import React from 'react';
import RewardViewerComponent from './RewardViewer';
import { RewardViewerComponentProps } from './types';

const RewardViewer: React.FC<RewardViewerComponentProps> = (props) => {
  return <RewardViewerComponent {...props} />;
};

export default RewardViewer;
