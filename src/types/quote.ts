export type ShootingType = 'photo' | 'video' | 'photo+video';
export type ShootingHours = '4h' | '8h';
export type TravelLocation = 'seoul' | 'chungcheong' | 'jeonla' | 'jeju' | 'overseas';
export type IntroOutroType = 'none' | 'free' | 'premium';

export interface ClientInfo {
  name: string;
  position: string;
  department: string;
  contact: string;
  company: string;
  projectName: string;
  projectDate: string;
  projectLocation: string;
  requirements: string;
  quoteDate: string;
  refs: string[];
}

export interface QuoteInput {
  shootingType: ShootingType;
  shootingHours: ShootingHours;
  aerial: boolean;
  shootingCount: number;
  compositionMinutes: number;
  travelLocation: TravelLocation;
  editMinutes: number;
  entertainmentEffect: boolean;
  shortsMinutes: number;
  shortsEntertainmentEffect: boolean;
  introOutro: IntroOutroType;
  aiVideoMinutes: number;
  episodeCount: number;
  additionalWork: boolean;
}

export interface QuoteResult {
  shootingFee: number;
  compositionFee: number;
  travelFee: number;
  editingFee: number;
  shortsEditingFee: number;
  introOutroFee: number;
  aiVideoFee: number;
  subtotalPerEpisode: number;
  subtotal: number;
  discount: number;
  total: number;
  isTravelNegotiable: boolean;
}
