import React, { useState } from 'react';
import { FileSpecs } from '../types';
import { Download, FileArchive, AlertCircle } from 'lucide-react';
import { generateAndDownloadFile } from '../lib/zip';

interface Props {
  specs: FileSpecs;
}

export default function DownloadView({ specs }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = async () => {
    try {
      setError(null);
      setIsDownloading(true);
      setProgress(0);
      
      await generateAndDownloadFile(specs, (pct) => {
        setProgress(pct);
      });
      
    } catch (err: any) {
      setError(err.message || 'Download failed. Please check your connection.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md text-center">
        
        <div className="w-20 h-20 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-center mx-auto mb-8">
          <FileArchive className="w-10 h-10 text-neutral-400" />
        </div>

        <h1 className="text-3xl font-medium tracking-tight mb-2 truncate px-4">
          {specs.name}.zip
        </h1>
        
        <p className="text-neutral-500 mb-10">
          {formatSize(specs.sizeBytes)} • Encrypted Archive
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full bg-neutral-900 text-white rounded-xl px-6 py-4 font-medium hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-4 focus:ring-neutral-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isDownloading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Downloading... {progress}%
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download File
            </>
          )}
        </button>

        {isDownloading && (
          <div className="w-full h-1.5 bg-neutral-100 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-neutral-900 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
      </div>
    </div>
  );
}
