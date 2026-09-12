import * as zip from '@zip.js/zip.js';
import streamSaver from 'streamsaver';
import { FileSpecs } from '../types';

class DummyDataStream {
  size: number;
  generated: number;
  chunkSize: number;
  dummyChunk: Uint8Array;

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
        
        // Throttling to keep browser responsive and simulate download speed (approx 10-15MB/s)
        await new Promise(r => setTimeout(r, 60));
      }
    });
  }
}

export async function generateAndDownloadFile(specs: FileSpecs) {
  if (!navigator.onLine) {
    throw new Error("No internet connection.");
  }

  // Use StreamSaver for a native browser download experience
  // Provide an estimated size so the browser download manager shows the total size
  const estimatedSize = specs.sizeBytes + 1024; 
  const fileStream = streamSaver.createWriteStream(`${specs.name}.zip`, {
    size: estimatedSize
  });
  
  const outerZipWriter = new zip.ZipWriter(fileStream, { useWebWorkers: false });

  // Add the text file to the outer zip
  await outerZipWriter.add('message.txt', new zip.TextReader(specs.textContent || 'No message provided.'), { level: 0 });

  // Create a TransformStream to pass the inner zip's output directly to the outer zip
  const { readable, writable: innerWritable } = new TransformStream();
  
  const innerZipWriter = new zip.ZipWriter(innerWritable, {
    password: specs.isLocked ? (specs.password || 'password') : undefined,
    zipCrypto: specs.isLocked ? true : undefined,
    useWebWorkers: false
  });

  const dummyStream = new DummyDataStream(specs.sizeBytes).stream;

  const innerZipPromise = (async () => {
    try {
      await innerZipWriter.add('data.bin', dummyStream, { level: 0 });
      await innerZipWriter.close();
    } catch (e) {
      console.error("Inner zip error", e);
      throw e;
    }
  })();

  await outerZipWriter.add('locked.zip', readable, { level: 0 });
  await innerZipPromise;
  await outerZipWriter.close();
}
