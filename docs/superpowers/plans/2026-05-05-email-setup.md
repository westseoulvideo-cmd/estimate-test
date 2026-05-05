# 이메일 수신 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 거래처 견적 요청 시 관리자 이메일(`cky4120@cpropa.com`)로 알림 메일이 발송되도록 환경변수를 설정한다.

**Architecture:** 코드 변경 없음. `.env.local` 파일 생성으로 기존 구현된 `/api/quote` Resend 이메일 로직을 활성화한다. 발신자 도메인(`cpropa.com`)은 Resend에서 사전 인증이 필요하다.

**Tech Stack:** Resend (이메일 발송), Next.js 환경변수 (`.env.local`)

---

### Task 1: Resend 도메인 인증

**Files:**
- 없음 (Resend 대시보드 웹 작업)

- [ ] **Step 1: Resend 대시보드에서 도메인 추가**

  브라우저에서 [resend.com/domains](https://resend.com/domains) 접속 →
  **Add Domain** 클릭 → `cpropa.com` 입력 → **Add** 클릭

- [ ] **Step 2: DNS 레코드 등록**

  Resend가 제공하는 레코드를 `cpropa.com` 도메인 호스팅 제공사 DNS 설정에 추가한다.
  일반적으로 아래 형태의 레코드 2-3개가 제공됨:

  | 타입 | 이름 | 값 |
  |------|------|----|
  | TXT | `resend._domainkey.cpropa.com` | `p=...` (Resend 제공값) |
  | MX | `send.cpropa.com` | `feedback-smtp.us-east-1.amazonses.com` |
  | TXT | `send.cpropa.com` | `v=spf1 include:amazonses.com ~all` |

  > DNS 전파는 최대 48시간 소요될 수 있으나 보통 수분~수십 분 내 완료됨.

- [ ] **Step 3: 인증 확인**

  Resend 대시보드 Domains 목록에서 `cpropa.com` 상태가 **Verified**로 변경되면 완료.

---

### Task 2: `.env.local` 파일 생성

**Files:**
- Create: `.env.local` (gitignore에 포함됨 — 절대 커밋하지 않음)

- [ ] **Step 1: `.env.local` 파일 생성**

  프로젝트 루트(`C:\견적서 연습\`)에 아래 내용으로 `.env.local` 파일을 생성한다:

  ```env
  RESEND_API_KEY=re_2SQmBrw9_pk1StwRdtY1AtsSL6AjSJ7PU
  SENDER_EMAIL=noreply@cpropa.com
  MANAGER_EMAIL=cky4120@cpropa.com
  ```

- [ ] **Step 2: 환경변수 로드 확인**

  개발 서버를 실행한다:

  ```bash
  npm run dev
  ```

  서버 시작 로그에 에러 없이 `http://localhost:3000` 접속 가능하면 정상.

---

### Task 3: 이메일 발송 동작 검증

**Files:**
- 없음 (브라우저/curl 테스트)

- [ ] **Step 1: curl로 API 직접 호출**

  새 터미널에서 실행 (개발 서버 실행 중이어야 함):

  ```bash
  curl -X POST http://localhost:3000/api/quote \
    -H "Content-Type: application/json" \
    -d '{
      "clientName": "테스트 거래처",
      "refs": ["https://example.com"],
      "input": {
        "shootingCount": 2,
        "editMinutes": 30,
        "extraCrew": 0,
        "drone": false
      }
    }'
  ```

  **기대 응답:**
  ```json
  { "success": true }
  ```

- [ ] **Step 2: 수신 확인**

  `cky4120@cpropa.com` 받은 편지함에서 제목 `[견적 요청] 테스트 거래처` 메일 수신 확인.

- [ ] **Step 3: 실패 시 확인 사항**

  응답이 `{ "error": "서버 설정 오류입니다" }` (500)이면 → 환경변수 누락. `.env.local` 경로/내용 재확인.

  응답이 `{ "error": "이메일 전송 중 오류가 발생했습니다" }` (500)이면 → Resend API 키 또는 도메인 미인증. Resend 대시보드에서 도메인 Verified 상태 확인.

  서버 로그(`npm run dev` 터미널)의 `[quote API error]` 메시지로 상세 원인 확인 가능.
