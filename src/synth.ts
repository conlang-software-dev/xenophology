import fs from 'fs';
import WavEncoder from 'wav-encoder';

type SylInfo = {
  v_delay: boolean;
  stress: boolean;
  type: 1|2|3|4;
  epenthetic: 'a'|'o'|'u'|'i'|'e'|'';
  C: 'z'|'x'|'b'|'d'|'g'|'v';
  V: 'a'|'o'|'u'|'i'|'';
};

/*
1. Simple Devoiced: A single sonorant letter.
2. Simple Voiced: A sonorant letter followed by a vowel letter.
3. Complex Devoiced: A voiceless obstruent letter followed by a vowel letter.
4. Complex Voiced: A voiced obstruent letter followed by a vowel letter.

z, s, l -> ao
x, c, r -> au
b, p, m -> ai
g, k, w -> ou
d, t, n -> oi
v, f, y -> ui
*/
const cmap = {
  l: 'z',
  r: 'x',
  m: 'b',
  w: 'g',
  n: 'd',
  y: 'v',
  s: 'z',
  c: 'x',
  p: 'b',
  k: 'g',
  t: 'd',
  f: 'v',
  z: 'z',
  x: 'x',
  b: 'b',
  g: 'g',
  d: 'd',
  v: 'v',
};

const smplr = /[lrmwny]/g;
const cvcdr = /[zxbgdv]/g;
const cdvcr = /[scpktf]/g;
const cnsr = /[lrmwnyscpktfzxbgdv]/g;
const vwlr = /[aoui]/g;
const sylr = /'?h?(?:[lrmwny][aoui]?|[scpktfzxbgdv][aoui])/g;
const syls: SylInfo[] = process.argv.slice(2)
  .flatMap(s => [...s.matchAll(sylr)]
    .map(z => {  
      smplr.lastIndex = 0;
      cvcdr.lastIndex = 0;
      cdvcr.lastIndex = 0;
      cnsr.lastIndex = 0;
      vwlr.lastIndex = 0;
      const syl = z[0];
        
      const v_delay = syl.includes('h');
      const stress = syl.includes("'");
      const cmatch = (cnsr.exec(syl) as RegExpExecArray)[0];
      const C: any = cmap[cmatch as keyof typeof cmap];
      const vmatch = vwlr.exec(syl);
      const V: any = vmatch ? vmatch[0] : '';
      const type = smplr.test(syl) ? (V ? 2 : 1) :
                   cvcdr.test(syl) ? 4 : 3;

      return {
        epenthetic: '',
        v_delay, stress,
        type, C, V,
      };
    })
  );

/*
z, s, l -> ao
x, c, r -> au
b, p, m -> ai
g, k, w -> ou
d, t, n -> oi
v, f, y -> ui
*/
function epenthetic(s1: string, s2: string) {
  if (s1 === s2) return '';
  switch(s1) {
    case 'z': return (s2 === 'x' || s2 === 'b') ? 'a' :
                     (s2 === 'g' || s2 === 'd') ? 'o' : 'e';
    case 'x': return (s2 === 'z' || s2 === 'b') ? 'a' :
                     (s2 === 'g' || s2 === 'v') ? 'u' : 'e';
    case 'b': return (s2 === 'x' || s2 === 'z') ? 'a' :
                     (s2 === 'v' || s2 === 'd') ? 'i' : 'e';
    case 'g': return (s2 === 'z' || s2 === 'd') ? 'o' :
                     (s2 === 'x' || s2 === 'v') ? 'u' : 'e';
    case 'd': return (s2 === 'z' || s2 === 'g') ? 'o' :
                     (s2 === 'b' || s2 === 'v') ? 'i' : 'e';
    case 'v': return (s2 === 'x' || s2 === 'g') ? 'u' :
                     (s2 === 'b' || s2 === 'd') ? 'i' : 'e';
    case 'a': return (s2 === 'z' || s2 === 'x' || s2 === 'b') ? '' : 'e';
    case 'o': return (s2 === 'z' || s2 === 'g' || s2 === 'd') ? '' : 'e';
    case 'u': return (s2 === 'x' || s2 === 'g' || s2 === 'v') ? '' : 'e';
    case 'i': return (s2 === 'b' || s2 === 'd' || s2 === 'v') ? '' : 'e';
    default: return '';
  }
}

let sl = syls.length - 1;
for (let i = 0; i < sl; i++) {
  const syl = syls[i];
  syl.epenthetic = epenthetic(syl.V || syl.C, syls[i+1].C);
}

const len = syls.reduce((acc, syl) => {
  acc += syl.v_delay ? 2 : 0;
  acc += syl.epenthetic ? 1 : 0
  return acc + 6;
}, 0);

// 8 chunks = 1/5 of a second
// 40 chunks per second

const sampleRate = 44100; // per second
const samplesPerChunk = sampleRate / 40;
const samples = len * samplesPerChunk;
const buffer = new Float32Array(samples);

function chunk(sample: number, base: number, max: number, channels: ((s: number, b: number) => number)[]) {
  const t = sample + samplesPerChunk;
  for (; sample < t; sample++) {
    buffer[sample] = max * channels.reduce((a, c) => a + c(sample, base), 0);
  }
  return t;
}

function sawtooth(m: number) {
  return (s: number, b: number) => (2/7) * (((s * m / sampleRate) % b) / b - 0.5);
}

const v_channel = (s: number, b: number) => (3/7) * Math.sin(s * b * 2 * Math.PI / sampleRate);
const a_channel = sawtooth(4/3);
const o_channel = sawtooth(3/2);
const u_channel = sawtooth(5/3);
const i_channel = sawtooth(2);

const base = 110; // Hz
let sample = 0;
for (const syl of syls) {
  const max = syl.stress ? 1 : 0.85;
  const consonant = syl.C === 'z' ? [a_channel, o_channel] :
                    syl.C === 'x' ? [a_channel, u_channel] :
                    syl.C === 'b' ? [a_channel, i_channel] :
                    syl.C === 'd' ? [o_channel, i_channel] :
                    syl.C === 'g' ? [o_channel, u_channel] :
                    /*syl.C === 'c' ?*/ [u_channel, i_channel];
  const vcons = [v_channel, ...consonant];
  const vowel = syl.V === 'a' ? a_channel :
                syl.V === 'o' ? o_channel :
                syl.V === 'u' ? u_channel :
                /*syl.V === 'i' ?*/i_channel;
  if (syl.v_delay) {
    // insert consonant formants without voice bar for 2 chunks
    sample = chunk(sample, base, max, consonant)
    sample = chunk(sample, base, max, consonant)
  }
  switch(syl.type) {
    case 1:
      // insert 3 chunks of consonant with voicing
      sample = chunk(sample, base, max, vcons);
      sample = chunk(sample, base, max, vcons);
      sample = chunk(sample, base, max, vcons);
      // and 3 chunks of consonant without voicing
      sample = chunk(sample, base, max, consonant);
      sample = chunk(sample, base, max, consonant);
      sample = chunk(sample, base, max, consonant);
      break;
    case 2:
      // insert 3 chunks of consonant with voicing
      sample = chunk(sample, base, max, vcons);
      sample = chunk(sample, base, max, vcons);
      sample = chunk(sample, base, max, vcons);
      // and 3 chunks of vowel with voicing
      sample = chunk(sample, base, max, [v_channel, vowel]);
      sample = chunk(sample, base, max, [v_channel, vowel]);
      sample = chunk(sample, base, max, [v_channel, vowel]);
      break;
    case 3:
      // insert 2 chunks of consonant with voicing
      sample = chunk(sample, base, max, vcons);
      sample = chunk(sample, base, max, vcons);
      // and 2 chunks of consonant without voicing
      sample = chunk(sample, base, max, consonant);
      sample = chunk(sample, base, max, consonant);
      // and 2 chunks of vowel without voicing
      sample = chunk(sample, base, max, [vowel]);
      sample = chunk(sample, base, max, [vowel]);
      break;
    case 4:
      // insert 2 chunks of consonant with voicing
      sample = chunk(sample, base, max, vcons);
      sample = chunk(sample, base, max, vcons);
      // and 2 chunks of vowel with voicing
      sample = chunk(sample, base, max, [v_channel, vowel]);
      sample = chunk(sample, base, max, [v_channel, vowel]);
      // and 2 chunks of vowel without voicing
      sample = chunk(sample, base, max, [vowel]);
      sample = chunk(sample, base, max, [vowel]);
      break;
  }
  switch (syl.epenthetic) {
    case '': break;
    case 'e': sample = chunk(sample, base, max, []);
      break;
    case 'a': sample = chunk(sample, base, max, [a_channel]);
      break;
    case 'o': sample = chunk(sample, base, max, [o_channel]);
      break;
    case 'u': sample = chunk(sample, base, max, [u_channel]);
      break;
    case 'i': sample = chunk(sample, base, max, [i_channel]);
      break;
  }
}

WavEncoder.encode({
  sampleRate,
  channelData: [buffer],
}).then((buffer) => {
  fs.writeFileSync("noise.wav", new Uint8Array(buffer));
});