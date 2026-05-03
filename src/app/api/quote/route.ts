import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { QuoteRequest } from '@/types/quote';

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
      ? `<ul style="padding-left:16px">${refs
        .filter((r) => {
          try { const u = new URL(r); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
        })
        .map((r) => `<li><a href="${escapeHtml(r)}">${escapeHtml(r)}</a></li>`)
        .join('')}</ul>`
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
