import * as zip from '@zip.js/zip.js';

class FastDummyDataStream {
  constructor(size) {
    this.size = size;
    this.generated = 0;
    this.chunkSize = 4 * 1024 * 1024; // 4MB chunks
    this.sharedBuffer = new Uint8Array(this.chunkSize);
  }

  get stream() {
    const self = this;
    return new ReadableStream({
      pull(controller) {
        if (self.generated >= self.size) {
          controller.close();
          return;
        }
        const remaining = self.size - self.generated;
        if (remaining < self.chunkSize) {
          controller.enqueue(new Uint8Array(remaining));
          self.generated += remaining;
        } else {
          // Re-use or slice buffer
          controller.enqueue(self.sharedBuffer);
          self.generated += self.chunkSize;
        }
      }
    });
  }
}

async function test() {
  const start = Date.now();
  console.log("Starting 1.6GB generation test...");
  
  // Test with null stream to measure pure generation speed
  let totalBytes = 0;
  const devNull = new WritableStream({
    write(chunk) {
      totalBytes += chunk.byteLength;
    }
  });

  const outerZipWriter = new zip.ZipWriter(devNull, { useWebWorkers: false });
  const { readable, writable: innerWritable } = new TransformStream();
  const innerZipWriter = new zip.ZipWriter(innerWritable, { useWebWorkers: false });

  const innerPromise = (async () => {
    await innerZipWriter.add("data.bin", new FastDummyDataStream(1600 * 1024 * 1024).stream, { level: 0 });
    await innerZipWriter.close();
  })();

  await outerZipWriter.add("locked.zip", readable, { level: 0 });
  await innerPromise;
  await outerZipWriter.close();

  console.log(`Generated and zipped 1.6GB in ${(Date.now() - start) / 1000}s! Total bytes: ${totalBytes}`);
}

test().catch(console.error);
