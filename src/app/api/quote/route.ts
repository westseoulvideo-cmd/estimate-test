import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { QuoteInput } from '@/types/quote';
import { calculateQuote } from '@/lib/pricing';

interface LocalQuoteRequest {
  clientName: string;
  refs: string[];
  input: QuoteInput;
}

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  let body: LocalQuoteRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 });
  }

  const { clientName, refs, input } = body;
  if (!clientName?.trim()) {
    return NextResponse.json({ error: '고객명이 누락되었습니다' }, { status: 400 });
  }

  const { shootingCount, editMinutes, extraCrew, drone } = input ?? {};
  if (
    !Number.isFinite(shootingCount) || shootingCount < 0 ||
    !Number.isFinite(editMinutes) || editMinutes < 0 ||
    !Number.isFinite(extraCrew) || extraCrew < 0 ||
    typeof drone !== 'boolean'
  ) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다' }, { status: 400 });
  }

  const result = calculateQuote(input);

  const validRefs = (refs ?? []).slice(0, 20).filter((r) => {
    try { const u = new URL(r); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  });
  const refsHtml = validRefs.length > 0
    ? `<ul style="padding-left:16px">${validRefs.map((r) => `<li><a href="${escapeHtml(r)}">${escapeHtml(r)}</a></li>`).join('')}</ul>`
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
      <p><strong>고객명:</strong> ${escapeHtml(clientName)}</p>
      <h3 style="font-size:14px;color:#666;margin-top:24px">견적 내용</h3>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
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
      subject: `[견적 요청] ${clientName}`,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[quote API error]', err);
    return NextResponse.json({ error: '이메일 전송 중 오류가 발생했습니다' }, { status: 500 });
  }
}
