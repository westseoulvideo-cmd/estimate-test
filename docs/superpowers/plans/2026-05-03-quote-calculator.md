# 견적서 계산기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 영상제작 1인 법인용 단일 페이지 견적 계산기 — 실시간 금액 계산, PNG 저장, 이메일 요청 발송

**Architecture:** Next.js App Router 단일 페이지. 가격 계산 로직은 `src/lib/pricing.ts`에 격리해 테스트. 이메일 발송은 `POST /api/quote` API 라우트가 담당하고 Resend를 호출. 메인 페이지는 Client Component 하나로 모든 UI 상태를 관리.

**Tech Stack:** Next.js 16 + TypeScript + Tailwind CSS v4, Resend, html-to-image, Jest + ts-jest

---

## 파일 구조

```
C:\견적서 연습\
├── src/
│   ├── app/
│   │   ├── layout.tsx               # HTML 루트, 메타데이터
│   │   ├── page.tsx                 # 메인 계산기 페이지 (Client Component)
│   │   ├── globals.css              # Tailwind 임포트, body 폰트
│   │   └── api/quote/route.ts       # POST /api/quote — Resend 이메일 발송
│   ├── lib/
│   │   └── pricing.ts               # 가격 상수 + calculateQuote() 순수 함수
│   └── types/
│       └── quote.ts                 # QuoteInput, QuoteResult, QuoteRequest 타입
├── tests/
│   └── pricing.test.ts              # calculateQuote 단위 테스트
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── jest.config.ts
├── jest.setup.ts
└── .env.local.example
```

---

## Task 1: 설정 파일 및 의존성

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `.env.local.example`
- Create: `.gitignore`

- [ ] **Step 1: package.json 생성**

```json
{
  "name": "quote-calculator",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "jest"
  },
  "dependencies": {
    "html-to-image": "^1.11.13",
    "next": "16.2.2",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "resend": "^6.10.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/jest": "^30.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.2",
    "jest": "^30.3.0",
    "jest-environment-jsdom": "^30.3.0",
    "tailwindcss": "^4",
    "ts-jest": "^29.4.9",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: tsconfig.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: 나머지 설정 파일 생성**

`next.config.ts`:
```typescript
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {};
export default nextConfig;
```

`postcss.config.mjs`:
```javascript
const config = { plugins: { '@tailwindcss/postcss': {} } };
export default config;
```

`eslint.config.mjs`:
```javascript
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
```

`jest.config.ts`:
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default config;
```

`jest.setup.ts`:
```typescript
// 추후 전역 테스트 설정 추가 가능
```

`.env.local.example`:
```
RESEND_API_KEY=
SENDER_EMAIL=noreply@yourdomain.com
MANAGER_EMAIL=your@email.com
```

`.gitignore`:
```
.next/
node_modules/
.env.local
*.tsbuildinfo
```

- [ ] **Step 4: 의존성 설치**

```bash
cd "C:\견적서 연습"
npm install
```

Expected: `node_modules/` 생성, lock 파일 생성. 에러 없이 완료.

- [ ] **Step 5: 커밋**

```bash
git init
git add package.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs jest.config.ts jest.setup.ts .env.local.example .gitignore
git commit -m "chore: 프로젝트 초기 설정"
```

---

## Task 2: 타입 정의

**Files:**
- Create: `src/types/quote.ts`

- [ ] **Step 1: src/types/quote.ts 생성**

```typescript
export interface QuoteInput {
  shootingCount: number;
  editMinutes: number;
  drone: boolean;
  extraCrew: number;
}

export interface QuoteResult {
  shootingFee: number;
  editingFee: number;
  droneFee: number;
  extraCrewFee: number;
  total: number;
}

export interface QuoteRequest {
  clientName: string;
  refs: string[];
  input: QuoteInput;
  result: QuoteResult;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/types/quote.ts
git commit -m "feat: QuoteInput/QuoteResult/QuoteRequest 타입 정의"
```

---

## Task 3: 가격 계산 로직 (TDD)

**Files:**
- Create: `tests/pricing.test.ts`
- Create: `src/lib/pricing.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/pricing.test.ts`:
```typescript
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
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npm test
```

Expected: `Cannot find module '@/lib/pricing'` 에러로 FAIL.

- [ ] **Step 3: src/lib/pricing.ts 구현**

```typescript
import { QuoteInput, QuoteResult } from '@/types/quote';

export const PRICES = {
  shooting: 500000,
  editingPerMinute: 300000,
  drone: 500000,
  extraCrewPerPerson: 300000,
} as const;

export function calculateQuote(input: QuoteInput): QuoteResult {
  const shootingFee = input.shootingCount * PRICES.shooting;
  const editingFee = input.editMinutes * PRICES.editingPerMinute;
  const droneFee = input.drone ? PRICES.drone : 0;
  const extraCrewFee = input.extraCrew * PRICES.extraCrewPerPerson;
  const total = shootingFee + editingFee + droneFee + extraCrewFee;
  return { shootingFee, editingFee, droneFee, extraCrewFee, total };
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
npm test
```

Expected: `Tests: 10 passed, 10 total`

- [ ] **Step 5: 커밋**

```bash
git add tests/pricing.test.ts src/lib/pricing.ts
git commit -m "feat: calculateQuote 가격 계산 로직 (TDD)"
```

---

## Task 4: 레이아웃 & 글로벌 CSS

**Files:**
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`

- [ ] **Step 1: src/app/globals.css 생성**

```css
@import "tailwindcss";

body {
  font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #ffffff;
  color: #171717;
  word-break: keep-all;
}
```

- [ ] **Step 2: src/app/layout.tsx 생성**

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '견적서 계산기',
  description: '영상제작 견적 계산기',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: 레이아웃 및 글로벌 CSS"
```

---

## Task 5: 이메일 API 라우트

**Files:**
- Create: `src/app/api/quote/route.ts`

- [ ] **Step 1: src/app/api/quote/route.ts 생성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { QuoteRequest } from '@/types/quote';

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export async function POST(req: NextRequest) {
  let body: QuoteRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 });
  }

  const { clientName, refs, input, result } = body;
  if (!clientName?.trim()) {
    return NextResponse.json({ error: '고객명이 누락되었습니다' }, { status: 400 });
  }

  const refsHtml =
    refs.length > 0
      ? `<ul style="padding-left:16px">${refs.map((r) => `<li><a href="${r}">${r}</a></li>`).join('')}</ul>`
      : '<p style="color:#999">없음</p>';

  const rows = [
    `<tr><td style="padding:4px 8px;color:#666">촬영 (${input.shootingCount}회)</td><td style="padding:4px 8px;text-align:right">${formatWon(result.shootingFee)}</td></tr>`,
    `<tr><td style="padding:4px 8px;color:#666">편집 (${input.editMinutes}분)</td><td style="padding:4px 8px;text-align:right">${formatWon(result.editingFee)}</td></tr>`,
    result.droneFee > 0 ? `<tr><td style="padding:4px 8px;color:#666">드론 촬영</td><td style="padding:4px 8px;text-align:right">${formatWon(result.droneFee)}</td></tr>` : '',
    result.extraCrewFee > 0 ? `<tr><td style="padding:4px 8px;color:#666">추가 인원 (${input.extraCrew}명)</td><td style="padding:4px 8px;text-align:right">${formatWon(result.extraCrewFee)}</td></tr>` : '',
    `<tr style="border-top:1px solid #eee"><td style="padding:8px;font-weight:bold">합계</td><td style="padding:8px;text-align:right;font-weight:bold">${formatWon(result.total)}</td></tr>`,
  ].join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="font-size:18px;font-weight:500;border-bottom:1px solid #eee;padding-bottom:8px">견적 요청</h2>
      <p><strong>고객명:</strong> ${clientName}</p>
      <h3 style="font-size:14px;color:#666;margin-top:24px">견적 내용</h3>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <h3 style="font-size:14px;color:#666;margin-top:24px">레퍼런스</h3>
      ${refsHtml}
    </div>
  `;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.SENDER_EMAIL!,
      to: process.env.MANAGER_EMAIL!,
      subject: `[견적 요청] ${clientName}`,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[quote API error]', err);
    return NextResponse.json({ error: '이메일 전송 중 오류가 발생했습니다' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/quote/route.ts
git commit -m "feat: POST /api/quote 이메일 발송 라우트"
```

---

## Task 6: 메인 페이지

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: src/app/page.tsx 생성**

```typescript
'use client';

import { useState, useRef } from 'react';
import { calculateQuote, PRICES } from '@/lib/pricing';
import { QuoteInput, QuoteRequest } from '@/types/quote';

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function Home() {
  const [clientName, setClientName] = useState('');
  const [refs, setRefs] = useState<string[]>(['']);
  const [shootingCount, setShootingCount] = useState(1);
  const [editMinutes, setEditMinutes] = useState(0);
  const [drone, setDrone] = useState(false);
  const [extraCrew, setExtraCrew] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const quoteRef = useRef<HTMLDivElement>(null);

  const input: QuoteInput = { shootingCount, editMinutes, drone, extraCrew };
  const result = calculateQuote(input);

  const addRef = () => setRefs([...refs, '']);
  const updateRef = (i: number, v: string) => {
    const next = [...refs];
    next[i] = v;
    setRefs(next);
  };
  const removeRef = (i: number) => setRefs(refs.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!quoteRef.current) return;
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(quoteRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `견적서_${clientName || '고객'}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      setError('고객명을 입력해주세요');
      return;
    }
    setSending(true);
    setError('');
    setSent(false);
    const payload: QuoteRequest = {
      clientName,
      refs: refs.filter(Boolean),
      input,
      result,
    };
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  return (
    <main className="min-h-screen bg-white">
      <header className="py-6 px-6 border-b border-gray-100">
        <h1 className="text-lg tracking-widest font-light text-center">견적서 계산기</h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 입력 영역 */}
        <section className="space-y-6">
          <Field label="고객명" required>
            <input
              className={inputClass}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="홍길동"
            />
          </Field>

          <Field label="레퍼런스 링크">
            <div className="space-y-2">
              {refs.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={`${inputClass} flex-1`}
                    value={r}
                    onChange={(e) => updateRef(i, e.target.value)}
                    placeholder="https://youtube.com/..."
                    type="url"
                  />
                  {refs.length > 1 && (
                    <button
                      onClick={() => removeRef(i)}
                      className="text-gray-400 hover:text-black text-sm px-2 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addRef}
                className="text-xs text-gray-400 hover:text-black transition-colors"
              >
                + 링크 추가
              </button>
            </div>
          </Field>

          <Field label="촬영 횟수" required>
            <NumberInput value={shootingCount} onChange={setShootingCount} min={0} suffix="회" />
          </Field>

          <Field label="결과물 길이" required>
            <NumberInput value={editMinutes} onChange={setEditMinutes} min={0} suffix="분" />
          </Field>

          <Field label="드론 촬영">
            <button
              type="button"
              onClick={() => setDrone(!drone)}
              className={`w-full py-3 border text-sm tracking-wide transition-colors ${
                drone
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 text-gray-700 hover:border-black'
              }`}
            >
              {drone ? '포함' : '미포함'}&nbsp;&nbsp;
              <span className={drone ? 'text-gray-300 text-xs' : 'text-gray-400 text-xs'}>
                +{formatWon(PRICES.drone)}
              </span>
            </button>
          </Field>

          <Field label="추가 촬영 인원">
            <NumberInput value={extraCrew} onChange={setExtraCrew} min={0} suffix="명" />
          </Field>
        </section>

        {/* 견적 결과 */}
        <section className="space-y-4">
          <div ref={quoteRef} className="border border-gray-200 p-6 bg-white">
            <h2 className="text-xs tracking-widest text-gray-400 uppercase mb-5">견적서</h2>
            {clientName && (
              <p className="text-sm font-medium mb-4">{clientName} 고객님</p>
            )}

            <div className="space-y-2 text-sm">
              <LineItem label={`촬영 (${shootingCount}회)`} amount={result.shootingFee} />
              <LineItem label={`편집 (${editMinutes}분)`} amount={result.editingFee} />
              {result.droneFee > 0 && <LineItem label="드론 촬영" amount={result.droneFee} />}
              {result.extraCrewFee > 0 && (
                <LineItem label={`추가 인원 (${extraCrew}명)`} amount={result.extraCrewFee} />
              )}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-medium text-sm">
              <span>합계</span>
              <span>{formatWon(result.total)}</span>
            </div>

            {refs.filter(Boolean).length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs tracking-widest text-gray-400 uppercase mb-2">레퍼런스</p>
                <ul className="space-y-1">
                  {refs.filter(Boolean).map((r, i) => (
                    <li key={i} className="text-xs text-gray-500 break-all flex gap-1.5">
                      <span className="text-gray-300">·</span>
                      <a
                        href={r}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-black transition-colors"
                      >
                        {r}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {sent && <p className="text-xs text-green-600">견적 요청이 전송되었습니다.</p>}

          <button
            onClick={handleSubmit}
            disabled={sending}
            className="w-full py-4 bg-black text-white text-sm tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? '전송 중...' : '견적 요청'}
          </button>
          <button
            onClick={handleSave}
            className="w-full py-4 border border-black text-sm tracking-widest hover:bg-gray-50 transition-colors"
          >
            견적서 저장 (PNG)
          </button>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs tracking-widest text-gray-500 mb-1.5 uppercase">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  suffix: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 border border-gray-300 text-sm hover:border-black transition-colors"
      >
        −
      </button>
      <span className="text-sm w-8 text-center tabular-nums">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 border border-gray-300 text-sm hover:border-black transition-colors"
      >
        +
      </button>
      <span className="text-xs text-gray-400">{suffix}</span>
    </div>
  );
}

function LineItem({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span>{formatWon(amount)}</span>
    </div>
  );
}

const inputClass =
  'w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors';
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/page.tsx
git commit -m "feat: 견적서 계산기 메인 페이지"
```

---

## Task 7: 환경변수 설정 및 로컬 실행

**Files:**
- Create: `.env.local` (git 제외)

- [ ] **Step 1: .env.local 생성**

`.env.local.example`을 복사해 `.env.local`로 만들고 실제 값 입력:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
SENDER_EMAIL=noreply@yourdomain.com
MANAGER_EMAIL=your@email.com
```

- [ ] **Step 2: 개발 서버 실행**

```bash
npm run dev
```

Expected: `http://localhost:3000` 에서 견적서 계산기 페이지 표시.

- [ ] **Step 3: 동작 확인 체크리스트**
  - [ ] 고객명 입력 시 견적서에 이름 표시
  - [ ] 촬영 횟수 증가/감소 시 촬영비 실시간 변경
  - [ ] 결과물 길이 변경 시 편집비 실시간 변경
  - [ ] 드론 토글 시 드론비 추가/제거
  - [ ] 추가 인원 설정 시 추가 인원비 반영
  - [ ] 합계 금액이 각 항목 합산과 일치
  - [ ] 레퍼런스 링크 추가/삭제 동작
  - [ ] "견적서 저장" 클릭 시 PNG 다운로드
  - [ ] "견적 요청" 클릭 시 MANAGER_EMAIL로 이메일 수신

- [ ] **Step 4: 최종 커밋**

```bash
git add docs/
git commit -m "docs: 설계 문서 및 구현 계획"
```
