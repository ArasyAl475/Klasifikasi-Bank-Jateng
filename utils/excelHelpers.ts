import * as XLSX from 'xlsx';
import { InputRow, ReferenceRow, ParsedData } from '../types';

// Helper to extract a number from a string
const parsePeriod = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val);
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

const cleanStr = (val: any): string => {
  return val ? String(val).trim() : '';
};

const normalizeHeader = (str: string) => str.toUpperCase().replace(/\s+/g, '');

// Smart Column Detector
const findColumnIndices = (headers: any[], type: 'INPUT' | 'REFERENCE') => {
  const indices: any = {};
  
  headers.forEach((h, idx) => {
    if (!h) return;
    const txt = normalizeHeader(String(h));

    if (type === 'INPUT') {
      if (txt.includes('URAIAN') || txt.includes('INFORMASI') || txt.includes('PERIHAL') || txt.includes('DESKRIPSI')) indices.description = idx;
      if (txt.includes('TAHUN') || txt === 'THN') indices.year = idx;
      if (txt.includes('KODE') && (txt.includes('KLASIFIKASI') || txt.includes('KLA'))) indices.code = idx;
      if (txt.includes('KETERANGAN') || txt.includes('KET')) indices.status = idx;
    } 
    else if (type === 'REFERENCE') {
      if (txt === 'KODE' || txt.includes('KODEKLAS')) indices.code = idx;
      if (txt.includes('JENIS') || txt.includes('URAIAN') || txt.includes('DESKRIPSI')) indices.description = idx;
      if (txt === 'AKTIF') indices.active = idx;
      if (txt === 'INAKTIF') indices.inactive = idx;
      if (txt.includes('KETERANGAN')) indices.finalStatus = idx;
    }
  });

  return indices;
};

export const parseInputFile = async (file: File): Promise<ParsedData> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Get full data including empty cells to preserve structure
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // 1. Find Header Row (Scan first 20 rows)
  let headerRowIndex = -1;
  let colIndices: any = {};

  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const row = rawData[i];
    if (!row) continue;
    
    const detected = findColumnIndices(row, 'INPUT');
    
    // Valid header if we found at least Description and Year
    if (detected.description !== undefined && detected.year !== undefined) {
      headerRowIndex = i;
      colIndices = detected;
      break;
    }
  }

  // Fallback to defaults if detection fails (User's prompt: D=3, E=4, F=5)
  // Note: The user said D=Kode, E=Uraian, F=Tahun. (Indices: 3, 4, 5)
  if (headerRowIndex === -1) {
    console.warn("Could not detect headers automatically. Using default indices (D=Kode, E=Uraian, F=Tahun).");
    headerRowIndex = 0; // Assume row 0 is header
    colIndices = {
      code: 3,       // Column D
      description: 4, // Column E
      year: 5,       // Column F
      status: 10     // Column K (Index 10)
    };
  } else {
      // If code/status columns weren't explicitly found in header (maybe they are empty/unnamed), assign defaults based on prompt
      if (colIndices.code === undefined) colIndices.code = 3; // D
      if (colIndices.status === undefined) colIndices.status = 10; // K
  }

  const rows: InputRow[] = [];
  
  // Start reading data after header
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;

    const description = cleanStr(row[colIndices.description]);
    const year = parsePeriod(row[colIndices.year]);

    // Only process rows that look like data
    if (description || year) {
      rows.push({
        __rowNum__: i,
        description,
        year
      });
    }
  }

  return {
    rows,
    rawSheetData: rawData,
    headerRowIndex,
    colIndices: colIndices as any
  };
};

export const parseReferenceFile = async (file: File): Promise<ReferenceRow[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let headerRowIndex = -1;
  let colIndices: any = {};

  // Detect Header
  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const row = rawData[i];
    const detected = findColumnIndices(row, 'REFERENCE');
    if (detected.code !== undefined && detected.description !== undefined) {
      headerRowIndex = i;
      colIndices = detected;
      break;
    }
  }

  // Fallback defaults (B=Kode, C=Jenis, D=Aktif, E=Inaktif, F=Ket)
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    colIndices = { code: 1, description: 2, active: 3, inactive: 4, finalStatus: 5 };
  }

  const rows: ReferenceRow[] = [];

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;

    const code = cleanStr(row[colIndices.code]);
    const desc = cleanStr(row[colIndices.description]);

    if (code && desc) {
      rows.push({
        code,
        description: desc,
        activePeriod: parsePeriod(row[colIndices.active]),
        inactivePeriod: parsePeriod(row[colIndices.inactive]),
        finalStatus: cleanStr(row[colIndices.finalStatus]).toUpperCase().includes('PERMANEN') ? 'PERMANEN' : 'MUSNAH'
      });
    }
  }
  return rows;
};

export const generateOutputExcel = (
  parsedData: ParsedData, 
  results: Map<number, any>
) => {
  // Deep copy the original raw data
  const outputData = JSON.parse(JSON.stringify(parsedData.rawSheetData));
  const { code: codeIdx, status: statusIdx } = parsedData.colIndices;

  // Update rows
  results.forEach((result, rowNum) => {
    if (outputData[rowNum]) {
        // Ensure row is long enough
        while (outputData[rowNum].length <= Math.max(codeIdx, statusIdx)) {
            outputData[rowNum].push(null);
        }
        
        outputData[rowNum][codeIdx] = result.matchedCode;
        outputData[rowNum][statusIdx] = result.status;
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(outputData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hasil Proses");
  XLSX.writeFile(wb, "Hasil_Rekap_Arsip_Processed.xlsx");
};