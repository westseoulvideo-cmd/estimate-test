# 설계 문서: 견적 요청 이메일 수신 설정

**날짜:** 2026-05-05
**상태:** 승인됨

## 목표

거래처가 견적 요청을 제출하면 관리자 이메일(`cky4120@cpropa.com`)로 알림 메일이 발송되도록 환경변수를 설정한다.

## 현황 분석

- `src/app/api/quote/route.ts`에 Resend 이메일 발송 로직이 완전히 구현되어 있다.
- `.env.local` 파일이 없어 환경변수가 누락된 상태 → API 호출 시 500 에러 발생.
- 코드 변경 없이 `.env.local` 생성만으로 동작 가능.

## 설계

### 환경변수 설정 (`.env.local`)

| 키 | 값 | 설명 |
|---|---|---|
| `RESEND_API_KEY` | `re_2SQmBrw9_...` | Resend 신규 발급 키 |
| `SENDER_EMAIL` | `noreply@cpropa.com` | 발신자 주소 (Resend 인증 필요) |
| `MANAGER_EMAIL` | `cky4120@cpropa.com` | 수신 관리자 주소 |

### 데이터 흐름

```
거래처 견적 요청
  → POST /api/quote
  → Resend API (RESEND_API_KEY)
  → 발신: noreply@cpropa.com
  → 수신: cky4120@cpropa.com
```

### 이메일 내용

현재 구현된 템플릿 그대로 사용:
- 제목: `[견적 요청] {고객명}`
- 본문: 고객명, 촬영 횟수/편집 시간/드론/추가 인원, 합계 금액, 레퍼런스 링크

## 선행 조건

Resend 대시보드에서 `cpropa.com` 도메인 인증 완료 필요:
1. Resend → Domains → Add Domain → `cpropa.com` 입력
2. DNS TXT/MX 레코드 등록 (도메인 호스팅 제공사에서)
3. 인증 완료 후 `noreply@cpropa.com` 발신 가능

## 범위 외

- 코드 리팩토링 (lib/email.ts 분리 등)
- 이메일 템플릿 디자인 변경
- 거래처 확인 이메일 발송
