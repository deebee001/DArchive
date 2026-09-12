import * as zip from '@zip.js/zip.js';
import { FileSpecs } from '../types';

class DummyDataStream {
  size: number;
  generated: number;
  chunkSize: number;

  constructor(size: number) {
    this.size = size;
    this.generated = 0;
    this.chunkSize = 1024 * 1024; // 1MB chunks
  }

  get stream(): ReadableStream<Uint8Array> {
    const self = this;
    return new ReadableStream({
      async pull(controller) {
        if (!navigator.onLine) {
          controller.error(new Error("Network connection lost. Download failed."));
          return;
        }

        if (self.generated >= self.size) {
          controller.close();
          return;
        }
        const chunk = Math.min(self.chunkSize, self.size - self.generated);
        
        // Always enqueue a new Uint8Array to avoid stream stalling/corruption
        controller.enqueue(new Uint8Array(chunk));
        self.generated += chunk;
        
        // Throttling to keep browser responsive
        await new Promise(r => setTimeout(r, 60));
      }
    });
  }
}

export async function generateAndDownloadFile(specs: FileSpecs) {
  if (!navigator.onLine) {
    throw new Error("No internet connection.");
  }

  let fileStream: WritableStream<Uint8Array> | undefined;
  let blobWriter: zip.BlobWriter | undefined;
  let useBlob = false;

  // 1. Try modern File System Access API (Desktop Chrome/Edge/Opera)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${specs.name}.zip`,
        types: [{
          description: 'ZIP Archive',
          accept: { 'application/zip': ['.zip'] }
        }]
      });
      fileStream = await handle.createWritable();
    } catch (e: any) {
      // User cancelled the prompt
      if (e.name === 'AbortError') {
        throw new Error('ABORTED_BY_USER');
      }
      useBlob = true;
    }
  } else {
    useBlob = true; // Fallback to Blob for Mobile, Firefox, Safari
  }

  if (useBlob) {
    if (specs.sizeBytes > 1.5 * 1024 * 1024 * 1024) {
      console.warn("Generating a very large file in memory. The browser tab may crash depending on available RAM.");
    }
    blobWriter = new zip.BlobWriter("application/zip");
  }

  const writer = fileStream || blobWriter;
  if (!writer) throw new Error("Could not initialize file writer");
  
  const outerZipWriter = new zip.ZipWriter(writer, { useWebWorkers: true });

  // Add the text file to the outer zip if included
  if (specs.includeReadme) {
    await outerZipWriter.add('Readme.txt', new zip.TextReader(specs.textContent || 'No message provided.'), { level: 0 });
  }

  // Create a TransformStream to pass the inner zip's output directly to the outer zip
  const { readable, writable: innerWritable } = new TransformStream();
  
  const innerZipWriter = new zip.ZipWriter(innerWritable, {
    password: specs.isLocked ? (specs.password || 'password') : undefined,
    zipCrypto: specs.isLocked ? true : undefined,
    useWebWorkers: true
  });

  const innerZipPromise = (async () => {
    try {
      if (specs.innerFiles && specs.innerFiles.length > 0) {
        for (const f of specs.innerFiles) {
          if (f.type === 'folder') {
            const folderName = f.name.endsWith('/') ? f.name : f.name + '/';
            await innerZipWriter.add(folderName, undefined, { level: 0 });
          } else {
            const dummyStream = new DummyDataStream(f.sizeBytes).stream;
            await innerZipWriter.add(f.name || 'data.bin', dummyStream, { level: 0 });
          }
        }
      }
      await innerZipWriter.close();
    } catch (e) {
      console.error("Inner zip error", e);
      throw e;
    }
  })();

  const lockedZipName = specs.innerZipName ? (specs.innerZipName.endsWith('.zip') ? specs.innerZipName : `${specs.innerZipName}.zip`) : 'locked.zip';
  await outerZipWriter.add(lockedZipName, readable, { level: 0 });
  await innerZipPromise;
  await outerZipWriter.close();

  // 3. Trigger standard file download if using Blob Fallback
  if (useBlob && blobWriter) {
    const blob = await blobWriter.getData();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${specs.name}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000); // Cleanup memory
  }
}
