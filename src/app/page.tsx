'use client';

import { useState, useRef, useMemo } from 'react';
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

function formatProjectDate(d: string) {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-');
    return `${y}.${m}.${day}`;
  }
  return d;
}

const defaultClient: Omit<ClientInfo, 'refs'> = {
  name: '', position: '', department: '', contact: '',
  company: '', projectName: '', projectDate: '', projectLocation: '',
  requirements: '', quoteDate: new Date().toISOString().split('T')[0],
};

const defaultInput: QuoteInput = {
  shootingType: 'video', shootingHours: '8h', aerial: false,
  shootingCount: 1, shootingPersonCount: 1,
  compositionMinutes: 0, travelLocation: 'seoul',
  editMinutes: 0, entertainmentEffect: false,
  shortsEpisodes: 0, shortsEntertainmentEffect: false,
  introOutro: 'basic', aiVideoMinutes: 0, episodeCount: 1, additionalWork: false,
};

export default function Home() {
  const [step, setStep] = useState<1 | 2>(1);
  const [clientInfo, setClientInfo] = useState<Omit<ClientInfo, 'refs'>>(defaultClient);
  const [refs, setRefs] = useState<{ id: number; value: string }[]>([{ id: 0, value: '' }]);
  const nextRefId = useRef(1);
  const [input, setInput] = useState<QuoteInput>(defaultInput);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const quoteRef = useRef<HTMLDivElement>(null);

  const result = useMemo(() => calculateQuote(input), [input]);
  const step1Valid = !!(clientInfo.name.trim() && clientInfo.contact.trim() && clientInfo.quoteDate);

  const setClient = (field: keyof Omit<ClientInfo, 'refs'>, value: string) => {
    setClientInfo(prev => ({ ...prev, [field]: value }));
    setSent(false);
  };

  const setRef = (i: number, v: string) => {
    setRefs(prev => prev.map((r, idx) => idx === i ? { ...r, value: v } : r));
  };
  const addRef = () => {
    setRefs(prev => [...prev, { id: nextRefId.current++, value: '' }]);
  };
  const removeRef = (i: number) => {
    setRefs(prev => prev.filter((_, idx) => idx !== i));
  };

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
        body: JSON.stringify({ clientInfo: { ...clientInfo, refs: refs.map(r => r.value) }, input }),
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

  const lineItems = useMemo(() => {
    const items: { label: string; amount: number }[] = [];
    if (result.shootingFee > 0) items.push({
      label: `${SHOOTING_LABELS[input.shootingType]} 촬영 (${input.shootingHours === '4h' ? '4시간 이하' : '8시간'}${input.aerial ? ', 항공' : ''}, ${input.shootingPersonCount}인) × ${input.shootingCount}회`,
      amount: result.shootingFee,
    });
    if (result.compositionFee > 0) items.push({ label: `기획서 제작 (${input.compositionMinutes}분)`, amount: result.compositionFee });
    if (!result.isTravelNegotiable && result.travelFee > 0) items.push({ label: `출장비 (${TRAVEL_LABELS[input.travelLocation]})`, amount: result.travelFee });
    if (result.editingFee > 0) items.push({ label: `편집 분량 (${input.editMinutes}분${input.entertainmentEffect ? ', 예능형 편집' : ''})`, amount: result.editingFee });
    if (result.shortsEditingFee > 0) items.push({ label: `쇼츠 편집 (${input.shortsEpisodes}편${input.shortsEntertainmentEffect ? ', 예능형 편집' : ''})`, amount: result.shortsEditingFee });
    if (result.introOutroFee > 0) items.push({ label: INTRO_OUTRO_LABELS[input.introOutro], amount: result.introOutroFee });
    if (result.aiVideoFee > 0) items.push({ label: `AI 동영상 제작 (${input.aiVideoMinutes}분)`, amount: result.aiVideoFee });
    return items;
  }, [result, input]);

  return (
    <main className="min-h-screen bg-white">
      <header className="py-5 px-6 border-b border-gray-100">
        <div className="relative flex items-center justify-center">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="absolute left-0 text-sm text-gray-500 hover:text-black transition-colors"
            >
              ← 이전
            </button>
          )}
          <h1 className="text-lg tracking-widest font-light">견적서 계산기</h1>
        </div>
        <div className="flex justify-center gap-6 mt-2">
          {[1, 2].map(s => (
            <span key={s} className={`text-xs tracking-widest ${step === s ? 'text-black font-medium' : 'text-gray-300'}`}>
              {s === 1 ? '01 의뢰인 정보' : '02 견적 항목'}
            </span>
          ))}
        </div>
      </header>

      {step === 1 && (
        <Step1
          clientInfo={clientInfo}
          refs={refs}
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
          step1Valid={step1Valid}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
          onSave={handleSave}
        />
      )}
    </main>
  );
}

function Step1({
  clientInfo, refs, setClient, setRef, addRef, removeRef, onNext, valid,
}: {
  clientInfo: Omit<ClientInfo, 'refs'>;
  refs: { id: number; value: string }[];
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
        <Field label="사업 시작 일시">
          <input type="date" className={inputClass} value={clientInfo.projectDate} onChange={e => setClient('projectDate', e.target.value)} />
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
          {refs.map((r, i) => (
            <div key={r.id} className="flex gap-2">
              <input
                className={`${inputClass} flex-1`}
                value={r.value}
                onChange={e => setRef(i, e.target.value)}
                placeholder="https://youtube.com/..."
                type="url"
              />
              {refs.length > 1 && (
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

function Step2({
  input, setQ, result, clientInfo, lineItems, quoteRef,
  sending, sent, error, step1Valid, onBack, onSubmit, onSave,
}: {
  input: QuoteInput;
  setQ: (u: Partial<QuoteInput>) => void;
  result: QuoteResult;
  clientInfo: Omit<ClientInfo, 'refs'>;
  lineItems: { label: string; amount: number }[];
  quoteRef: React.RefObject<HTMLDivElement | null>;
  sending: boolean;
  sent: boolean;
  error: string;
  step1Valid: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onSave: () => void;
}) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-2 gap-10">

      {/* Left: Excel-style quote input table */}
      <section>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-50 px-2 py-2 text-center text-xs text-gray-500 font-medium w-7">No</th>
              <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left text-xs text-gray-500 font-medium w-24">항목</th>
              <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left text-xs text-gray-500 font-medium">설정</th>
              <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-right text-xs text-gray-500 font-medium w-28">금액</th>
            </tr>
          </thead>
          <tbody>

            {/* 1. 촬영 */}
            <tr>
              <td className="border border-gray-200 px-2 py-3 text-center text-xs text-gray-400 align-top">1</td>
              <td className="border border-gray-200 px-3 py-3 text-gray-700 align-top font-medium text-xs">촬영</td>
              <td className="border border-gray-200 px-3 py-3">
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {(['photo', 'video', 'photo+video'] as ShootingType[]).map(t => (
                      <button key={t} type="button" onClick={() => setQ({ shootingType: t })}
                        className={`flex-1 py-1 border text-xs transition-colors ${input.shootingType === t ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
                        {SHOOTING_LABELS[t]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {([['4h', '4시간 이하'], ['8h', '8시간']] as [ShootingHours, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => setQ({ shootingHours: val })}
                        className={`flex-1 py-1 border text-xs transition-colors ${input.shootingHours === val ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
                        {label}
                      </button>
                    ))}
                    <button type="button" onClick={() => setQ({ aerial: !input.aerial })}
                      className={`px-2 py-1 border text-xs transition-colors whitespace-nowrap ${input.aerial ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
                      항공 ×1.2
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">횟수</span>
                      <NumberInput value={input.shootingCount} onChange={v => setQ({ shootingCount: v })} min={0} />
                      <span className="text-xs text-gray-400">회</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">인원</span>
                      <NumberInput value={input.shootingPersonCount} onChange={v => setQ({ shootingPersonCount: Math.max(1, v) })} min={1} />
                      <span className="text-xs text-gray-400">명</span>
                    </span>
                  </div>
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 text-right tabular-nums align-top text-sm">
                {result.shootingFee > 0 ? formatWon(result.shootingFee) : <span className="text-gray-300">—</span>}
              </td>
            </tr>

            {/* 2. 기획서 제작 */}
            <tr>
              <td className="border border-gray-200 px-2 py-3 text-center text-xs text-gray-400 align-top">2</td>
              <td className="border border-gray-200 px-3 py-3 text-gray-700 align-top font-medium text-xs">기획서 제작</td>
              <td className="border border-gray-200 px-3 py-3">
                <div className="flex items-center gap-2">
                  <NumberInput value={input.compositionMinutes} onChange={v => setQ({ compositionMinutes: v })} min={0} />
                  <span className="text-xs text-gray-400">분 (10만/분)</span>
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 text-right tabular-nums align-top text-sm">
                {result.compositionFee > 0 ? formatWon(result.compositionFee) : <span className="text-gray-300">—</span>}
              </td>
            </tr>

            {/* 3. 출장 */}
            <tr>
              <td className="border border-gray-200 px-2 py-3 text-center text-xs text-gray-400 align-top">3</td>
              <td className="border border-gray-200 px-3 py-3 text-gray-700 align-top font-medium text-xs">출장</td>
              <td className="border border-gray-200 px-3 py-3">
                <select
                  className="w-full border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:border-black bg-white"
                  value={input.travelLocation}
                  onChange={e => setQ({ travelLocation: e.target.value as TravelLocation })}
                >
                  <option value="seoul">서울 (출장비 없음)</option>
                  <option value="incheon">인천 (출장비 없음)</option>
                  <option value="gyeonggi">경기 (출장비 없음)</option>
                  <option value="chungcheong">충청 (+50,000원)</option>
                  <option value="gangwon">강원 (+50,000원)</option>
                  <option value="jeonla">전라 (+100,000원)</option>
                  <option value="gyeongsang">경상 (+100,000원)</option>
                  <option value="jeju">제주 (+200,000원)</option>
                  <option value="overseas">해외 (별도협의)</option>
                </select>
                {input.travelLocation === 'overseas' && (
                  <p className="text-xs text-amber-600 mt-1">해외 출장비는 별도 협의됩니다</p>
                )}
              </td>
              <td className="border border-gray-200 px-3 py-3 text-right tabular-nums align-top text-sm">
                {result.isTravelNegotiable ? (
                  <span className="text-amber-600 text-xs">별도협의</span>
                ) : result.travelFee > 0 ? formatWon(result.travelFee) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>

            {/* 4. 편집 분량 */}
            <tr>
              <td className="border border-gray-200 px-2 py-3 text-center text-xs text-gray-400 align-top">4</td>
              <td className="border border-gray-200 px-3 py-3 text-gray-700 align-top font-medium text-xs">편집 분량</td>
              <td className="border border-gray-200 px-3 py-3">
                <div className="flex items-center gap-2">
                  <NumberInput value={input.editMinutes} onChange={v => setQ({ editMinutes: v })} min={0} />
                  <span className="text-xs text-gray-400">분</span>
                  <button type="button" onClick={() => setQ({ entertainmentEffect: !input.entertainmentEffect })}
                    className={`px-2 py-1 border text-xs transition-colors whitespace-nowrap ${input.entertainmentEffect ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
                    예능형 편집
                  </button>
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 text-right tabular-nums align-top text-sm">
                {result.editingFee > 0 ? formatWon(result.editingFee) : <span className="text-gray-300">—</span>}
              </td>
            </tr>

            {/* 5. 쇼츠 편집 */}
            <tr>
              <td className="border border-gray-200 px-2 py-3 text-center text-xs text-gray-400 align-top">5</td>
              <td className="border border-gray-200 px-3 py-3 text-gray-700 align-top font-medium text-xs">쇼츠 편집</td>
              <td className="border border-gray-200 px-3 py-3">
                <div className="flex items-center gap-2">
                  <NumberInput value={input.shortsEpisodes} onChange={v => setQ({ shortsEpisodes: v })} min={0} />
                  <span className="text-xs text-gray-400">편</span>
                  <button type="button" onClick={() => setQ({ shortsEntertainmentEffect: !input.shortsEntertainmentEffect })}
                    className={`px-2 py-1 border text-xs transition-colors whitespace-nowrap ${input.shortsEntertainmentEffect ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
                    예능형 편집
                  </button>
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 text-right tabular-nums align-top text-sm">
                {result.shortsEditingFee > 0 ? formatWon(result.shortsEditingFee) : <span className="text-gray-300">—</span>}
              </td>
            </tr>

            {/* 6. 인트로/아웃트로 */}
            <tr>
              <td className="border border-gray-200 px-2 py-3 text-center text-xs text-gray-400 align-top">6</td>
              <td className="border border-gray-200 px-3 py-3 text-gray-700 align-top font-medium text-xs">인트로/<br />아웃트로</td>
              <td className="border border-gray-200 px-3 py-3">
                <div className="flex gap-1">
                  {(['basic', 'premium'] as IntroOutroType[]).map(t => (
                    <button key={t} type="button" onClick={() => setQ({ introOutro: t })}
                      className={`flex-1 py-1 border text-xs transition-colors ${input.introOutro === t ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
                      {t === 'basic' ? '기본효과 (0원)' : '고급 (+10만)'}
                    </button>
                  ))}
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 text-right tabular-nums align-top text-sm">
                {result.introOutroFee > 0 ? formatWon(result.introOutroFee) : <span className="text-gray-300">—</span>}
              </td>
            </tr>

            {/* 7. AI 동영상 */}
            <tr>
              <td className="border border-gray-200 px-2 py-3 text-center text-xs text-gray-400 align-top">7</td>
              <td className="border border-gray-200 px-3 py-3 text-gray-700 align-top font-medium text-xs">AI 동영상</td>
              <td className="border border-gray-200 px-3 py-3">
                <div className="flex items-center gap-2">
                  <NumberInput value={input.aiVideoMinutes} onChange={v => setQ({ aiVideoMinutes: v })} min={0} />
                  <span className="text-xs text-gray-400">분 (10만/분)</span>
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 text-right tabular-nums align-top text-sm">
                {result.aiVideoFee > 0 ? formatWon(result.aiVideoFee) : <span className="text-gray-300">—</span>}
              </td>
            </tr>

            {/* 8. 편수 */}
            <tr className="bg-gray-50/60">
              <td className="border border-gray-200 px-2 py-3 text-center text-xs text-gray-400 align-top">8</td>
              <td className="border border-gray-200 px-3 py-3 text-gray-700 align-top font-medium text-xs">편수</td>
              <td className="border border-gray-200 px-3 py-3">
                <div className="flex items-center gap-2">
                  <NumberInput value={input.episodeCount} onChange={v => setQ({ episodeCount: Math.max(1, v) })} min={1} />
                  <span className="text-xs text-gray-400">편</span>
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 text-right tabular-nums align-top text-sm text-gray-600">
                {input.episodeCount > 1 ? `×${input.episodeCount}편` : <span className="text-gray-300">—</span>}
              </td>
            </tr>

            {/* 9. 추가작업 할인 */}
            <tr className="bg-gray-50/60">
              <td className="border border-gray-200 px-2 py-3 text-center text-xs text-gray-400 align-top">9</td>
              <td className="border border-gray-200 px-3 py-3 text-gray-700 align-top font-medium text-xs">추가작업<br />할인</td>
              <td className="border border-gray-200 px-3 py-3">
                <button type="button" onClick={() => setQ({ additionalWork: !input.additionalWork })}
                  className={`px-4 py-1 border text-xs transition-colors ${input.additionalWork ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
                  {input.additionalWork ? '적용 중' : '미적용'}
                </button>
              </td>
              <td className="border border-gray-200 px-3 py-3 text-right tabular-nums align-top text-sm text-gray-600">
                {input.additionalWork ? '−5%' : <span className="text-gray-300">—</span>}
              </td>
            </tr>

          </tbody>
        </table>

        <div className="flex gap-3 mt-4">
          <button onClick={onBack}
            className="py-3 px-5 border border-gray-300 text-sm hover:border-black transition-colors">
            ← 이전
          </button>
          <button onClick={onSubmit} disabled={sending || !step1Valid}
            className="flex-1 py-3 bg-black text-white text-sm tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {sending ? '전송 중...' : '견적 요청'}
          </button>
          <button onClick={onSave}
            className="flex-1 py-3 border border-black text-sm tracking-widest hover:bg-gray-50 transition-colors">
            PNG 저장
          </button>
        </div>

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        {sent && <p className="text-xs text-green-600 mt-2">견적 요청이 전송되었습니다.</p>}
      </section>

      {/* Right: Quote preview */}
      <section>
        <div ref={quoteRef} className="relative border border-gray-200 bg-white overflow-hidden">

          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-transparent.png" alt="" style={{ width: '60%', opacity: 0.06 }} />
          </div>

          {/* Header */}
          <div className="relative z-10 bg-black text-white px-6 py-4 flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-transparent.png" alt="로고" style={{ height: '26px', filter: 'brightness(0) invert(1)' }} />
            <span className="text-base tracking-[0.35em] font-light">견  적  서</span>
          </div>

          {/* Company info */}
          <div className="relative z-10 px-6 pt-4 pb-3 border-b border-gray-100 space-y-0.5 text-xs text-gray-600">
            <p className="font-semibold text-sm text-gray-900">{COMPANY.name}</p>
            <p>사업자등록번호: {COMPANY.bizNo}</p>
            <p>이메일: {COMPANY.email}</p>
            <p>견적일: {formatQuoteDate(clientInfo.quoteDate)}</p>
          </div>

          {/* Client info */}
          <div className="relative z-10 px-6 py-3 border-b border-gray-100">
            <table className="w-full text-xs">
              <tbody>
                {([
                  ['수신', [clientInfo.name, clientInfo.position, clientInfo.department].filter(Boolean).join(' / ')],
                  ['회사', clientInfo.company],
                  ['연락처', clientInfo.contact],
                  ['사업명', clientInfo.projectName],
                  ['일시', formatProjectDate(clientInfo.projectDate)],
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

          {/* Requirements */}
          {clientInfo.requirements && (
            <div className="relative z-10 px-6 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-1">요청사항</p>
              <p className="text-xs text-gray-800 whitespace-pre-wrap">{clientInfo.requirements}</p>
            </div>
          )}

          {/* Line items */}
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
      </section>
    </div>
  );
}

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

function NumberInput({ value, onChange, min }: { value: number; onChange: (v: number) => void; min: number }) {
  return (
    <div className="flex items-center">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 border border-gray-300 text-sm hover:border-black transition-colors flex items-center justify-center">−</button>
      <span className="text-sm w-8 text-center tabular-nums border-t border-b border-gray-300 h-7 flex items-center justify-center">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-7 h-7 border border-gray-300 text-sm hover:border-black transition-colors flex items-center justify-center">+</button>
    </div>
  );
}

const inputClass = 'w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors bg-white';
