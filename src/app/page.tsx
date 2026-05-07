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
      <section className="space-y-5">
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

        <Field label="항공촬영">
          <button type="button" onClick={() => setQ({ aerial: !input.aerial })}
            className={`w-full py-3 border text-sm tracking-wide transition-colors ${input.aerial ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-700 hover:border-black'}`}>
            {input.aerial ? '포함' : '미포함'}
            <span className={`ml-2 text-xs ${input.aerial ? 'text-gray-300' : 'text-gray-400'}`}>(단가 ×1.2)</span>
          </button>
        </Field>

        <Field label="촬영 횟수" required>
          <NumberInput value={input.shootingCount} onChange={v => setQ({ shootingCount: v })} min={0} suffix="회" />
        </Field>

        <Field label="구성">
          <NumberInput value={input.compositionMinutes} onChange={v => setQ({ compositionMinutes: v })} min={0} suffix="분" />
        </Field>

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

        <Field label="편집">
          <div className="flex items-center gap-3">
            <NumberInput value={input.editMinutes} onChange={v => setQ({ editMinutes: v })} min={0} suffix="분" />
            <button type="button" onClick={() => setQ({ entertainmentEffect: !input.entertainmentEffect })}
              className={`px-3 py-1.5 border text-xs transition-colors whitespace-nowrap ${input.entertainmentEffect ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
              예능형효과
            </button>
          </div>
        </Field>

        <Field label="쇼츠 편집">
          <div className="flex items-center gap-3">
            <NumberInput value={input.shortsMinutes} onChange={v => setQ({ shortsMinutes: v })} min={0} suffix="분" />
            <button type="button" onClick={() => setQ({ shortsEntertainmentEffect: !input.shortsEntertainmentEffect })}
              className={`px-3 py-1.5 border text-xs transition-colors whitespace-nowrap ${input.shortsEntertainmentEffect ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}>
              예능형효과
            </button>
          </div>
        </Field>

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

        <Field label="AI 동영상 제작">
          <NumberInput value={input.aiVideoMinutes} onChange={v => setQ({ aiVideoMinutes: v })} min={0} suffix="분" />
        </Field>

        <Field label="편수" required>
          <NumberInput value={input.episodeCount} onChange={v => setQ({ episodeCount: Math.max(1, v) })} min={1} suffix="편" />
        </Field>

        <Field label="추가작업 후속계약 할인">
          <button type="button" onClick={() => setQ({ additionalWork: !input.additionalWork })}
            className={`w-full py-3 border text-sm tracking-wide transition-colors ${input.additionalWork ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-700 hover:border-black'}`}>
            {input.additionalWork ? '적용 (−5%)' : '미적용'}
          </button>
        </Field>
      </section>

      <section className="space-y-4">
        <div ref={quoteRef} className="relative border border-gray-200 bg-white overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="" style={{ width: '60%', opacity: 0.1, filter: 'invert(1)' }} />
          </div>

          <div className="relative z-10 bg-black text-white px-6 py-4 flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="로고" style={{ height: '26px' }} />
            <span className="text-base tracking-[0.35em] font-light">견  적  서</span>
          </div>

          <div className="relative z-10 px-6 pt-4 pb-3 border-b border-gray-100 space-y-0.5 text-xs text-gray-600">
            <p className="font-semibold text-sm text-gray-900">{COMPANY.name}</p>
            <p>사업자등록번호: {COMPANY.bizNo}</p>
            <p>이메일: {COMPANY.email}</p>
            <p>견적일: {formatQuoteDate(clientInfo.quoteDate)}</p>
          </div>

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

          {clientInfo.requirements && (
            <div className="relative z-10 px-6 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-1">요청사항</p>
              <p className="text-xs text-gray-800 whitespace-pre-wrap">{clientInfo.requirements}</p>
            </div>
          )}

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
