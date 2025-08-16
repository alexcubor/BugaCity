import { Reward } from './Reward';

export interface User {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  glukocoins: number;
  rewards: Reward[];
}
