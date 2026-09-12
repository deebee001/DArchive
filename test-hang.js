import * as zip from '@zip.js/zip.js';

async function run() {
  console.log("Start");
  const blobWriter = new zip.BlobWriter("application/zip");
  const outerZipWriter = new zip.ZipWriter(blobWriter, { useWebWorkers: true });

  const { readable, writable: innerWritable } = new TransformStream();
  
  const innerZipWriter = new zip.ZipWriter(innerWritable, { useWebWorkers: true });

  const innerZipPromise = (async () => {
    try {
      console.log("Inner writing");
      await innerZipWriter.add("test.bin", new zip.TextReader("hello"), { level: 0 });
      await innerZipWriter.close();
      console.log("Inner closed");
    } catch (e) {
      console.error(e);
    }
  })();

  console.log("Outer adding");
  await outerZipWriter.add("locked.zip", readable, { level: 0 });
  console.log("Outer added");
  await innerZipPromise;
  await outerZipWriter.close();
  console.log("Done");
}
run();
