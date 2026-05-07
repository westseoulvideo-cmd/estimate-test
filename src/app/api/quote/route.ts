import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ClientInfo, QuoteInput } from '@/types/quote';
import { calculateQuote, SHOOTING_LABELS, TRAVEL_LABELS, INTRO_OUTRO_LABELS } from '@/lib/pricing';

interface QuoteRequest {
  clientInfo: ClientInfo;
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
  let body: QuoteRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 });
  }

  const { clientInfo, input } = body;
  if (!clientInfo?.name?.trim()) {
    return NextResponse.json({ error: '이름이 누락되었습니다' }, { status: 400 });
  }
  if (!clientInfo?.contact?.trim()) {
    return NextResponse.json({ error: '연락처가 누락되었습니다' }, { status: 400 });
  }

  const {
    shootingCount, compositionMinutes, editMinutes,
    shortsMinutes, aiVideoMinutes, episodeCount,
  } = input ?? {};

  if (
    !Number.isFinite(shootingCount) || shootingCount < 0 ||
    !Number.isFinite(compositionMinutes) || compositionMinutes < 0 ||
    !Number.isFinite(editMinutes) || editMinutes < 0 ||
    !Number.isFinite(shortsMinutes) || shortsMinutes < 0 ||
    !Number.isFinite(aiVideoMinutes) || aiVideoMinutes < 0 ||
    !Number.isFinite(episodeCount) || episodeCount < 1
  ) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다' }, { status: 400 });
  }

  const result = calculateQuote(input);

  const validRefs = (clientInfo.refs ?? []).slice(0, 20).filter((r) => {
    try { const u = new URL(r); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  });
  const refsHtml = validRefs.length > 0
    ? `<ul style="padding-left:16px">${validRefs.map((r) => `<li><a href="${escapeHtml(r)}">${escapeHtml(r)}</a></li>`).join('')}</ul>`
    : '<p style="color:#999">없음</p>';

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

  const itemRows = lineItems.map((item, i) =>
    `<tr><td style="padding:4px 8px;color:#666">${i + 1}. ${escapeHtml(item.label)}</td><td style="padding:4px 8px;text-align:right">${formatWon(item.amount)}</td></tr>`
  ).join('');

  const travelRow = result.isTravelNegotiable
    ? `<tr><td style="padding:4px 8px;color:#666">${lineItems.length + 1}. 출장비 (해외)</td><td style="padding:4px 8px;text-align:right;color:#d97706">별도협의</td></tr>`
    : '';

  const episodeRow = input.episodeCount > 1
    ? `<tr><td style="padding:4px 8px;color:#666">소계 × ${input.episodeCount}편</td><td style="padding:4px 8px;text-align:right">${formatWon(result.subtotal)}</td></tr>`
    : '';

  const discountRow = result.discount > 0
    ? `<tr><td style="padding:4px 8px;color:#666">할인 (−5%)</td><td style="padding:4px 8px;text-align:right">−${formatWon(result.discount)}</td></tr>`
    : '';

  const rows = [
    itemRows,
    travelRow,
    episodeRow,
    discountRow,
    `<tr style="border-top:1px solid #eee"><td style="padding:8px;font-weight:bold">합계</td><td style="padding:8px;text-align:right;font-weight:bold">${formatWon(result.total)}</td></tr>`,
  ].join('');

  const clientRows = [
    ['이름', [clientInfo.name, clientInfo.position, clientInfo.department].filter(Boolean).join(' / ')],
    ['회사', clientInfo.company],
    ['연락처', clientInfo.contact],
    ['사업명', clientInfo.projectName],
    ['일시', clientInfo.projectDate],
    ['장소', clientInfo.projectLocation],
  ].filter(([, v]) => v).map(([label, value]) =>
    `<tr><td style="padding:2px 8px;color:#666;width:60px">${escapeHtml(label)}</td><td style="padding:2px 8px">${escapeHtml(value)}</td></tr>`
  ).join('');

  const requirementsSection = clientInfo.requirements
    ? `<h3 style="font-size:14px;color:#666;margin-top:24px">요청사항</h3><p style="white-space:pre-wrap">${escapeHtml(clientInfo.requirements)}</p>`
    : '';

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="font-size:18px;font-weight:500;border-bottom:1px solid #eee;padding-bottom:8px">견적 요청</h2>
      <table style="width:100%;border-collapse:collapse">${clientRows}</table>
      ${requirementsSection}
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
      subject: `[견적 요청] ${clientInfo.name}`,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[quote API error]', err);
    return NextResponse.json({ error: '이메일 전송 중 오류가 발생했습니다' }, { status: 500 });
  }
}
