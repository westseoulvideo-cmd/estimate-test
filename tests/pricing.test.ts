import { calculateQuote, PRICES } from '@/lib/pricing';

describe('PRICES 상수', () => {
  test('촬영 단가 500,000원', () => {
    expect(PRICES.shooting).toBe(500000);
  });
  test('편집 분당 단가 300,000원', () => {
    expect(PRICES.editingPerMinute).toBe(300000);
  });
  test('드론 단가 500,000원', () => {
    expect(PRICES.drone).toBe(500000);
  });
  test('추가 인원 단가 300,000원', () => {
    expect(PRICES.extraCrewPerPerson).toBe(300000);
  });
});

describe('calculateQuote', () => {
  test('촬영 1회, 편집 2분, 옵션 없음', () => {
    const result = calculateQuote({ shootingCount: 1, editMinutes: 2, drone: false, extraCrew: 0 });
    expect(result.shootingFee).toBe(500000);
    expect(result.editingFee).toBe(600000);
    expect(result.droneFee).toBe(0);
    expect(result.extraCrewFee).toBe(0);
    expect(result.total).toBe(1100000);
  });

  test('드론 포함 시 droneFee = 500,000', () => {
    const result = calculateQuote({ shootingCount: 1, editMinutes: 1, drone: true, extraCrew: 0 });
    expect(result.droneFee).toBe(500000);
    expect(result.total).toBe(1300000);
  });

  test('추가 인원 2명', () => {
    const result = calculateQuote({ shootingCount: 1, editMinutes: 1, drone: false, extraCrew: 2 });
    expect(result.extraCrewFee).toBe(600000);
    expect(result.total).toBe(1400000);
  });

  test('촬영 3회', () => {
    const result = calculateQuote({ shootingCount: 3, editMinutes: 0, drone: false, extraCrew: 0 });
    expect(result.shootingFee).toBe(1500000);
    expect(result.total).toBe(1500000);
  });

  test('모든 항목 0이면 합계 0', () => {
    const result = calculateQuote({ shootingCount: 0, editMinutes: 0, drone: false, extraCrew: 0 });
    expect(result.total).toBe(0);
  });

  test('모든 옵션 포함 전체 계산', () => {
    const result = calculateQuote({ shootingCount: 2, editMinutes: 3, drone: true, extraCrew: 1 });
    // 촬영: 1,000,000 + 편집: 900,000 + 드론: 500,000 + 인원: 300,000 = 2,700,000
    expect(result.total).toBe(2700000);
  });
});
