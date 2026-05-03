'use client';

import { useState, useRef } from 'react';
import { calculateQuote, PRICES } from '@/lib/pricing';
import { QuoteInput, QuoteRequest } from '@/types/quote';

function formatWon(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function Home() {
  const [clientName, setClientName] = useState('');
  const [refs, setRefs] = useState<{ id: number; value: string }[]>([{ id: 0, value: '' }]);
  const nextRefId = useRef(1);
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

  const addRef = () => {
    setRefs([...refs, { id: nextRefId.current++, value: '' }]);
  };
  const updateRef = (i: number, v: string) => {
    const next = refs.map((r, idx) => (idx === i ? { ...r, value: v } : r));
    setRefs(next);
  };
  const removeRef = (i: number) => setRefs(refs.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!quoteRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(quoteRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `견적서_${clientName || '고객'}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError('이미지 저장 중 오류가 발생했습니다');
    }
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
      refs: refs.map((r) => r.value).filter(Boolean),
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
              onChange={(e) => { setClientName(e.target.value); setSent(false); setError(''); }}
              placeholder="홍길동"
            />
          </Field>

          <Field label="레퍼런스 링크">
            <div className="space-y-2">
              {refs.map((r, i) => (
                <div key={r.id} className="flex gap-2">
                  <input
                    className={`${inputClass} flex-1`}
                    value={r.value}
                    onChange={(e) => updateRef(i, e.target.value)}
                    placeholder="https://youtube.com/..."
                    type="url"
                  />
                  {refs.length > 1 && (
                    <button
                      type="button"
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

            {refs.some((r) => r.value) && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs tracking-widest text-gray-400 uppercase mb-2">레퍼런스</p>
                <ul className="space-y-1">
                  {refs.filter((r) => r.value).map((r) => (
                    <li key={r.id} className="text-xs text-gray-500 break-all flex gap-1.5">
                      <span className="text-gray-300">·</span>
                      <a
                        href={r.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-black transition-colors"
                      >
                        {r.value}
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
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 border border-gray-300 text-sm hover:border-black transition-colors"
      >
        −
      </button>
      <span className="text-sm w-8 text-center tabular-nums">{value}</span>
      <button
        type="button"
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
