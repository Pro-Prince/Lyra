const fs = require('fs');
const THREE = require('three');
// Polyfill TextDecoder
global.TextDecoder = require('util').TextDecoder;

const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');

const buffer = fs.readFileSync('public/models/lyra.vrm');
const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

try {
    const EXTENSIONS = { KHR_BINARY_GLTF: 'KHR_binary_glTF' };
    const BINARY_EXTENSION_HEADER_LENGTH = 12;
    const BINARY_EXTENSION_CHUNK_TYPES = { JSON: 0x4E4F534A, BIN: 0x004E4942 };
    
    class GLTFBinaryExtension {
        constructor(data) {
            this.name = EXTENSIONS.KHR_BINARY_GLTF;
            this.content = null;
            this.body = null;
            const headerView = new DataView(data, 0, BINARY_EXTENSION_HEADER_LENGTH);
            this.header = {
                magic: new TextDecoder().decode(new Uint8Array(data, 0, 4)),
                version: headerView.getUint32(4, true),
                length: headerView.getUint32(8, true)
            };
            if (this.header.magic !== 'glTF') {
                throw new Error('THREE.GLTFLoader: Unsupported asset.');
            } else if (this.header.version < 2) {
                throw new Error('THREE.GLTFLoader: Legacy binary file detected.');
            }
            const chunkView = new DataView(data, BINARY_EXTENSION_HEADER_LENGTH);
            let chunkIndex = 0;
            while (chunkIndex < chunkView.byteLength) {
                const chunkLength = chunkView.getUint32(chunkIndex, true);
                chunkIndex += 4;
                const chunkType = chunkView.getUint32(chunkIndex, true);
                chunkIndex += 4;
                if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON) {
                    const contentArray = new Uint8Array(data, BINARY_EXTENSION_HEADER_LENGTH + chunkIndex, chunkLength);
                    this.content = new TextDecoder().decode(contentArray);
                } else if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN) {
                    const byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;
                    this.body = data.slice(byteOffset, byteOffset + chunkLength);
                }
                chunkIndex += chunkLength;
            }
            if (this.content === null) {
                throw new Error('THREE.GLTFLoader: JSON content not found.');
            }
        }
    }
    
    new GLTFBinaryExtension(data);
    console.log("Successfully parsed without throwing JSON content not found!");
} catch (e) {
    console.error(e);
}
