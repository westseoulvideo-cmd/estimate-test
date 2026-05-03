export interface QuoteInput {
  shootingCount: number;
  editMinutes: number;
  drone: boolean;
  extraCrew: number;
}

export interface QuoteResult {
  shootingFee: number;
  editingFee: number;
  droneFee: number;
  extraCrewFee: number;
  total: number;
}

export interface QuoteRequest {
  clientName: string;
  refs: string[];
  input: QuoteInput;
  result: QuoteResult;
}
