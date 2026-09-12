import * as zip from '@zip.js/zip.js';
import streamSaver from 'streamsaver';
import { FileSpecs } from '../types';

class DummyDataStream {
  size: number;
  generated: number;
  chunkSize: number;

  constructor(size: number) {
    this.size = size;
    this.generated = 0;
    this.chunkSize = 1024 * 1024; // 1MB chunks for throttling
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
        
        // Throttle to approx 10MB/s (wait 100ms per 1MB chunk)
        await new Promise(r => setTimeout(r, 100));
      }
    });
  }
}

export async function generateAndDownloadFile(specs: FileSpecs, onProgress: (percent: number) => void) {
  if (!navigator.onLine) {
    throw new Error("No internet connection.");
  }

  // Use StreamSaver for a native browser download experience
  const fileStream = streamSaver.createWriteStream(`${specs.name}.zip`);
  const outerZipWriter = new zip.ZipWriter(fileStream);

  // Add the text file to the outer zip
  await outerZipWriter.add('message.txt', new zip.TextReader(specs.textContent || 'No message provided.'));

  // Create a TransformStream to pass the inner zip's output directly to the outer zip
  const { readable, writable: innerWritable } = new TransformStream();
  
  const innerZipWriter = new zip.ZipWriter(innerWritable, {
    password: specs.isLocked && specs.password ? specs.password : undefined,
  });

  let totalBytesAdded = 0;
  
  const progressStream = new TransformStream({
    transform(chunk, controller) {
      totalBytesAdded += chunk.length;
      onProgress(Math.round((totalBytesAdded / specs.sizeBytes) * 100));
      controller.enqueue(chunk);
    }
  });

  const dummyStream = new DummyDataStream(specs.sizeBytes).stream;
  const pipedDummyStream = dummyStream.pipeThrough(progressStream);

  const innerZipPromise = (async () => {
    try {
      await innerZipWriter.add('data.bin', pipedDummyStream);
      await innerZipWriter.close();
    } catch (e) {
      console.error("Inner zip error", e);
      throw e;
    }
  })();

  await outerZipWriter.add('locked.zip', readable);
  await innerZipPromise;
  await outerZipWriter.close();
}
