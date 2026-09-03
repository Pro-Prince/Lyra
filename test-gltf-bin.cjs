const fs = require('fs');
const buffer = fs.readFileSync('public/models/lyra.vrm');
const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const chunkView = new DataView(data, 12);
let chunkIndex = 107364; // After JSON chunk
const chunkLength = chunkView.getUint32(chunkIndex, true);
chunkIndex += 4;
const chunkType = chunkView.getUint32(chunkIndex, true);

console.log({ binChunkLength: chunkLength, binChunkType: chunkType.toString(16) });
