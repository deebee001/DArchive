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
      pull(controller) {
        if (self.generated >= self.size) {
          controller.close();
          return;
        }
        const chunk = Math.min(self.chunkSize, self.size - self.generated);
        controller.enqueue(new Uint8Array(chunk));
        self.generated += chunk;
      }
    });
  }
}
async function run() {
  const start = Date.now();
  const blobWriter = new zip.BlobWriter("application/zip");
  const outerZipWriter = new zip.ZipWriter(blobWriter, { useWebWorkers: false });
  const { readable, writable: innerWritable } = new TransformStream();
  const innerZipWriter = new zip.ZipWriter(innerWritable, { useWebWorkers: false });
  const innerZipPromise = (async () => {
    await innerZipWriter.add("data.bin", new DummyDataStream(120 * 1024 * 1024).stream, { level: 0 });
    await innerZipWriter.close();
  })();
  await outerZipWriter.add("locked.zip", readable, { level: 0 });
  await innerZipPromise;
  await outerZipWriter.close();
  const blob = await blobWriter.getData();
  console.log(`Generated ${blob.size} bytes in ${Date.now() - start} ms`);
}
run();
