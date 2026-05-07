# 견적서 세부화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Excel 기반 가격 구조 + 고객 정보 2단계 폼 + 로고 워터마크 견적서 이미지 구현

**Architecture:** 단일 `page.tsx`에서 `step(1|2)` 상태로 폼 전환. `pricing.ts`를 Excel 구조에 맞게 완전 재작성. 견적서 미리보기 div에 로고 워터마크 오버레이.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, html-to-image, Resend, Jest

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `public/logo-white.png` | 견적서 헤더/워터마크용 로고 이미지 |
| `src/types/quote.ts` | 타입 정의 (ClientInfo, QuoteInput, QuoteResult) |
| `src/lib/pricing.ts` | 가격 상수 + calculateQuote 함수 |
| `tests/pricing.test.ts` | pricing.ts 단위 테스트 |
| `src/app/page.tsx` | 2단계 폼 UI + 견적서 미리보기 |
| `src/app/api/quote/route.ts` | 입력 검증 + 이메일 전송 |

---

## Task 1: 로고 파일 복사 + public 디렉토리 생성

**Files:**
- Create: `public/logo-white.png`

- [ ] **Step 1: public 디렉토리 생성 후 로고 복사**

```powershell
New-Item -ItemType Directory -Force -Path "public"
Copy-Item "프로파간다 로고 흰색.png" "public/logo-white.png"
```

Expected: `public/logo-white.png` 파일 생성 확인

- [ ] **Step 2: 커밋**

```bash
git add public/logo-white.png
git commit -m "chore: 로고 이미지 public 디렉토리에 추가"
```

---

## Task 2: 타입 재작성

**Files:**
- Modify: `src/types/quote.ts`

- [ ] **Step 1: 타입 파일 전면 교체**

`src/types/quote.ts` 전체를 아래로 교체:

```typescript
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
```

- [ ] **Step 2: 커밋**

```bash
git add src/types/quote.ts
git commit -m "refactor: 견적서 타입 재작성 (Excel 기반 구조)"
```

---

## Task 3: pricing.ts TDD

**Files:**
- Modify: `src/lib/pricing.ts`
- Modify: `tests/pricing.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/pricing.test.ts` 전체를 아래로 교체:

```typescript
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
    // shootingFee=500000 + editingFee=100000 = 600000/편 × 3 = 1,800,000
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
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test
```

Expected: 다수 테스트 FAIL (PRICES 구조 불일치)

- [ ] **Step 3: pricing.ts 전면 재작성**

`src/lib/pricing.ts` 전체를 아래로 교체:

```typescript
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
  chungcheong: 50000,
  jeonla:      100000,
  jeju:        200000,
  overseas:    null,
};

const EDITING  = { normal: 100000, entertainment: 120000 } as const;
const SHORTS   = { normal:  50000, entertainment:  60000 } as const;
const INTRO_OUTRO: Record<IntroOutroType, number> = { none: 0, free: 100000, premium: 100000 };

export const PRICES = {
  shooting:            SHOOTING_BASE,
  aerialRatio:         1.2,
  travel:              TRAVEL,
  editing:             EDITING,
  shorts:              SHORTS,
  introOutro:          INTRO_OUTRO,
  compositionPerMin:   100000,
  aiVideoPerMin:       100000,
  additionalDiscount:  0.05,
} as const;

export const SHOOTING_LABELS: Record<ShootingType, string> = {
  photo:         '사진',
  video:         '비디오',
  'photo+video': '사진+비디오',
};

export const TRAVEL_LABELS: Record<TravelLocation, string> = {
  seoul:       '서울·인천·경기',
  chungcheong: '충청·강원',
  jeonla:      '전라·경상',
  jeju:        '제주',
  overseas:    '해외',
};

export const INTRO_OUTRO_LABELS: Record<IntroOutroType, string> = {
  none:    '없음',
  free:    '무료 인트로/아웃트로',
  premium: '고급 인트로/아웃트로',
};

export function calculateQuote(input: QuoteInput): QuoteResult {
  const baseUnit = SHOOTING_BASE[input.shootingType][input.shootingHours];
  const shootingUnit = input.aerial ? Math.round(baseUnit * 1.2) : baseUnit;
  const shootingFee = shootingUnit * input.shootingCount;

  const compositionFee = input.compositionMinutes * 100000;

  const travelBase = TRAVEL[input.travelLocation];
  const isTravelNegotiable = travelBase === null;
  const travelFee = isTravelNegotiable ? 0 : (travelBase as number);

  const editingFee = input.editMinutes *
    (input.entertainmentEffect ? EDITING.entertainment : EDITING.normal);

  const shortsEditingFee = input.shortsMinutes *
    (input.shortsEntertainmentEffect ? SHORTS.entertainment : SHORTS.normal);

  const introOutroFee = INTRO_OUTRO[input.introOutro];

  const aiVideoFee = input.aiVideoMinutes * 100000;

  const subtotalPerEpisode = shootingFee + compositionFee + travelFee +
    editingFee + shortsEditingFee + introOutroFee + aiVideoFee;

  const subtotal = subtotalPerEpisode * input.episodeCount;
  const discount = input.additionalWork ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal - discount;

  return {
    shootingFee, compositionFee, travelFee,
    editingFee, shortsEditingFee, introOutroFee, aiVideoFee,
    subtotalPerEpisode, subtotal, discount, total,
    isTravelNegotiable,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test
```

Expected: 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pricing.ts tests/pricing.test.ts
git commit -m "feat: Excel 기반 가격 구조 재작성 + 테스트 업데이트"
```

---

## Task 4: page.tsx — 1단계 (의뢰인 정보)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: page.tsx 전면 교체 (1단계 + 기본 구조)**

`src/app/page.tsx` 전체를 아래로 교체:

```typescript
'use client';

import { useState, useRef } from 'react';
import { calculateQuote, SHOOTING_LABELS, TRAVEL_LABELS, INTRO_OUTRO_LABELS, COMPANY } from '@/lib/pricing';
import {
  ClientInfo, QuoteInput, QuoteResult,
  ShootingType, ShootingHours, TravelLocation, IntroOutroType,
} from '@/types/quote';

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

function formatQuoteDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${y}년 ${m}월 ${day}일`;
}

const defaultClient: ClientInfo = {
  name: '', position: '', department: '', contact: '',
  company: '', projectName: '', projectDate: '', projectLocation: '',
  requirements: '', quoteDate: new Date().toISOString().split('T')[0],
  refs: [''],
};

const defaultInput: QuoteInput = {
  shootingType: 'video', shootingHours: '8h', aerial: false,
  shootingCount: 1, compositionMinutes: 0, travelLocation: 'seoul',
  editMinutes: 0, entertainmentEffect: false,
  shortsMinutes: 0, shortsEntertainmentEffect: false,
  introOutro: 'none', aiVideoMinutes: 0, episodeCount: 1, additionalWork: false,
};

export default function Home() {
  const [step, setStep] = useState<1 | 2>(1);
  const [clientInfo, setClientInfo] = useState<ClientInfo>(defaultClient);
  const [input, setInput] = useState<QuoteInput>(defaultInput);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const quoteRef = useRef<HTMLDivElement>(null);

  const result = calculateQuote(input);
  const step1Valid = !!(clientInfo.name.trim() && clientInfo.contact.trim() && clientInfo.quoteDate);

  const setClient = (field: keyof Omit<ClientInfo, 'refs'>, value: string) => {
    setClientInfo(prev => ({ ...prev, [field]: value }));
    setSent(false);
  };

  const setRef = (i: number, v: string) => {
    setClientInfo(prev => {
      const refs = [...prev.refs];
      refs[i] = v;
      return { ...prev, refs };
    });
  };
  const addRef = () => setClientInfo(prev => ({ ...prev, refs: [...prev.refs, ''] }));
  const removeRef = (i: number) => setClientInfo(prev => ({ ...prev, refs: prev.refs.filter((_, idx) => idx !== i) }));

  const setQ = (updates: Partial<QuoteInput>) => {
    setInput(prev => ({ ...prev, ...updates }));
    setSent(false);
  };

  const handleSave = async () => {
    if (!quoteRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(quoteRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `견적서_${clientInfo.name || '고객'}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError('이미지 저장 중 오류가 발생했습니다');
    }
  };

  const handleSubmit = async () => {
    if (!step1Valid) return;
    setSending(true);
    setError('');
    setSent(false);
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientInfo, input }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? '오류가 발생했습니다');
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '전송 중 오류가 발생했습니다');
    } finally {
      setSending(false);
    }
  };

  // 견적서 항목 리스트 생성
  const lineItems: { label: string; amount: number }[] = [];
  if (result.shootingFee > 0) lineItems.push({
    label: `${SHOOTING_LABELS[input.shootingType]} 촬영 (${input.shootingHours === '4h' ? '4시간 이하' : '8시간'}${input.aerial ? ', 항공' : ''}) × ${input.shootingCount}회`,
    amount: result.shootingFee,
  });
  if (result.compositionFee > 0) lineItems.push({ label: `구성 (${input.compositionMinutes}분)`, amount: result.compositionFee });
  if (!result.isTravelNegotiable && result.travelFee > 0) lineItems.push({ label: `출장비 (${TRAVEL_LABELS[input.travelLocation]})`, amount: result.travelFee });
  if (result.editingFee > 0) lineItems.push({ label: `편집 (${input.editMinutes}분${input.entertainmentEffect ? ', 예능형효과' : ''})`, amount: result.editingFee });
  if (result.shortsEditingFee > 0) lineItems.push({ label: `쇼츠 편집 (${input.shortsMinutes}분${input.shortsEntertainmentEffect ? ', 예능형효과' : ''})`, amount: result.shortsEditingFee });
  if (result.introOutroFee > 0) lineItems.push({ label: INTRO_OUTRO_LABELS[input.introOutro], amount: result.introOutroFee });
  if (result.aiVideoFee > 0) lineItems.push({ label: `AI 동영상 제작 (${input.aiVideoMinutes}분)`, amount: result.aiVideoFee });

  return (
    <main className="min-h-screen bg-white">
      <header className="py-6 px-6 border-b border-gray-100">
        <h1 className="text-lg tracking-widest font-light text-center">견적서 계산기</h1>
        <div className="flex justify-center gap-4 mt-2">
          {[1, 2].map(s => (
            <span key={s} className={`text-xs tracking-widest ${step === s ? 'text-black' : 'text-gray-300'}`}>
              {s === 1 ? '01 의뢰인 정보' : '02 견적 항목'}
            </span>
          ))}
        </div>
      </header>

      {step === 1 && (
        <Step1
          clientInfo={clientInfo}
          setClient={setClient}
          setRef={setRef}
          addRef={addRef}
          removeRef={removeRef}
          onNext={() => setStep(2)}
          valid={step1Valid}
        />
      )}

      {step === 2 && (
        <Step2
          input={input}
          setQ={setQ}
          result={result}
          clientInfo={clientInfo}
          lineItems={lineItems}
          quoteRef={quoteRef}
          sending={sending}
          sent={sent}
          error={error}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
          onSave={handleSave}
          formatQuoteDate={formatQuoteDate}
        />
      )}
    </main>
  );
}

/* ── 1단계: 의뢰인 정보 ── */
function Step1({
  clientInfo, setClient, setRef, addRef, removeRef, onNext, valid,
}: {
  clientInfo: ClientInfo;
  setClient: (f: keyof Omit<ClientInfo, 'refs'>, v: string) => void;
  setRef: (i: number, v: string) => void;
  addRef: () => void;
  removeRef: (i: number) => void;
  onNext: () => void;
  valid: boolean;
}) {
  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-5">
      <Field label="이름" required>
        <input className={inputClass} value={clientInfo.name} onChange={e => setClient('name', e.target.value)} placeholder="홍길동" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="직책">
          <input className={inputClass} value={clientInfo.position} onChange={e => setClient('position', e.target.value)} placeholder="대표" />
        </Field>
        <Field label="부서">
          <input className={inputClass} value={clientInfo.department} onChange={e => setClient('department', e.target.value)} placeholder="마케팅팀" />
        </Field>
      </div>

      <Field label="연락처" required>
        <input className={inputClass} value={clientInfo.contact} onChange={e => setClient('contact', e.target.value)} placeholder="010-0000-0000" />
      </Field>

      <Field label="회사">
        <input className={inputClass} value={clientInfo.company} onChange={e => setClient('company', e.target.value)} placeholder="(주)OO" />
      </Field>

      <Field label="사업명">
        <input className={inputClass} value={clientInfo.projectName} onChange={e => setClient('projectName', e.target.value)} placeholder="브랜드 홍보영상" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="사업일시">
          <input className={inputClass} value={clientInfo.projectDate} onChange={e => setClient('projectDate', e.target.value)} placeholder="2026.06.01" />
        </Field>
        <Field label="사업장소">
          <input className={inputClass} value={clientInfo.projectLocation} onChange={e => setClient('projectLocation', e.target.value)} placeholder="서울 강남구" />
        </Field>
      </div>

      <Field label="견적일" required>
        <input type="date" className={inputClass} value={clientInfo.quoteDate} onChange={e => setClient('quoteDate', e.target.value)} />
      </Field>

      <Field label="요청사항">
        <textarea
          className={`${inputClass} resize-none`}
          rows={4}
          value={clientInfo.requirements}
          onChange={e => setClient('requirements', e.target.value)}
          placeholder="요청사항을 입력해주세요"
        />
      </Field>

      <Field label="레퍼런스 링크">
        <div className="space-y-2">
          {clientInfo.refs.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={`${inputClass} flex-1`}
                value={r}
                onChange={e => setRef(i, e.target.value)}
                placeholder="https://youtube.com/..."
                type="url"
              />
              {clientInfo.refs.length > 1 && (
                <button type="button" onClick={() => removeRef(i)} className="text-gray-400 hover:text-black text-sm px-2 transition-colors">✕</button>
              )}
            </div>
          ))}
          <button onClick={addRef} className="text-xs text-gray-400 hover:text-black transition-colors">+ 링크 추가</button>
        </div>
      </Field>

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full py-4 bg-black text-white text-sm tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        다음 →
      </button>
    </div>
  );
}

/* ── 2단계: 견적 항목 + 미리보기 ── */
function Step2({
  input, setQ, result, clientInfo, lineItems, quoteRef,
  sending, sent, error, onBack, onSubmit, onSave, formatQuoteDate,
}: {
  input: QuoteInput;
  setQ: (u: Partial<QuoteInput>) => void;
  result: QuoteResult;
  clientInfo: ClientInfo;
  lineItems: { label: string; amount: number }[];
  quoteRef: React.RefObject<HTMLDivElement | null>;
  sending: boolean;
  sent: boolean;
  error: string;
  onBack: () => void;
  onSubmit: () => void;
  onSave: () => void;
  formatQuoteDate: (d: string) => string;
}) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* 입력 패널 */}
      <section className="space-y-5">
        {/* 촬영 타입 */}
        <Field label="촬영 타입">
          <div className="flex gap-2">
            {(['photo', 'video', 'photo+video'] as ShootingType[]).map(t => (
              <button key={t} type="button" onClick={() => setQ({ shootingType: t })}
                className={`flex-1 py-2 border text-sm transition-colors ${input.shootingType === t ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
                {SHOOTING_LABELS[t]}
              </button>
            ))}
          </div>
        </Field>

        {/* 촬영 시간 */}
        <Field label="촬영 시간">
          <div className="flex gap-2">
            {([['4h', '4시간 이하'], ['8h', '8시간']] as [ShootingHours, string][]).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setQ({ shootingHours: val })}
                className={`flex-1 py-2 border text-sm transition-colors ${input.shootingHours === val ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
                {label}
              </button>
            ))}
          </div>
        </Field>

        {/* 항공촬영 */}
        <Field label="항공촬영">
          <button type="button" onClick={() => setQ({ aerial: !input.aerial })}
            className={`w-full py-3 border text-sm tracking-wide transition-colors ${input.aerial ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-700 hover:border-black'}`}>
            {input.aerial ? '포함' : '미포함'}
            <span className={`ml-2 text-xs ${input.aerial ? 'text-gray-300' : 'text-gray-400'}`}>(단가 ×1.2)</span>
          </button>
        </Field>

        {/* 촬영 횟수 */}
        <Field label="촬영 횟수" required>
          <NumberInput value={input.shootingCount} onChange={v => setQ({ shootingCount: v })} min={0} suffix="회" />
        </Field>

        {/* 구성 */}
        <Field label="구성">
          <NumberInput value={input.compositionMinutes} onChange={v => setQ({ compositionMinutes: v })} min={0} suffix="분" />
        </Field>

        {/* 출장 지역 */}
        <Field label="출장 지역">
          <select className={`${inputClass} pr-8`} value={input.travelLocation}
            onChange={e => setQ({ travelLocation: e.target.value as TravelLocation })}>
            {(Object.entries(TRAVEL_LABELS) as [TravelLocation, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}{val === 'seoul' ? ' (출장비 없음)' : ''}</option>
            ))}
          </select>
          {input.travelLocation === 'overseas' && (
            <p className="text-xs text-amber-600 mt-1">해외 출장비는 별도 협의됩니다</p>
          )}
        </Field>

        {/* 편집 */}
        <Field label="편집">
          <div className="flex items-center gap-3">
            <NumberInput value={input.editMinutes} onChange={v => setQ({ editMinutes: v })} min={0} suffix="분" />
            <button type="button" onClick={() => setQ({ entertainmentEffect: !input.entertainmentEffect })}
              className={`px-3 py-1.5 border text-xs transition-colors whitespace-nowrap ${input.entertainmentEffect ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
              예능형효과
            </button>
          </div>
        </Field>

        {/* 쇼츠 편집 */}
        <Field label="쇼츠 편집">
          <div className="flex items-center gap-3">
            <NumberInput value={input.shortsMinutes} onChange={v => setQ({ shortsMinutes: v })} min={0} suffix="분" />
            <button type="button" onClick={() => setQ({ shortsEntertainmentEffect: !input.shortsEntertainmentEffect })}
              className={`px-3 py-1.5 border text-xs transition-colors whitespace-nowrap ${input.shortsEntertainmentEffect ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
              예능형효과
            </button>
          </div>
        </Field>

        {/* 인트로/아웃트로 */}
        <Field label="인트로/아웃트로">
          <div className="flex gap-2">
            {(['none', 'free', 'premium'] as IntroOutroType[]).map(t => (
              <button key={t} type="button" onClick={() => setQ({ introOutro: t })}
                className={`flex-1 py-2 border text-xs leading-tight transition-colors ${input.introOutro === t ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
                {t === 'none' ? '없음' : t === 'free' ? '무료\n+10만' : '고급\n+10만'}
              </button>
            ))}
          </div>
        </Field>

        {/* AI 동영상 */}
        <Field label="AI 동영상 제작">
          <NumberInput value={input.aiVideoMinutes} onChange={v => setQ({ aiVideoMinutes: v })} min={0} suffix="분" />
        </Field>

        {/* 편수 */}
        <Field label="편수" required>
          <NumberInput value={input.episodeCount} onChange={v => setQ({ episodeCount: Math.max(1, v) })} min={1} suffix="편" />
        </Field>

        {/* 추가작업 할인 */}
        <Field label="추가작업 후속계약 할인">
          <button type="button" onClick={() => setQ({ additionalWork: !input.additionalWork })}
            className={`w-full py-3 border text-sm tracking-wide transition-colors ${input.additionalWork ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-700 hover:border-black'}`}>
            {input.additionalWork ? '적용 (−5%)' : '미적용'}
          </button>
        </Field>
      </section>

      {/* 견적서 미리보기 */}
      <section className="space-y-4">
        <div ref={quoteRef} className="relative border border-gray-200 bg-white overflow-hidden">
          {/* 워터마크 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="" style={{ width: '60%', opacity: 0.1, filter: 'invert(1)' }} />
          </div>

          {/* 헤더 */}
          <div className="relative z-10 bg-black text-white px-6 py-4 flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="로고" style={{ height: '26px' }} />
            <span className="text-base tracking-[0.35em] font-light">견  적  서</span>
          </div>

          {/* 회사 정보 */}
          <div className="relative z-10 px-6 pt-4 pb-3 border-b border-gray-100 space-y-0.5 text-xs text-gray-600">
            <p className="font-semibold text-sm text-gray-900">{COMPANY.name}</p>
            <p>사업자등록번호: {COMPANY.bizNo}</p>
            <p>이메일: {COMPANY.email}</p>
            <p>견적일: {formatQuoteDate(clientInfo.quoteDate)}</p>
          </div>

          {/* 고객 정보 */}
          <div className="relative z-10 px-6 py-3 border-b border-gray-100">
            <table className="w-full text-xs">
              <tbody>
                {([
                  ['수신', [clientInfo.name, clientInfo.position, clientInfo.department].filter(Boolean).join(' / ')],
                  ['회사', clientInfo.company],
                  ['연락처', clientInfo.contact],
                  ['사업명', clientInfo.projectName],
                  ['일시', clientInfo.projectDate],
                  ['장소', clientInfo.projectLocation],
                ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                  <tr key={label}>
                    <td className="py-0.5 w-12 text-gray-400 shrink-0">{label}</td>
                    <td className="py-0.5 text-gray-800">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 요청사항 */}
          {clientInfo.requirements && (
            <div className="relative z-10 px-6 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-1">요청사항</p>
              <p className="text-xs text-gray-800 whitespace-pre-wrap">{clientInfo.requirements}</p>
            </div>
          )}

          {/* 견적 항목 테이블 */}
          <div className="relative z-10 px-6 py-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <td className="pb-2 text-gray-400 w-6">No</td>
                  <td className="pb-2 text-gray-400">항목</td>
                  <td className="pb-2 text-gray-400 text-right">금액</td>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-300">{i + 1}</td>
                    <td className="py-1.5 text-gray-700">{item.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatWon(item.amount)}</td>
                  </tr>
                ))}
                {result.isTravelNegotiable && (
                  <tr className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-300">{lineItems.length + 1}</td>
                    <td className="py-1.5 text-gray-700">출장비 (해외)</td>
                    <td className="py-1.5 text-right text-amber-600">별도협의</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 합계 영역 */}
            <div className="mt-4 pt-3 border-t border-gray-200 space-y-1.5 text-xs">
              {input.episodeCount > 1 && (
                <div className="flex justify-between text-gray-500">
                  <span>소계 × {input.episodeCount}편</span>
                  <span className="tabular-nums">{formatWon(result.subtotal)}</span>
                </div>
              )}
              {result.discount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>할인 (−5%)</span>
                  <span className="tabular-nums">−{formatWon(result.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-sm pt-1 border-t border-gray-100">
                <span>합계</span>
                <span className="tabular-nums">{formatWon(result.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        {sent && <p className="text-xs text-green-600">견적 요청이 전송되었습니다.</p>}

        <div className="flex gap-3">
          <button onClick={onBack} className="py-3 px-5 border border-gray-300 text-sm hover:border-black transition-colors">
            ← 이전
          </button>
          <button onClick={onSubmit} disabled={sending}
            className="flex-1 py-3 bg-black text-white text-sm tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {sending ? '전송 중...' : '견적 요청'}
          </button>
          <button onClick={onSave}
            className="flex-1 py-3 border border-black text-sm tracking-widest hover:bg-gray-50 transition-colors">
            PNG 저장
          </button>
        </div>
      </section>
    </div>
  );
}

/* ── 공통 컴포넌트 ── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs tracking-widest text-gray-500 mb-1.5 uppercase">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, min, suffix }: { value: number; onChange: (v: number) => void; min: number; suffix: string }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 border border-gray-300 text-sm hover:border-black transition-colors">−</button>
      <span className="text-sm w-8 text-center tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-8 h-8 border border-gray-300 text-sm hover:border-black transition-colors">+</button>
      <span className="text-xs text-gray-400">{suffix}</span>
    </div>
  );
}

const inputClass = 'w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors bg-white';
```

- [ ] **Step 2: 개발 서버 실행 후 동작 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속:
- 1단계 폼 표시 확인
- 이름/연락처/견적일 미입력 시 "다음" 버튼 비활성 확인
- "다음" 클릭 시 2단계 전환 확인
- 2단계 모든 항목 조작 시 우측 견적서 실시간 업데이트 확인
- 헤더에 로고 + "견 적 서" 표시 확인
- 중앙 워터마크 표시 확인
- PNG 저장 버튼으로 이미지 다운로드 확인

- [ ] **Step 3: 커밋**

```bash
git add src/app/page.tsx
git commit -m "feat: 2단계 견적서 폼 + 로고 워터마크 미리보기 구현"
```

---

## Task 5: API 라우트 업데이트

**Files:**
- Modify: `src/app/api/quote/route.ts`

- [ ] **Step 1: route.ts 전면 교체**

`src/app/api/quote/route.ts` 전체를 아래로 교체:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ClientInfo, QuoteInput, ShootingType, ShootingHours, TravelLocation, IntroOutroType } from '@/types/quote';
import { calculateQuote, SHOOTING_LABELS, TRAVEL_LABELS, INTRO_OUTRO_LABELS, COMPANY } from '@/lib/pricing';

const VALID_SHOOTING_TYPES: ShootingType[] = ['photo', 'video', 'photo+video'];
const VALID_SHOOTING_HOURS: ShootingHours[] = ['4h', '8h'];
const VALID_TRAVEL: TravelLocation[] = ['seoul', 'chungcheong', 'jeonla', 'jeju', 'overseas'];
const VALID_INTRO: IntroOutroType[] = ['none', 'free', 'premium'];

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

function esc(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  let body: { clientInfo: ClientInfo; input: QuoteInput };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 });
  }

  const { clientInfo, input } = body;

  if (!clientInfo?.name?.trim() || !clientInfo?.contact?.trim() || !clientInfo?.quoteDate?.trim()) {
    return NextResponse.json({ error: '필수 항목(이름/연락처/견적일)이 누락되었습니다' }, { status: 400 });
  }

  if (
    !VALID_SHOOTING_TYPES.includes(input?.shootingType) ||
    !VALID_SHOOTING_HOURS.includes(input?.shootingHours) ||
    !VALID_TRAVEL.includes(input?.travelLocation) ||
    !VALID_INTRO.includes(input?.introOutro) ||
    typeof input?.aerial !== 'boolean' ||
    typeof input?.entertainmentEffect !== 'boolean' ||
    typeof input?.shortsEntertainmentEffect !== 'boolean' ||
    typeof input?.additionalWork !== 'boolean'
  ) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다' }, { status: 400 });
  }

  const nums = [input.shootingCount, input.compositionMinutes, input.editMinutes,
                input.shortsMinutes, input.aiVideoMinutes, input.episodeCount];
  if (nums.some(v => !Number.isFinite(v) || v < 0) || input.episodeCount < 1) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다' }, { status: 400 });
  }

  const result = calculateQuote(input);

  const validRefs = (clientInfo.refs ?? []).slice(0, 20).filter((r: string) => {
    try { const u = new URL(r); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  });

  const refsHtml = validRefs.length > 0
    ? `<ul style="padding-left:16px">${validRefs.map((r: string) => `<li><a href="${esc(r)}">${esc(r)}</a></li>`).join('')}</ul>`
    : '<p style="color:#999">없음</p>';

  const clientRows = ([
    ['이름', clientInfo.name],
    ['직책', clientInfo.position],
    ['부서', clientInfo.department],
    ['연락처', clientInfo.contact],
    ['회사', clientInfo.company],
    ['사업명', clientInfo.projectName],
    ['사업일시', clientInfo.projectDate],
    ['사업장소', clientInfo.projectLocation],
    ['견적일', clientInfo.quoteDate],
  ] as [string, string][]).filter(([, v]) => v)
    .map(([label, value]) => `<tr><td style="padding:4px 8px;color:#666;width:80px">${label}</td><td style="padding:4px 8px">${esc(value)}</td></tr>`)
    .join('');

  const shootingLabel = `${SHOOTING_LABELS[input.shootingType]} 촬영 (${input.shootingHours === '4h' ? '4시간 이하' : '8시간'}${input.aerial ? ', 항공' : ''}) × ${input.shootingCount}회`;

  const quoteRows = [
    result.shootingFee > 0
      ? `<tr><td style="padding:4px 8px;color:#666">${shootingLabel}</td><td style="padding:4px 8px;text-align:right">${formatWon(result.shootingFee)}</td></tr>` : '',
    result.compositionFee > 0
      ? `<tr><td style="padding:4px 8px;color:#666">구성 (${input.compositionMinutes}분)</td><td style="padding:4px 8px;text-align:right">${formatWon(result.compositionFee)}</td></tr>` : '',
    result.isTravelNegotiable
      ? `<tr><td style="padding:4px 8px;color:#666">출장비 (해외)</td><td style="padding:4px 8px;text-align:right;color:#d97706">별도협의</td></tr>`
      : result.travelFee > 0
        ? `<tr><td style="padding:4px 8px;color:#666">출장비 (${TRAVEL_LABELS[input.travelLocation]})</td><td style="padding:4px 8px;text-align:right">${formatWon(result.travelFee)}</td></tr>` : '',
    result.editingFee > 0
      ? `<tr><td style="padding:4px 8px;color:#666">편집 (${input.editMinutes}분${input.entertainmentEffect ? ', 예능형효과' : ''})</td><td style="padding:4px 8px;text-align:right">${formatWon(result.editingFee)}</td></tr>` : '',
    result.shortsEditingFee > 0
      ? `<tr><td style="padding:4px 8px;color:#666">쇼츠 편집 (${input.shortsMinutes}분${input.shortsEntertainmentEffect ? ', 예능형효과' : ''})</td><td style="padding:4px 8px;text-align:right">${formatWon(result.shortsEditingFee)}</td></tr>` : '',
    result.introOutroFee > 0
      ? `<tr><td style="padding:4px 8px;color:#666">${INTRO_OUTRO_LABELS[input.introOutro]}</td><td style="padding:4px 8px;text-align:right">${formatWon(result.introOutroFee)}</td></tr>` : '',
    result.aiVideoFee > 0
      ? `<tr><td style="padding:4px 8px;color:#666">AI 동영상 제작 (${input.aiVideoMinutes}분)</td><td style="padding:4px 8px;text-align:right">${formatWon(result.aiVideoFee)}</td></tr>` : '',
    input.episodeCount > 1
      ? `<tr><td style="padding:4px 8px;color:#666">소계 × ${input.episodeCount}편</td><td style="padding:4px 8px;text-align:right">${formatWon(result.subtotal)}</td></tr>` : '',
    result.discount > 0
      ? `<tr><td style="padding:4px 8px;color:#666">할인 (−5%)</td><td style="padding:4px 8px;text-align:right">−${formatWon(result.discount)}</td></tr>` : '',
    `<tr style="border-top:1px solid #eee"><td style="padding:8px;font-weight:bold">합계</td><td style="padding:8px;text-align:right;font-weight:bold">${formatWon(result.total)}</td></tr>`,
  ].join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="font-size:18px;font-weight:500;border-bottom:1px solid #eee;padding-bottom:8px">[견적 요청] ${esc(COMPANY.name)}</h2>
      <h3 style="font-size:14px;color:#666;margin-top:24px">의뢰인 정보</h3>
      <table style="width:100%;border-collapse:collapse">${clientRows}</table>
      ${clientInfo.requirements ? `<h3 style="font-size:14px;color:#666;margin-top:16px">요청사항</h3><p style="white-space:pre-wrap;font-size:13px">${esc(clientInfo.requirements)}</p>` : ''}
      <h3 style="font-size:14px;color:#666;margin-top:24px">견적 내용</h3>
      <table style="width:100%;border-collapse:collapse">${quoteRows}</table>
      <h3 style="font-size:14px;color:#666;margin-top:24px">레퍼런스</h3>
      ${refsHtml}
    </div>
  `;

  const { RESEND_API_KEY, SENDER_EMAIL, MANAGER_EMAIL } = process.env;
  if (!RESEND_API_KEY || !SENDER_EMAIL || !MANAGER_EMAIL) {
    console.error('[quote API] 환경변수 누락');
    return NextResponse.json({ error: '서버 설정 오류입니다' }, { status: 500 });
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: MANAGER_EMAIL,
      subject: `[견적 요청] ${clientInfo.name}${clientInfo.company ? ` - ${clientInfo.company}` : ''}`,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[quote API error]', err);
    return NextResponse.json({ error: '이메일 전송 중 오류가 발생했습니다' }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript 오류 없는지 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/quote/route.ts
git commit -m "feat: API 라우트 - 새 타입 적용 및 이메일 템플릿 업데이트"
```

---

## Task 6: 최종 검증

- [ ] **Step 1: 전체 테스트 통과 확인**

```bash
npm test
```

Expected: 전체 PASS

- [ ] **Step 2: 빌드 검증**

```bash
npm run build
```

Expected: 오류 없이 빌드 완료

- [ ] **Step 3: 개발 서버 E2E 점검**

```bash
npm run dev
```

점검 항목:
1. 1단계: 모든 필드 입력 → "다음" 버튼 활성화 확인
2. 2단계: 촬영 타입/시간/항공 변경 시 우측 금액 즉시 반영 확인
3. 편수 3 입력 시 소계 × 3 표시 확인
4. 추가작업 할인 토글 시 −5% 반영 확인
5. 해외 지역 선택 시 "별도협의" 텍스트 표시 확인
6. PNG 저장: 헤더에 로고 + 워터마크 포함된 이미지 다운로드 확인
7. "← 이전" 클릭 시 1단계로 복귀, 입력 내용 유지 확인
