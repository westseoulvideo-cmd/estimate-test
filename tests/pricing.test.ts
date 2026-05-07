import { calculateQuote, PRICES } from '@/lib/pricing';
import { QuoteInput } from '@/types/quote';

const base: QuoteInput = {
  shootingType: 'video',
  shootingHours: '8h',
  aerial: false,
  shootingCount: 1,
  compositionMinutes: 0,
  travelLocation: 'seoul',
  editMinutes: 0,
  entertainmentEffect: false,
  shortsMinutes: 0,
  shortsEntertainmentEffect: false,
  introOutro: 'none',
  aiVideoMinutes: 0,
  episodeCount: 1,
  additionalWork: false,
};

describe('PRICES 상수', () => {
  test('비디오 4시간 이하 300,000원', () => {
    expect(PRICES.shooting.video['4h']).toBe(300000);
  });
  test('비디오 8시간 500,000원', () => {
    expect(PRICES.shooting.video['8h']).toBe(500000);
  });
  test('사진+비디오 4시간 이하 400,000원', () => {
    expect(PRICES.shooting['photo+video']['4h']).toBe(400000);
  });
  test('사진+비디오 8시간 700,000원', () => {
    expect(PRICES.shooting['photo+video']['8h']).toBe(700000);
  });
  test('항공 비율 1.2', () => {
    expect(PRICES.aerialRatio).toBe(1.2);
  });
  test('제주 출장비 200,000원', () => {
    expect(PRICES.travel.jeju).toBe(200000);
  });
  test('해외 출장비 null', () => {
    expect(PRICES.travel.overseas).toBeNull();
  });
  test('쇼츠 일반 분당 50,000원', () => {
    expect(PRICES.shorts.normal).toBe(50000);
  });
  test('쇼츠 예능형효과 분당 60,000원', () => {
    expect(PRICES.shorts.entertainment).toBe(60000);
  });
});

describe('calculateQuote - 촬영', () => {
  test('비디오 8시간 1회 = 500,000', () => {
    const r = calculateQuote({ ...base, shootingCount: 1 });
    expect(r.shootingFee).toBe(500000);
    expect(r.total).toBe(500000);
  });
  test('사진 4시간 이하 항공 = 360,000', () => {
    const r = calculateQuote({ ...base, shootingType: 'photo', shootingHours: '4h', aerial: true });
    expect(r.shootingFee).toBe(360000);
  });
  test('사진+비디오 8시간 항공 = 840,000', () => {
    const r = calculateQuote({ ...base, shootingType: 'photo+video', shootingHours: '8h', aerial: true });
    expect(r.shootingFee).toBe(840000);
  });
  test('촬영 3회 = 1,500,000', () => {
    const r = calculateQuote({ ...base, shootingCount: 3 });
    expect(r.shootingFee).toBe(1500000);
  });
});

describe('calculateQuote - 편집/쇼츠', () => {
  test('편집 일반 3분 = 300,000', () => {
    const r = calculateQuote({ ...base, editMinutes: 3 });
    expect(r.editingFee).toBe(300000);
  });
  test('편집 예능형효과 3분 = 360,000', () => {
    const r = calculateQuote({ ...base, editMinutes: 3, entertainmentEffect: true });
    expect(r.editingFee).toBe(360000);
  });
  test('쇼츠 일반 2분 = 100,000', () => {
    const r = calculateQuote({ ...base, shortsMinutes: 2 });
    expect(r.shortsEditingFee).toBe(100000);
  });
  test('쇼츠 예능형효과 2분 = 120,000', () => {
    const r = calculateQuote({ ...base, shortsMinutes: 2, shortsEntertainmentEffect: true });
    expect(r.shortsEditingFee).toBe(120000);
  });
});

describe('calculateQuote - 출장/인트로/AI', () => {
  test('해외 출장: isTravelNegotiable=true, travelFee=0', () => {
    const r = calculateQuote({ ...base, travelLocation: 'overseas' });
    expect(r.isTravelNegotiable).toBe(true);
    expect(r.travelFee).toBe(0);
  });
  test('제주 출장비 = 200,000', () => {
    const r = calculateQuote({ ...base, travelLocation: 'jeju' });
    expect(r.travelFee).toBe(200000);
  });
  test('무료 인트로/아웃트로 = 100,000', () => {
    const r = calculateQuote({ ...base, introOutro: 'free' });
    expect(r.introOutroFee).toBe(100000);
  });
  test('고급 인트로/아웃트로 = 100,000', () => {
    const r = calculateQuote({ ...base, introOutro: 'premium' });
    expect(r.introOutroFee).toBe(100000);
  });
  test('AI 동영상 5분 = 500,000', () => {
    const r = calculateQuote({ ...base, aiVideoMinutes: 5 });
    expect(r.aiVideoFee).toBe(500000);
  });
});

describe('calculateQuote - 편수/할인', () => {
  test('편수 3 적용: subtotalPerEpisode × 3 = subtotal', () => {
    const r = calculateQuote({ ...base, editMinutes: 1, episodeCount: 3 });
    expect(r.subtotalPerEpisode).toBe(600000);
    expect(r.subtotal).toBe(1800000);
    expect(r.total).toBe(1800000);
  });
  test('추가작업 할인 5%: subtotal=500,000 → discount=25,000', () => {
    const r = calculateQuote({ ...base, additionalWork: true });
    expect(r.discount).toBe(25000);
    expect(r.total).toBe(475000);
  });
  test('편수 2 + 할인 5%: subtotal=1,000,000 → discount=50,000 → total=950,000', () => {
    const r = calculateQuote({ ...base, episodeCount: 2, additionalWork: true });
    expect(r.subtotal).toBe(1000000);
    expect(r.discount).toBe(50000);
    expect(r.total).toBe(950000);
  });
  test('모든 항목 0이면 total=0', () => {
    const r = calculateQuote({ ...base, shootingCount: 0 });
    expect(r.total).toBe(0);
  });
});
