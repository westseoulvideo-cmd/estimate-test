# 견적서 세부화 설계

**날짜:** 2026-05-07  
**상태:** 승인됨

---

## 개요

기존 단순 견적 계산기를 Excel 기반 세부 항목 + 고객 정보 입력 + 견적서 이미지 개선으로 확장한다.

---

## 섹션 1: 데이터 모델 & 가격 구조

### 타입 (`src/types/quote.ts`)

```typescript
export type ShootingType = 'photo' | 'video' | 'photo+video';
export type ShootingHours = '4h' | '8h';
export type TravelLocation = 'seoul' | 'chungcheong' | 'jeonla' | 'jeju' | 'overseas';
export type IntroOutroType = 'none' | 'free' | 'premium';

export interface ClientInfo {
  name: string;            // 이름 (필수)
  position: string;        // 직책
  department: string;      // 부서
  contact: string;         // 연락처 (필수)
  company: string;         // 회사
  projectName: string;     // 사업명
  projectDate: string;     // 사업일시
  projectLocation: string; // 사업장소
  requirements: string;    // 요청사항
  quoteDate: string;       // 견적일 (사용자 직접 입력, 필수)
  refs: string[];          // 레퍼런스 링크 (복수)
}

export interface QuoteInput {
  shootingType: ShootingType;
  shootingHours: ShootingHours;       // 4시간 이하 / 8시간
  aerial: boolean;                    // 항공촬영 (+20%)
  shootingCount: number;              // 촬영 횟수
  compositionMinutes: number;         // 구성 (분, 100,000원/분)
  travelLocation: TravelLocation;     // 출장 지역
  editMinutes: number;                // 편집 (분)
  entertainmentEffect: boolean;       // 편집 예능형효과
  shortsMinutes: number;              // 쇼츠 편집 (분)
  shortsEntertainmentEffect: boolean; // 쇼츠 예능형효과
  introOutro: IntroOutroType;         // 인트로/아웃트로
  aiVideoMinutes: number;             // AI 동영상 제작 (분)
  episodeCount: number;               // 편수 (최소 1, 소계에 곱함)
  additionalWork: boolean;            // 추가작업 후속계약 할인 5%
}

export interface QuoteResult {
  shootingFee: number;
  compositionFee: number;
  travelFee: number;
  editingFee: number;
  shortsEditingFee: number;
  introOutroFee: number;
  aiVideoFee: number;
  subtotalPerEpisode: number; // 편수 적용 전 소계
  subtotal: number;           // × 편수
  discount: number;           // 5% 할인액
  total: number;              // 최종 합계
  isTravelNegotiable: boolean; // 해외 출장비 별도협의 여부
}
```

### 가격표 (`src/lib/pricing.ts`)

#### 촬영 단가

| 촬영 타입 | 4시간 이하 (일반) | 4시간 이하 (항공) | 8시간 (일반) | 8시간 (항공) |
|---|---|---|---|---|
| 사진 | 300,000원 | 360,000원 | 500,000원 | 600,000원 |
| 비디오 | 300,000원 | 360,000원 | 500,000원 | 600,000원 |
| 사진+비디오 | 400,000원 | 480,000원 | 700,000원 | 840,000원 |

항공촬영 = 기본 단가 × 1.2 (모든 타입 공통)

#### 기타 단가

| 항목 | 단가 |
|---|---|
| 구성 | 100,000원/분 |
| 출장비 서울·인천·경기 | 0원 |
| 출장비 충청·강원 | 50,000원 |
| 출장비 전라·경상 | 100,000원 |
| 출장비 제주 | 200,000원 |
| 출장비 해외 | 별도협의 (합계 미포함) |
| 편집 일반 | 100,000원/분 |
| 편집 예능형효과 | 120,000원/분 |
| 쇼츠 편집 일반 | 50,000원/분 |
| 쇼츠 편집 예능형효과 | 60,000원/분 |
| 무료 인트로/아웃트로 | 100,000원 (고정) |
| 고급 인트로/아웃트로 | 100,000원 (고정) |
| AI 동영상 제작 | 100,000원/분 |
| 추가작업 후속계약 할인 | −5% |

#### 계산 순서

```
각 항목별 금액 산출 (촬영 + 구성 + 출장 + 편집 + 쇼츠 + 인트로/아웃트로 + AI영상)
→ subtotalPerEpisode (편수 적용 전 소계)
→ × episodeCount = subtotal
→ − discount (additionalWork ? subtotal × 0.05 : 0)
= total
```

---

## 섹션 2: 폼 UX 흐름

### 공통

- 상단 진행 표시: `1/2 의뢰인 정보` → `2/2 견적 항목`
- 접근법: 단일 `page.tsx`에서 `step` 상태(1 | 2)로 전환

### 1단계: 의뢰인 정보

| 필드 | 타입 | 필수 |
|---|---|---|
| 이름 | 텍스트 | ✓ |
| 직책 | 텍스트 | |
| 부서 | 텍스트 | |
| 연락처 | 텍스트 | ✓ |
| 회사 | 텍스트 | |
| 사업명 | 텍스트 | |
| 사업일시 | 텍스트 | |
| 사업장소 | 텍스트 | |
| 견적일 | date input | ✓ |
| 요청사항 | textarea | |
| 레퍼런스 링크 | URL (복수 추가) | |

- 하단 **"다음 →"** 버튼: 이름/연락처/견적일 미입력 시 비활성

### 2단계: 견적 항목

좌측 입력 패널 / 우측 견적서 미리보기 (md:grid-cols-2 유지)

**입력 순서:**
1. 촬영 타입 (사진 / 비디오 / 사진+비디오) — 버튼 그룹
2. 촬영 시간 (4시간 이하 / 8시간) — 토글
3. 항공촬영 (포함/미포함) — 토글, 단가 즉시 반영
4. 촬영 횟수 — 숫자 입력 (기본 1)
5. 구성 (분) — 숫자 입력
6. 출장 지역 — 드롭다운 (해외 선택 시 "별도협의" 안내)
7. 편집 (분) + 예능형효과 토글
8. 쇼츠 편집 (분) + 예능형효과 토글
9. 인트로/아웃트로 (없음 / 무료+10만 / 고급+10만) — 버튼 그룹
10. AI 동영상 제작 (분)
11. 편수 — 숫자 입력 (기본 1)
12. 추가작업 후속계약 할인 — 토글 (−5%)

하단 버튼: **"← 이전"** / **"견적 요청"** / **"PNG 저장"**

### 우측 견적서 미리보기 레이아웃

```
┌─────────────────────────────────────┐
│  [로고]           견  적  서        │  ← 검정 헤더
├─────────────────────────────────────┤
│  종합선전                           │
│  사업자등록번호: 102-88-03086        │
│  이메일: cky4120@cpropa.com         │
│  견적일: YYYY년 MM월 DD일           │
├──────────┬──────────────────────────┤
│  수신    │  홍길동 (CEO / 마케팅팀)  │
│  회사    │  (주)OO                  │
│  연락처  │  010-XXXX-XXXX           │
│  사업명  │  브랜드 홍보영상          │
│  일시    │  2026.06.01              │
│  장소    │  서울                    │
├──────────┴──────────────────────────┤
│  요청사항                           │
│  (요청사항 내용)                    │
├─────────────────────────────────────┤
│  No │ 항목              │    금액   │
│   1 │ 비디오 촬영 (1회)  │  500,000 │
│   2 │ 항공촬영           │  100,000 │
│   3 │ 편집 5분 (예능)    │  600,000 │
│   4 │ 쇼츠 편집 3분      │  150,000 │
│  ...│                   │          │
├─────────────────────────────────────┤
│               × 2편     2,700,000  │
│         할인 (5%)        -135,000  │
│               합계      2,565,000  │
└─────────────────────────────────────┘
         [워터마크: 로고 중앙 반투명]
```

- 워터마크: `public/logo-white.png` → `filter: invert(1)`, `opacity: 0.08`, 중앙 절대 배치
- 로고 헤더: 검정 배경에 흰색 로고

---

## 섹션 3: API & 이메일

### API 라우트 (`src/app/api/quote/route.ts`)

**입력 검증:**
- `clientInfo.name`, `clientInfo.contact`, `clientInfo.quoteDate` 필수
- `shootingHours`: `'4h' | '8h'` 유효값 확인
- `shootingType`: `'photo' | 'video' | 'photo+video'` 유효값 확인
- `travelLocation`: 5개 지역 유효값 확인
- `introOutro`: `'none' | 'free' | 'premium'` 유효값 확인
- `episodeCount` ≥ 1
- 수치 필드 전체 `Number.isFinite` + 음수 불가 검증

**이메일 구성:**
- 의뢰인 정보 섹션 (이름/직책/부서/연락처/회사/사업명/일시/장소/견적일/요청사항/레퍼런스)
- 견적 내용 섹션 (항목별 금액 테이블, 편수 × 소계, 할인, 최종 합계)
- 해외 출장비 선택 시 "별도협의" 문구 포함

### 회사 정보 상수

```typescript
export const COMPANY = {
  name: '종합선전',
  bizNo: '102-88-03086',
  email: 'cky4120@cpropa.com',
} as const;
```

---

## 변경 파일 요약

| 파일 | 변경 내용 |
|---|---|
| `src/types/quote.ts` | 전면 재작성 |
| `src/lib/pricing.ts` | 전면 재작성 |
| `src/app/page.tsx` | 전면 재작성 (2단계 폼) |
| `src/app/api/quote/route.ts` | 검증 + 이메일 템플릿 업데이트 |
| `public/logo-white.png` | `프로파간다 로고 흰색.png` 복사 |
