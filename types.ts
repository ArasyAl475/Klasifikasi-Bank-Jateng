export interface InputRow {
  __rowNum__: number; // Index in the raw array
  description: string;
  year: number;
  // We will fill these later
  classificationCode?: string;
  status?: string;
  confidence?: string;
}

export interface ReferenceRow {
  code: string;
  description: string;
  activePeriod: number;
  inactivePeriod: number;
  finalStatus: 'MUSNAH' | 'PERMANEN';
}

export interface ProcessedResult {
  rowNum: number;
  originalDesc: string;
  matchedCode: string;
  matchedDesc: string;
  year: number;
  status: string; // Aktif, Inaktif, Musnah, Permanen
  confidence: 'High' | 'Medium' | 'Low';
}

export interface ParsedData {
  rows: InputRow[];
  rawSheetData: any[][]; // Store the full original data to preserve layout
  headerRowIndex: number;
  colIndices: {
    description: number;
    year: number;
    code: number;
    status: number;
  };
}

export const CURRENT_YEAR = 2026;