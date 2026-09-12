import * as zip from '@zip.js/zip.js';
import { FileSpecs } from '../types';

class DummyDataStream {
  size: number;
  generated: number;
  chunkSize: number;

  constructor(size: number) {
    this.size = size;
    this.generated = 0;
    this.chunkSize = 64 * 1024; // 64KB chunks
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
        controller.enqueue(new Uint8Array(chunk));
        self.generated += chunk;
        
        if (self.generated % (self.chunkSize * 160) === 0) {
          await new Promise(r => setTimeout(r, 2));
        }
      }
    });
  }
}

async function registerAndGetSW(): Promise<ServiceWorker> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this browser.');
  }
  
  let registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  
  const sw = registration.active || registration.waiting || registration.installing;
  if (!sw) {
    throw new Error('Failed to get active Service Worker.');
  }
  
  // Wait for the SW to become active if it's installing
  if (sw.state !== 'activated') {
    await new Promise<void>((resolve) => {
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') resolve();
      });
    });
  }
  
  return sw;
}

export async function generateAndDownloadFile(specs: FileSpecs) {
  if (!navigator.onLine) {
    throw new Error("No internet connection.");
  }

  let sw: ServiceWorker | null = null;
  try {
    sw = await registerAndGetSW();
  } catch (err) {
    console.warn("Service worker registration failed, falling back to Blob generation (this may crash on mobile).", err);
  }

  const { readable: outerReadable, writable: outerWritable } = new TransformStream();
  const outerZipWriter = new zip.ZipWriter(outerWritable, { useWebWorkers: true });

  const startZipGeneration = async () => {
    try {
      if (specs.includeReadme) {
        await outerZipWriter.add('Readme.txt', new zip.TextReader(specs.textContent || 'No message provided.'), { level: 0 });
      }

      const { readable: innerReadable, writable: innerWritable } = new TransformStream();
      const innerZipWriter = new zip.ZipWriter(innerWritable, {
        password: specs.isLocked ? (specs.password || 'password') : undefined,
        zipCrypto: specs.isLocked ? true : undefined,
        useWebWorkers: true
      });

      const innerZipPromise = (async () => {
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
      })();

      const lockedZipName = specs.innerZipName ? (specs.innerZipName.endsWith('.zip') ? specs.innerZipName : `${specs.innerZipName}.zip`) : 'locked.zip';
      await outerZipWriter.add(lockedZipName, innerReadable, { level: 0 });
      await innerZipPromise;
      await outerZipWriter.close();
    } catch (err) {
      console.error("ZIP Generation error:", err);
      outerWritable.abort(err);
    }
  };

  const fileName = `${specs.name}.zip`;

  if (sw) {
    // We have a Service Worker, we can stream directly!
    const streamId = Math.random().toString(36).substring(2, 15);
    const channel = new MessageChannel();
    
    await new Promise<void>((resolve, reject) => {
      channel.port1.onmessage = (event) => {
        if (event.data.success) resolve();
        else reject(new Error("Failed to register stream with Service Worker"));
      };
      
      sw!.postMessage(
        { type: 'REGISTER_STREAM', id: streamId, stream: outerReadable, filename: fileName },
        [outerReadable, channel.port2]
      );
    });

    // Start generating data in the background
    startZipGeneration();

    // Trigger the download via the Service Worker interception
    const downloadUrl = `/download/${streamId}/${encodeURIComponent(fileName)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName; // The SW will also set Content-Disposition
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    // Fallback for browsers that block Service Workers (like some iOS WebViews)
    startZipGeneration();
    const response = new Response(outerReadable);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
