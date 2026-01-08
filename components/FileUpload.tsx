import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  label: string;
  subLabel: string;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  id: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, subLabel, onFileSelect, selectedFile, id }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="relative">
        <input
          type="file"
          id={id}
          accept=".xlsx, .xls"
          className="hidden"
          onChange={handleChange}
        />
        <label
          htmlFor={id}
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            selectedFile
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-300 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {selectedFile ? (
              <>
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="mb-2 text-sm text-emerald-700 font-semibold">{selectedFile.name}</p>
                <p className="text-xs text-emerald-600">File loaded successfully</p>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
                <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span></p>
                <p className="text-xs text-slate-400">{subLabel}</p>
              </>
            )}
          </div>
        </label>
      </div>
    </div>
  );
};