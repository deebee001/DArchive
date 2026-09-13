import * as zip from '@zip.js/zip.js';
import { FileSpecs } from '../types';

class FastDummyDataStream {
  size: number;
  generated: number;
  chunkSize: number;
  sharedBuffer: Uint8Array;
  onProgress?: (progressPercent: number) => void;

  constructor(size: number, onProgress?: (progressPercent: number) => void) {
    this.size = size;
    this.generated = 0;
    this.chunkSize = 2 * 1024 * 1024; // 2MB chunk for high throughput and low overhead
    this.sharedBuffer = new Uint8Array(this.chunkSize);
    this.onProgress = onProgress;
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

        const remaining = self.size - self.generated;
        if (remaining < self.chunkSize) {
          controller.enqueue(new Uint8Array(remaining));
          self.generated += remaining;
        } else {
          controller.enqueue(self.sharedBuffer);
          self.generated += self.chunkSize;
        }

        if (self.onProgress && self.size > 0) {
          const pct = Math.min(99, Math.floor((self.generated / self.size) * 100));
          self.onProgress(pct);
        }

        // Yield event loop every 16MB to allow browser UI updates and garbage collection
        if (self.generated % (self.chunkSize * 8) === 0) {
          await new Promise(r => setTimeout(r, 2));
        }
      }
    });
  }
}

export async function generateAndDownloadFile(
  specs: FileSpecs,
  onProgress?: (progressPercent: number) => void
) {
  if (!navigator.onLine) {
    throw new Error("No internet connection.");
  }

  const fileName = `${specs.name}.zip`;

  // 1. Try Desktop File System Access API (Streams directly to hard drive, 0 memory)
  let fileSystemWritable: WritableStream<Uint8Array> | null = null;
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'ZIP Archive',
          accept: { 'application/zip': ['.zip'] }
        }]
      });
      fileSystemWritable = await handle.createWritable();
    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw new Error('ABORTED_BY_USER');
      }
      // If permission denied or other picker error, fall through to Blob download
      fileSystemWritable = null;
    }
  }

  // 2. Setup destination writable stream
  const chunks: Uint8Array[] = [];
  const targetWritable = fileSystemWritable || new WritableStream<Uint8Array>({
    write(chunk) {
      chunks.push(chunk);
    }
  });

  const outerZipWriter = new zip.ZipWriter(targetWritable, { useWebWorkers: false });

  // Add Readme.txt if enabled
  if (specs.includeReadme) {
    await outerZipWriter.add('Readme.txt', new zip.TextReader(specs.textContent || 'No message provided.'), { level: 0 });
  }

  // Create nested inner zip
  const { readable: innerReadable, writable: innerWritable } = new TransformStream();
  const innerZipWriter = new zip.ZipWriter(innerWritable, {
    password: specs.isLocked ? (specs.password || 'password') : undefined,
    zipCrypto: specs.isLocked ? true : undefined,
    useWebWorkers: false
  });

  const innerZipPromise = (async () => {
    try {
      if (specs.innerFiles && specs.innerFiles.length > 0) {
        for (const f of specs.innerFiles) {
          if (f.type === 'folder') {
            const folderName = f.name.endsWith('/') ? f.name : f.name + '/';
            await innerZipWriter.add(folderName, undefined, { level: 0 });
          } else {
            const dummyStream = new FastDummyDataStream(f.sizeBytes, onProgress).stream;
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
  await outerZipWriter.add(lockedZipName, innerReadable, { level: 0 });
  await innerZipPromise;
  await outerZipWriter.close();

  if (onProgress) {
    onProgress(100);
  }

  // 3. If fileSystemWritable was used, it's already written directly to disk.
  // Otherwise, trigger standard browser download via blob URL
  if (!fileSystemWritable) {
    const blob = new Blob(chunks, { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // iOS Safari sometimes delays or hands off the blob to a background download manager.
    // Revoking it too quickly causes a 'file not found' error. We leave it for 5 minutes.
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  }
}
