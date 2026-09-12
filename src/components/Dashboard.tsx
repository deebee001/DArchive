import React, { useState } from 'react';
import { FileSpecs } from '../types';
import { Copy, FileArchive, Link, CheckCircle2, Lock } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Dashboard() {
  const [name, setName] = useState('MyArchive');
  const [size, setSize] = useState(1);
  const [unit, setUnit] = useState<'MB' | 'GB'>('GB');
  const [isLocked, setIsLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [textContent, setTextContent] = useState('This is a generated file.\nHave a great day!');
  
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let sizeBytes = size;
      if (unit === 'MB') sizeBytes *= 1024 * 1024;
      if (unit === 'GB') sizeBytes *= 1024 * 1024 * 1024;
      
      // Cap at 5GB
      sizeBytes = Math.min(sizeBytes, 5 * 1024 * 1024 * 1024);

      const specs = {
        name,
        sizeBytes,
        isLocked,
        password: isLocked ? password : '',
        textContent,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'links'), specs);

      const url = new URL(window.location.href);
      url.searchParams.set('file', docRef.id);
      
      setShareLink(url.toString());
      setCopied(false);
    } catch (err) {
      console.error('Error generating link:', err);
      alert('Failed to generate link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col items-center py-16 px-4 font-sans">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-10">
          <FileArchive className="w-8 h-8 text-neutral-800" />
          <h1 className="text-2xl font-medium tracking-tight">File Forge</h1>
        </div>

        <form onSubmit={handleGenerate} className="space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-neutral-200/60">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-600 block">File Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-shadow"
              placeholder="e.g. ProjectFiles"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-600 block">File Size (Max 5GB)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                required
                min="1"
                max={unit === 'GB' ? "5" : "5000"}
                step="0.1"
                value={size}
                onChange={e => setSize(Number(e.target.value))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-shadow"
              />
              <select 
                value={unit} 
                onChange={e => setUnit(e.target.value as 'MB' | 'GB')}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 focus:outline-none"
              >
                <option value="MB">MB</option>
                <option value="GB">GB</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-600 block">Inner Text File Content</label>
            <textarea 
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              rows={4}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-shadow resize-none"
              placeholder="Write a message to be included..."
            />
          </div>

          <div className="pt-2 border-t border-neutral-100">
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input 
                type="checkbox"
                checked={isLocked}
                onChange={e => setIsLocked(e.target.checked)}
                className="w-5 h-5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Password Protect Inner ZIP
              </span>
            </label>
            
            {isLocked && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <input 
                  type="text" 
                  required={isLocked}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-shadow"
                  placeholder="Set a secure password"
                />
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 text-white rounded-lg px-4 py-3.5 font-medium hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-4 focus:ring-neutral-900/20 disabled:opacity-50"
          >
            {isLoading ? 'Creating Link...' : 'Create Shareable Link'}
          </button>
        </form>

        {shareLink && (
          <div className="mt-8 p-6 bg-white rounded-2xl border border-neutral-200/60 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <p className="text-sm font-medium text-neutral-600 mb-3 flex items-center gap-2">
              <Link className="w-4 h-4" /> Link Generated
            </p>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={shareLink} 
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-neutral-500 text-sm focus:outline-none"
              />
              <button 
                onClick={copyToClipboard}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg px-4 py-3 transition-colors flex items-center gap-2 font-medium"
              >
                {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
