/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import DownloadView from './components/DownloadView';
import { FileSpecs } from './types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

export default function App() {
  const [specs, setSpecs] = useState<FileSpecs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const fileId = url.searchParams.get('file');
    
    if (fileId) {
      const fetchSpecs = async () => {
        try {
          const docRef = doc(db, 'links', fileId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setSpecs(docSnap.data() as FileSpecs);
          } else {
            setError("This link is invalid or has expired.");
          }
        } catch (e) {
          console.error("Error fetching link", e);
          setError("Failed to load the file data.");
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchSpecs();
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-neutral-400">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#202124] flex flex-col items-center justify-center p-4 font-sans text-center">
        <h1 className="text-[18px] font-normal text-[#e8eaed] mb-2">File not found</h1>
        <p className="text-[15px] text-[#9aa0a6]">{error}</p>
      </div>
    );
  }

  return specs ? <DownloadView specs={specs} /> : <Dashboard />;
}

