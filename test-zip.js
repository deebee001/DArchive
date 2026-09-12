import * as zip from '@zip.js/zip.js';
const writer = new zip.ZipWriter(new zip.BlobWriter());
await writer.add('folder/');
await writer.add('folder/file.bin', new zip.TextReader('test'));
await writer.close();
console.log('Success');
