import * as zip from '@zip.js/zip.js';

class DummyDataStream {
  constructor(size) {
    this.size = size;
    this.generated = 0;
    this.chunkSize = 1024 * 1024;
  }
  get stream() {
    const self = this;
    return new ReadableStream({
      async pull(controller) {
        if (self.generated >= self.size) {
          controller.close();
          return;
        }
        const chunk = Math.min(self.chunkSize, self.size - self.generated);
        controller.enqueue(new Uint8Array(chunk));
        self.generated += chunk;
        // console.log(`Generated ${self.generated}/${self.size}`);
        await new Promise(r => setTimeout(r, 10)); // simulated throttle
      }
    });
  }
}

async function run() {
  console.log("Start");
  let bytesWritten = 0;
  const mockFileStream = new WritableStream({
    write(chunk) {
      bytesWritten += chunk.byteLength;
      // console.log(`Wrote ${chunk.byteLength} bytes. Total: ${bytesWritten}`);
    },
    close() {
      console.log(`Stream closed. Total written: ${bytesWritten}`);
    }
  });

  const outerZipWriter = new zip.ZipWriter(mockFileStream, { useWebWorkers: false });
  const { readable, writable: innerWritable } = new TransformStream();
  const innerZipWriter = new zip.ZipWriter(innerWritable, { useWebWorkers: false });

  const innerZipPromise = (async () => {
    try {
      console.log("Adding dummy stream");
      const dummyStream = new DummyDataStream(120 * 1024 * 1024).stream;
      await innerZipWriter.add("data.bin", dummyStream, { level: 0 });
      await innerZipWriter.close();
      console.log("Inner zip closed");
    } catch (e) {
      console.error("Inner zip error", e);
    }
  })();

  console.log("Adding locked.zip to outer");
  await outerZipWriter.add("locked.zip", readable, { level: 0 });
  console.log("Outer added");
  await innerZipPromise;
  await outerZipWriter.close();
  console.log("Done");
}

run();
