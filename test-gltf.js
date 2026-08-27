import fs from 'fs';

['lyra.vrm', 'lyra_dress.vrm', 'lyra_casual.vrm'].forEach(f => {
  const buffer = fs.readFileSync('public/models/' + f);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const length = view.getUint32(8, true);
  
  const chunk0Length = view.getUint32(12, true);
  const chunk0Type = view.getUint32(16, true);
  
  console.log(f, 'File Size:', buffer.length, 'Header Length:', length, 'JSON Length:', chunk0Length);
  
  try {
    const chunk1Start = 20 + chunk0Length;
    if (chunk1Start + 8 <= buffer.length) {
      const chunk1Length = view.getUint32(chunk1Start, true);
      console.log(f, 'BIN Length:', chunk1Length, 'Expected Total:', chunk1Start + 8 + chunk1Length);
    } else {
      console.log(f, 'File truncated before BIN chunk header');
    }
  } catch (e) {
    console.error(f, e.message);
  }
});
