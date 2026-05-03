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
