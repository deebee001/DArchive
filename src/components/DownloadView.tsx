import React, { useState } from 'react';
import { FileSpecs } from '../types';
import { Download, FileArchive } from 'lucide-react';
import { generateAndDownloadFile } from '../lib/zip';

interface Props {
  specs: FileSpecs;
}

export default function DownloadView({ specs }: Props) {
  const [error, setError] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = () => {
    setError(null);
    generateAndDownloadFile(specs).catch((err: any) => {
      setError(err.message || 'Download failed. Please check your connection.');
    });
  };

  const fileName = `${specs.name}.zip`;
  const helpUrl = "https://t.me/a12tools";
  const troubleUrl = `https://t.me/a12tools?text=${encodeURIComponent('hello, i am having trouble using this file ' + fileName)}`;

  return (
    <div className="min-h-screen bg-[#202124] text-white flex flex-col font-sans overflow-hidden">
      
      {/* Header Area */}
      <div className="pt-4 px-4 pb-2 relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-shrink-0 bg-[#5f6368] p-1 rounded-sm text-neutral-200 flex items-center justify-center">
            <FileArchive className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-medium text-[#e8eaed] truncate max-w-[80vw]">
            {fileName} <span className="ml-2 text-[13px] text-[#9aa0a6] font-normal">({formatSize(specs.sizeBytes)})</span>
          </span>
        </div>
        
        <div className="flex gap-4 px-8 mb-2">
          <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#e8eaed] hover:bg-[#303134] px-2 py-1 rounded transition-colors -ml-2">
            Help
          </a>
        </div>
      </div>

      {/* Center Dialog */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 -mt-32 relative z-0">
        <div className="bg-[#424242] rounded-lg max-w-[260px] w-full p-5 text-center shadow-xl">
          <h2 className="text-[16px] font-normal text-[#e8eaed] mb-6">
            Your download link is ready
          </h2>
          
          <div className="flex justify-center">
            <button 
              onClick={handleDownload}
              className="bg-[#1a73e8] hover:bg-[#1b66c9] text-white px-5 py-2 rounded text-[13px] font-medium flex items-center justify-center gap-2 transition-colors focus:outline-none"
            >
              <Download className="w-4 h-4" strokeWidth={2.5} />
              Download
            </button>
          </div>
          {error && (
            <p className="text-[#f28b82] text-sm mt-4">{error}</p>
          )}
        </div>
        <div className="mt-8">
          <a href={troubleUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#9aa0a6] hover:text-[#e8eaed] hover:underline transition-colors text-center block">
            having trouble with the file?
          </a>
        </div>
      </div>
    </div>
  );
}
