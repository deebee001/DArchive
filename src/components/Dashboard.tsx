import React, { useState, useEffect } from 'react';
import { FileSpecs } from '../types';
import { Copy, FileArchive, Link as LinkIcon, CheckCircle2, Lock, LogOut, Trash2, Edit2, Plus, Database } from 'lucide-react';
import { addDoc, collection, serverTimestamp, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Dashboard() {
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!username);
  const [loginInput, setLoginInput] = useState('');

  const [view, setView] = useState<'create' | 'list'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('MyArchive');
  const [size, setSize] = useState(1);
  const [unit, setUnit] = useState<'MB' | 'GB'>('GB');
  const [isLocked, setIsLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [textContent, setTextContent] = useState('This is a generated file.\nHave a great day!');
  
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [myFiles, setMyFiles] = useState<FileSpecs[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInput.trim()) {
      localStorage.setItem('username', loginInput.trim());
      setUsername(loginInput.trim());
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    setUsername('');
    setIsLoggedIn(false);
    setView('create');
    setMyFiles([]);
  };

  const fetchFiles = async () => {
    if (!username) return;
    setIsFetching(true);
    try {
      const q = query(collection(db, 'links'), where('owner', '==', username));
      const snapshot = await getDocs(q);
      const files: FileSpecs[] = [];
      snapshot.forEach(doc => {
        files.push({ id: doc.id, ...doc.data() } as FileSpecs);
      });
      // Sort manually since we didn't create a composite index for createdAt
      files.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setMyFiles(files);
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && view === 'list') {
      fetchFiles();
    }
  }, [isLoggedIn, view]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let sizeBytes = size;
      if (unit === 'MB') sizeBytes *= 1024 * 1024;
      if (unit === 'GB') sizeBytes *= 1024 * 1024 * 1024;
      
      sizeBytes = Math.min(sizeBytes, 5 * 1024 * 1024 * 1024);

      const specs = {
        name,
        sizeBytes,
        isLocked,
        password: isLocked ? password : '',
        textContent,
        owner: username,
        createdAt: serverTimestamp()
      };

      let linkId = '';
      if (editingId) {
        await updateDoc(doc(db, 'links', editingId), specs);
        linkId = editingId;
      } else {
        const docRef = await addDoc(collection(db, 'links'), specs);
        linkId = docRef.id;
      }

      const url = new URL(window.location.href);
      url.searchParams.set('file', linkId);
      
      setShareLink(url.toString());
      setCopied(false);
      setEditingId(null);
    } catch (err) {
      console.error('Error generating link:', err);
      alert('Failed to save file settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this file link?")) return;
    try {
      await deleteDoc(doc(db, 'links', id));
      setMyFiles(myFiles.filter(f => f.id !== id));
    } catch (err) {
      console.error("Failed to delete", err);
      alert("Failed to delete file.");
    }
  };

  const handleEdit = (file: FileSpecs) => {
    setEditingId(file.id!);
    setName(file.name);
    
    if (file.sizeBytes >= 1024 * 1024 * 1024) {
      setSize(file.sizeBytes / (1024 * 1024 * 1024));
      setUnit('GB');
    } else {
      setSize(file.sizeBytes / (1024 * 1024));
      setUnit('MB');
    }

    setIsLocked(file.isLocked);
    setPassword(file.password || '');
    setTextContent(file.textContent);
    setShareLink('');
    setView('create');
  };

  const startNewFile = () => {
    setEditingId(null);
    setName('MyArchive');
    setSize(1);
    setUnit('GB');
    setIsLocked(false);
    setPassword('');
    setTextContent('This is a generated file.\nHave a great day!');
    setShareLink('');
    setView('create');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200/60 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <FileArchive className="w-8 h-8 text-neutral-800" />
          </div>
          <h1 className="text-xl font-medium text-center mb-6 text-neutral-900">Welcome to File Forge</h1>
          <div className="space-y-4">
            <input 
              type="text" 
              required
              value={loginInput}
              onChange={e => setLoginInput(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              placeholder="Enter a username"
            />
            <button 
              type="submit"
              className="w-full bg-neutral-900 text-white rounded-lg px-4 py-3 font-medium hover:bg-neutral-800 transition-colors"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <FileArchive className="w-6 h-6 text-neutral-800" />
          <h1 className="text-lg font-medium tracking-tight">File Forge</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-neutral-100 rounded-lg p-1">
            <button 
              onClick={() => { if(view !== 'create') startNewFile(); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'create' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Create
            </button>
            <button 
              onClick={() => setView('list')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              My Files
            </button>
          </div>
          <div className="w-px h-6 bg-neutral-200 mx-2"></div>
          <span className="text-sm text-neutral-600 font-medium">{username}</span>
          <button onClick={handleLogout} className="text-neutral-400 hover:text-neutral-900 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-12 px-4">
        {view === 'create' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-medium mb-8 text-neutral-900">
              {editingId ? 'Edit File Settings' : 'Generate New File'}
            </h2>
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
                {isLoading ? (editingId ? 'Saving...' : 'Creating Link...') : (editingId ? 'Save Changes' : 'Create Shareable Link')}
              </button>
            </form>

            {shareLink && (
              <div className="mt-8 p-6 bg-white rounded-2xl border border-neutral-200/60 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                <p className="text-sm font-medium text-neutral-600 mb-3 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Link {editingId ? 'Updated' : 'Generated'}
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
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-medium mb-8 text-neutral-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-neutral-400" />
              My Files
            </h2>

            {isFetching ? (
              <p className="text-neutral-500 text-center py-12">Loading files...</p>
            ) : myFiles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200/60 border-dashed">
                <FileArchive className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-neutral-900 font-medium mb-1">No files yet</h3>
                <p className="text-neutral-500 text-sm mb-6">You haven't generated any files yet.</p>
                <button 
                  onClick={startNewFile}
                  className="bg-neutral-900 text-white rounded-lg px-6 py-2.5 font-medium hover:bg-neutral-800 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create One
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myFiles.map(file => (
                  <div key={file.id} className="bg-white p-5 rounded-xl border border-neutral-200/60 shadow-sm flex items-center justify-between group">
                    <div>
                      <h3 className="font-medium text-neutral-900 text-lg flex items-center gap-2">
                        {file.name}.zip
                        {file.isLocked && <Lock className="w-3.5 h-3.5 text-neutral-400" />}
                      </h3>
                      <p className="text-sm text-neutral-500 mt-1">
                        {file.sizeBytes >= 1024 * 1024 * 1024 
                          ? (file.sizeBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB' 
                          : (file.sizeBytes / (1024 * 1024)).toFixed(1) + ' MB'} 
                        {' • '}
                        {file.createdAt ? new Date((file.createdAt as any).seconds * 1000).toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/?file=${file.id}`);
                          alert("Link copied to clipboard!");
                        }}
                        className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
                        title="Copy Link"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(file)}
                        className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(file.id!)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
