import React, { useRef, useState } from 'react';
import { Upload, FileText, X, Check } from 'lucide-react';
import { Button } from '../ui/Button';

interface FileUploaderProps {
  accept?: string;
  maxSizeMB?: number;
  onFileSelect: (file: File) => void;
  label?: string;
  helperText?: string;
  selectedFile?: File | null;
  onClear?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept = '.pdf,.docx,.doc,.csv,.xlsx,.txt',
  maxSizeMB = 20,
  onFileSelect,
  label = 'Upload Document',
  helperText = 'Supported formats: PDF, DOCX, XLSX, CSV, TXT (Max 20MB)',
  selectedFile = null,
  onClear,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const validateAndSelect = (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File size exceeds limit of ${maxSizeMB}MB`);
      return;
    }
    onFileSelect(file);
  };

  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-bold text-slate-700 block">{label}</label>}

      {selectedFile ? (
        <div className="flex items-center justify-between p-3 bg-orange-50/50 border border-orange-200 rounded-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-orange-100 text-orange-700 rounded-lg shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          {onClear && (
            <button
              onClick={onClear}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-orange-500 bg-orange-50/50'
              : 'border-slate-300 hover:border-orange-400 hover:bg-slate-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-800">
            Click to upload <span className="font-normal text-slate-500">or drag and drop</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
        </div>
      )}
    </div>
  );
};
