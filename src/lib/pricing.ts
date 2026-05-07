import { QuoteInput, QuoteResult, ShootingType, ShootingHours, TravelLocation, IntroOutroType } from '@/types/quote';

export const COMPANY = {
  name: '종합선전',
  bizNo: '102-88-03086',
  email: 'cky4120@cpropa.com',
} as const;

const SHOOTING_BASE: Record<ShootingType, Record<ShootingHours, number>> = {
  photo:         { '4h': 300000, '8h': 500000 },
  video:         { '4h': 300000, '8h': 500000 },
  'photo+video': { '4h': 400000, '8h': 700000 },
};

const TRAVEL: Record<TravelLocation, number | null> = {
  seoul:       0,
  incheon:     0,
  gyeonggi:    0,
  chungcheong: 50000,
  gangwon:     50000,
  jeonla:      100000,
  gyeongsang:  100000,
  jeju:        200000,
  overseas:    null,
};

const EDITING    = { normal: 100000, entertainment: 120000 } as const;
const SHORTS     = { normal:  50000, entertainment:  60000 } as const;
const INTRO_OUTRO = { basic: 0, premium: 100000 } as const;

export const PRICES = {
  shooting:           SHOOTING_BASE,
  aerialRatio:        1.2,
  travel:             TRAVEL,
  editing:            EDITING,
  shorts:             SHORTS,
  introOutro:         INTRO_OUTRO,
  compositionPerMin:  100000,
  aiVideoPerMin:      100000,
  additionalDiscount: 0.05,
} as const;

export const SHOOTING_LABELS: Record<ShootingType, string> = {
  photo:         '사진',
  video:         '비디오',
  'photo+video': '사진+비디오',
};

export const TRAVEL_LABELS: Record<TravelLocation, string> = {
  seoul:       '서울',
  incheon:     '인천',
  gyeonggi:    '경기',
  chungcheong: '충청',
  gangwon:     '강원',
  jeonla:      '전라',
  gyeongsang:  '경상',
  jeju:        '제주',
  overseas:    '해외',
};

export const INTRO_OUTRO_LABELS: Record<IntroOutroType, string> = {
  basic:   '기본효과 인트로/아웃트로',
  premium: '고급 인트로/아웃트로',
};

export function calculateQuote(input: QuoteInput): QuoteResult {
  const baseUnit = SHOOTING_BASE[input.shootingType][input.shootingHours];
  const shootingUnit = input.aerial ? Math.round(baseUnit * PRICES.aerialRatio) : baseUnit;
  const shootingFee = shootingUnit * input.shootingCount;

  const compositionFee = input.compositionMinutes * PRICES.compositionPerMin;

  const travelBase = TRAVEL[input.travelLocation];
  const isTravelNegotiable = travelBase === null;
  const travelFee = travelBase ?? 0;

  const editingFee = input.editMinutes *
    (input.entertainmentEffect ? EDITING.entertainment : EDITING.normal);

  const shortsEditingFee = input.shortsEpisodes *
    (input.shortsEntertainmentEffect ? SHORTS.entertainment : SHORTS.normal);

  const introOutroFee = INTRO_OUTRO[input.introOutro];

  const aiVideoFee = input.aiVideoMinutes * PRICES.aiVideoPerMin;

  const subtotalPerEpisode = shootingFee + compositionFee + travelFee +
    editingFee + shortsEditingFee + introOutroFee + aiVideoFee;

  const subtotal = subtotalPerEpisode * input.episodeCount;
  const discount = input.additionalWork ? Math.round(subtotal * PRICES.additionalDiscount) : 0;
  const total = subtotal - discount;

  return {
    shootingFee, compositionFee, travelFee,
    editingFee, shortsEditingFee, introOutroFee, aiVideoFee,
    subtotalPerEpisode, subtotal, discount, total,
    isTravelNegotiable,
  };
}
