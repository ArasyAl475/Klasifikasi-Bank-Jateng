import React from 'react';
import { ProcessedResult } from '../types';
import { Download, AlertCircle } from 'lucide-react';

interface ResultsPreviewProps {
  results: ProcessedResult[];
  onDownload: () => void;
}

export const ResultsPreview: React.FC<ResultsPreviewProps> = ({ results, onDownload }) => {
  if (results.length === 0) return null;

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Preview Results</h3>
          <p className="text-sm text-slate-500">Showing first {Math.min(results.length, 100)} rows of {results.length} processed items.</p>
        </div>
        <button
          onClick={onDownload}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3">No</th>
              <th className="px-6 py-3 w-1/3">Original Description</th>
              <th className="px-6 py-3">Matched Code</th>
              <th className="px-6 py-3">Reference Type</th>
              <th className="px-6 py-3">Year</th>
              <th className="px-6 py-3">Calculated Status</th>
              <th className="px-6 py-3">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, 100).map((row, idx) => (
              <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{idx + 1}</td>
                <td className="px-6 py-4 truncate max-w-xs" title={row.originalDesc}>{row.originalDesc}</td>
                <td className="px-6 py-4 font-mono text-indigo-600 font-semibold">{row.matchedCode}</td>
                <td className="px-6 py-4 truncate max-w-xs" title={row.matchedDesc}>{row.matchedDesc}</td>
                <td className="px-6 py-4">{row.year}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${row.status === 'AKTIF' ? 'bg-green-100 text-green-700' : ''}
                    ${row.status === 'INAKTIF' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${row.status === 'MUSNAH' ? 'bg-red-100 text-red-700' : ''}
                    ${row.status === 'PERMANEN' ? 'bg-blue-100 text-blue-700' : ''}
                    ${row.status.includes('Review') ? 'bg-gray-100 text-gray-700' : ''}
                  `}>
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-1">
                    {row.confidence === 'Low' && <AlertCircle className="w-3 h-3 text-orange-500" />}
                    <span className={row.confidence === 'Low' ? 'text-orange-600' : 'text-slate-600'}>
                      {row.confidence}
                    </span>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};