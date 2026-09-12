const fs = require('fs');
const zip = require('@zip.js/zip.js');

async function run() {
  const fileStream = fs.createWriteStream('test-aes.zip');
  const zipWriter = new zip.ZipWriter(fileStream, { password: 'test', useWebWorkers: false });
  await zipWriter.add('test.txt', new zip.TextReader('hello world'), { level: 0 });
  await zipWriter.close();

  const fileStream2 = fs.createWriteStream('test-zipcrypto.zip');
  const zipWriter2 = new zip.ZipWriter(fileStream2, { password: 'test', zipCrypto: true, useWebWorkers: false });
  await zipWriter2.add('test.txt', new zip.TextReader('hello world'), { level: 0 });
  await zipWriter2.close();
}
run();
