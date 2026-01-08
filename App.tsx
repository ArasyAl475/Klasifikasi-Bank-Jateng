import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsPreview } from './components/ResultsPreview';
import { parseInputFile, parseReferenceFile, generateOutputExcel } from './utils/excelHelpers';
import { findBestMatches } from './services/aiService';
import { calculateStatus } from './utils/retentionLogic';
import { ParsedData, ReferenceRow, ProcessedResult, CURRENT_YEAR } from './types';
import { BrainCircuit, Loader2, FileCheck, AlertTriangle } from 'lucide-react';

export default function App() {
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedData, setProcessedData] = useState<ProcessedResult[]>([]);
  const [parsedInput, setParsedInput] = useState<ParsedData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!inputFile || !refFile) return;
    setIsProcessing(true);
    setProgress(0);
    setProcessedData([]);
    setErrorMsg(null);

    try {
      // 1. Parse Files
      const parsedData = await parseInputFile(inputFile);
      const references = await parseReferenceFile(refFile);
      
      setParsedInput(parsedData);
      
      if (parsedData.rows.length === 0) {
        throw new Error("No data found in input file. Please check column headers.");
      }

      if (references.length === 0) {
        throw new Error("No data found in reference file.");
      }
      
      const results: ProcessedResult[] = [];
      const BATCH_SIZE = 10; 
      const totalBatches = Math.ceil(parsedData.rows.length / BATCH_SIZE);

      // 2. Process in Batches
      for (let i = 0; i < parsedData.rows.length; i += BATCH_SIZE) {
        const batch = parsedData.rows.slice(i, i + BATCH_SIZE);
        
        // Prepare AI Input - Skip empty descriptions to save tokens/errors
        const aiInputs = batch
          .filter(r => r.description && r.description.length > 1) // Only send valid text
          .map(r => ({ id: r.__rowNum__, text: r.description }));
        
        let aiMatches: any[] = [];
        if (aiInputs.length > 0) {
           aiMatches = await findBestMatches(aiInputs, references);
        }

        // Process Match Results
        batch.forEach(row => {
          const match = aiMatches.find(m => m.id === row.__rowNum__);
          
          let matchedCode = '';
          let matchedRef: ReferenceRow | undefined;
          let status = '';
          let confidence: 'High'|'Medium'|'Low' = 'Low';

          if (match) {
            matchedCode = match.code;
            confidence = match.confidence as any;
            matchedRef = references.find(r => r.code === match.code);
            
            if (matchedRef) {
              status = calculateStatus(row.year, matchedRef);
            }
          } else if (!row.description) {
              matchedCode = "";
              status = "Missing Description";
          }

          results.push({
            rowNum: row.__rowNum__,
            originalDesc: row.description || '(Empty)',
            matchedCode: matchedCode || '-',
            matchedDesc: matchedRef?.description || '-',
            year: row.year,
            status: status || 'Pending',
            confidence
          });
        });

        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        setProgress(Math.round((currentBatch / totalBatches) * 100));
      }

      setProcessedData(results);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!parsedInput) return;
    const resultMap = new Map<number, ProcessedResult>(
      processedData.map(p => [p.rowNum, p] as [number, ProcessedResult])
    );
    generateOutputExcel(parsedInput, resultMap);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl mb-4">
            <BrainCircuit className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Smart Archive Classifier</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Upload your archive list and reference classification. We automatically detect columns and fill the missing Code and Status.
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <FileUpload 
            id="file1"
            label="1. Input File (Data to process)"
            subLabel="Excel file with columns: Uraian, Tahun"
            selectedFile={inputFile}
            onFileSelect={setInputFile}
          />
          <FileUpload 
            id="file2"
            label="2. Reference File (Master JRA)"
            subLabel="Excel file with columns: Kode, Jenis, Aktif, Inaktif"
            selectedFile={refFile}
            onFileSelect={setRefFile}
          />
        </div>

        {/* Error Message */}
        {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>{errorMsg}</p>
            </div>
        )}

        {/* Action Section */}
        <div className="flex flex-col items-center justify-center">
          <button
            onClick={handleProcess}
            disabled={!inputFile || !refFile || isProcessing}
            className={`
              relative px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all
              ${!inputFile || !refFile || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-1'
              }
            `}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" /> Processing... {progress}%
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileCheck /> Start Processing
              </span>
            )}
          </button>
          
          {isProcessing && (
             <div className="w-full max-w-md mt-4 bg-slate-200 rounded-full h-2.5">
               <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
             </div>
          )}
        </div>

        {/* Results */}
        <ResultsPreview results={processedData} onDownload={handleDownload} />

      </div>
    </div>
  );
}