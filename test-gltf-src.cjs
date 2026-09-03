const fs = require('fs');
const buffer = fs.readFileSync('src/models/lyra.vrm');
const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const headerView = new DataView(data, 0, 12);
const magic = String.fromCharCode(...new Uint8Array(data, 0, 4));
const version = headerView.getUint32(4, true);
const length = headerView.getUint32(8, true);

console.log({ magic, version, length });

const chunkView = new DataView(data, 12);
let chunkIndex = 0;
const chunkLength = chunkView.getUint32(chunkIndex, true);
chunkIndex += 4;
const chunkType = chunkView.getUint32(chunkIndex, true);

console.log({ chunkLength, chunkType: chunkType.toString(16) });
if (chunkType === 0x4E4F534A) {
  console.log('JSON chunk found!');
} else {
  console.log('JSON chunk NOT found!');
}
