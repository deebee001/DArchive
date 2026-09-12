import React, { useState } from 'react';
import { FileSpecs } from '../types';
import { Download, FileArchive, AlertCircle, ShieldCheck, Zap } from 'lucide-react';
import { generateAndDownloadFile } from '../lib/zip';

interface Props {
  specs: FileSpecs;
}

export default function DownloadView({ specs }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = () => {
    setError(null);
    setDownloading(true);
    generateAndDownloadFile(specs)
      .catch((err: any) => {
        setError(err.message || 'Download failed. Please check your connection.');
      })
      .finally(() => {
        setDownloading(false);
      });
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans">
      {/* Fake Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl text-indigo-600 tracking-tight">
          <Zap className="w-6 h-6 fill-indigo-600 text-indigo-600" /> QuickDrop
        </div>
        <div className="hidden sm:flex gap-4 text-sm font-medium text-neutral-500">
          <span className="hover:text-neutral-900 cursor-pointer">Premium</span>
          <span className="hover:text-neutral-900 cursor-pointer">Upload</span>
          <span className="hover:text-neutral-900 cursor-pointer">Sign In</span>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col lg:flex-row gap-6 my-4 lg:my-8">
        
        {/* Left Ad Banner */}
        <div className="hidden lg:flex flex-col w-64 shrink-0 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 h-[300px] flex flex-col items-center justify-center text-center relative overflow-hidden group cursor-pointer hover:border-indigo-300 transition-colors">
            <span className="absolute top-2 right-2 text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">Ad</span>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-bold text-neutral-800 mb-2">Secure Your PC Now</h3>
            <p className="text-xs text-neutral-500 mb-4">Download the #1 rated antivirus for 2026. Protect your downloads.</p>
            <button className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full w-full">Start Free Trial</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 h-[250px] flex flex-col items-center justify-center text-center relative overflow-hidden cursor-pointer">
            <span className="absolute top-2 right-2 text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">Ad</span>
            <div className="w-full h-32 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg mb-3 flex items-center justify-center text-white font-bold italic shadow-inner">
              SPEED+ VPN
            </div>
            <p className="text-xs text-neutral-600 font-medium">Browse anonymously with military-grade encryption.</p>
          </div>
        </div>

        {/* Main Content Area (Download Box) */}
        <div className="flex-1 flex flex-col items-center justify-start lg:justify-center">
          <div className="w-full max-w-[320px] bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 text-center transform hover:-translate-y-1 transition-transform duration-300">
            
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center mx-auto mb-6">
              <FileArchive className="w-8 h-8 text-indigo-500" />
            </div>

            <h1 className="text-xl font-bold tracking-tight mb-1 truncate text-neutral-900" title={`${specs.name}.zip`}>
              {specs.name}.zip
            </h1>
            
            <p className="text-xs font-medium text-neutral-500 mb-6 bg-neutral-100 py-1.5 px-3 rounded-full inline-block">
              {formatSize(specs.sizeBytes)} • Secure Archive
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-start gap-2 text-left border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="w-full bg-indigo-600 text-white rounded-xl px-4 py-3.5 text-sm font-bold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-4 focus:ring-indigo-600/20 flex items-center justify-center gap-2 shadow-md shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download File
                </>
              )}
            </button>

            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-[10px] text-neutral-400">By downloading, you agree to our Terms of Service. File is encrypted and scanned.</p>
            </div>
            
          </div>
        </div>

        {/* Right Ad Banner */}
        <div className="hidden xl:flex flex-col w-64 shrink-0 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 h-[600px] flex flex-col items-center justify-center text-center relative overflow-hidden cursor-pointer group">
            <span className="absolute top-2 right-2 text-[10px] text-neutral-400 uppercase tracking-widest font-semibold z-10">Ad</span>
            <div className="absolute inset-0 bg-neutral-900 opacity-5 group-hover:opacity-10 transition-opacity" />
            <div className="px-4 z-10">
              <h3 className="text-2xl font-black text-neutral-900 uppercase tracking-tighter mb-2">Build Apps<br/>Without Code</h3>
              <p className="text-sm text-neutral-600 mb-6">Launch your startup in days, not months.</p>
              <button className="bg-black text-white px-6 py-3 rounded-lg font-bold w-full uppercase tracking-wide text-xs">Learn More</button>
            </div>
          </div>
        </div>

      </div>

      {/* Fake Footer */}
      <footer className="mt-auto bg-white border-t border-neutral-200 py-8 px-6 text-center text-xs text-neutral-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 QuickDrop. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-neutral-900 cursor-pointer">DMCA</span>
            <span className="hover:text-neutral-900 cursor-pointer">Privacy</span>
            <span className="hover:text-neutral-900 cursor-pointer">Terms</span>
            <span className="hover:text-neutral-900 cursor-pointer">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
