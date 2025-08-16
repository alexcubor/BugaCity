export interface Reward {
  id: string;
  name: string;           // Имя папки награды
  label: string;          // Локализованное название
  description: string;    // Локализованное описание
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  glukocoinsValue: number;
  createdAt?: Date;
  earnedAt?: Date;
}

export type RewardRarity = 'common' | 'rare' | 'epic' | 'legendary';
