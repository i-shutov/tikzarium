/** SHA-256 of exact UTF-8 source bytes. Not the legacy UI FNV fingerprint.
 * Synchronous to preserve the existing patch API. Verified against node:crypto
 * and shared Rust fixtures; no dependency, network or runtime installation.
 */
const K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);
const rotr = (n: number, s: number) => (n >>> s) | (n << (32 - s));
export function computeSourceDigest(source: string): string {
  const input = new TextEncoder().encode(source);
  const data = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64);
  data.set(input); data[input.length] = 0x80;
  const view = new DataView(data.buffer);
  const bits = input.length * 8;
  view.setUint32(data.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(data.length - 4, bits >>> 0);
  const h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      w[i] = (w[i - 16] + (rotr(x,7)^rotr(x,18)^(x>>>3)) + w[i - 7] + (rotr(y,17)^rotr(y,19)^(y>>>10))) >>> 0;
    }
    let [a,b,c,d,e,f,g,z] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (z + (rotr(e,6)^rotr(e,11)^rotr(e,25)) + ((e&f)^(~e&g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a,2)^rotr(a,13)^rotr(a,22)) + ((a&b)^(a&c)^(b&c))) >>> 0;
      z=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    for (const [i,n] of [a,b,c,d,e,f,g,z].entries()) h[i] = (h[i]+n)>>>0;
  }
  return Array.from(h, n => n.toString(16).padStart(8,'0')).join('');
}

export function isWellFormedUnicode(source: string): boolean {
  for (let i = 0; i < source.length; i++) {
    const c = source.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = source.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (c >= 0xdc00 && c <= 0xdfff) return false;
  }
  return true;
}

/** Neither UTF-16 surrogate pairs nor CRLF tokens may be split by a patch. */
export function isSourceBoundary(source: string, offset: number): boolean {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > source.length) return false;
  if (offset === 0 || offset === source.length) return true;
  const prev = source.charCodeAt(offset-1), next = source.charCodeAt(offset);
  return !(prev >= 0xd800 && prev <= 0xdbff && next >= 0xdc00 && next <= 0xdfff)
    && !(prev === 13 && next === 10);
}
