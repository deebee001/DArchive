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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-medium text-neutral-900 mb-2">File not found</h1>
        <p className="text-neutral-500">{error}</p>
        <button onClick={() => window.location.href = '/'} className="mt-6 text-sm underline text-neutral-900 hover:text-neutral-600">Go to Dashboard</button>
      </div>
    );
  }

  return specs ? <DownloadView specs={specs} /> : <Dashboard />;
}

