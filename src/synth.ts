import fs from 'fs';
import WavEncoder from 'wav-encoder';

type SylInfo = {
  v_delay: boolean;
  stress: boolean;
  geminate: boolean;
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
  z: 'z', s: 'z', l: 'z',
  x: 'x', c: 'x', r: 'x',
  b: 'b', p: 'b', m: 'b',
  g: 'g', k: 'g', w: 'g',
  d: 'd', t: 'd', n: 'd',
  v: 'v', f: 'v', y: 'v', 
};

const smplr = /[lrmwny]/g;
const cvcdr = /[zxbgdv]/g;
const cdvcr = /[scpktf]/g;
const cnsr = /[lrmwnyscpktfzxbgdv]/g;
const vwlr = /[aoui]/g;
const sylr = /'?h?(?:[lrmwny]e?[aoui]?|[scpktfzxbgdv]e?[aoui])/g;
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
      const geminate = syl.includes('e');
      const stress = syl.includes("'");
      const cmatch = (cnsr.exec(syl) as RegExpExecArray)[0];
      const C: any = cmap[cmatch as keyof typeof cmap];
      const vmatch = vwlr.exec(syl);
      const V: any = vmatch ? vmatch[0] : '';
      const type = smplr.test(syl) ? (V ? 2 : 1) :
                   cvcdr.test(syl) ? 4 : 3;

      return {
        epenthetic: '',
        v_delay, geminate,
        stress, type, C, V,
      };
    })
  );

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

// 8 chunks = 1/5 of a second
// 40 chunks per second

const sampleRate = 44100; // per second
const samplesPerChunk = sampleRate / 40;
const samples: number[] = [];

function chunks(sample: number, base: number, max: number, count: number, channels: ((s: number, b: number) => number)[]) {
  const t = sample + samplesPerChunk * count;
  for (; sample < t; sample++) {
    samples[sample] = max * channels.reduce((a, c) => a + c(sample, base), 0);
  }
  return sample;
}

function sawtooth(m: number) {
  // 2(t/p - floor[1/2+t/p]);
  return (t: number, b: number) => {
    const p = sampleRate / (b * m);
    return (1/4) * 2 * (t/p - Math.floor(0.5 + t/p));
  };
}

const v_channel = (s: number, b: number) => (1/2) * Math.sin(s * b * 2 * Math.PI / sampleRate);
const a_channel = sawtooth(4/3);
const o_channel = sawtooth(3/2);
const u_channel = sawtooth(5/3);
const i_channel = sawtooth(2);

const epenthetics = {
  e: [],
  a: [a_channel],
  o: [o_channel],
  u: [u_channel],
  i: [i_channel],
};

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

  const vowel = syl.V === 'a' ? a_channel :
                syl.V === 'o' ? o_channel :
                syl.V === 'u' ? u_channel :
                /*syl.V === 'i' ?*/i_channel;
  if (syl.v_delay) {
    // insert consonant formants without voice bar for 2 chunks
    sample = chunks(sample, base, max, 2, consonant);
  }
  switch(syl.type) {
    case 1:
      // insert 3 or 5 chunks of consonant with voicing
      // and 3 chunks of consonant without voicing
      sample = chunks(sample, base, max, syl.geminate ? 3 : 5, [v_channel, ...consonant]);
      sample = chunks(sample, base, max, 3, consonant);
      break;
    case 2:
      {
        const l = syl.geminate ? 4 : 3;
        // insert equal-length chunks of consonant and vowel with voicing
        sample = chunks(sample, base, max, l, [v_channel, ...consonant]);
        sample = chunks(sample, base, max, l, [v_channel, vowel]);
      }
      break;
    case 3:
      // insert 2 or 4 chunks of consonant with voicing
      // and 2 chunks of consonant without voicing
      // and 2 chunks of vowel without voicing
      sample = chunks(sample, base, max, syl.geminate ? 4 : 2, [v_channel, ...consonant]);
      sample = chunks(sample, base, max, 2, consonant);
      sample = chunks(sample, base, max, 2, [vowel]);
      break;
    case 4:
      {
        const l = syl.geminate ? 3 : 2;
        // insert equal-length chunks of consonant and vowel with voicing
        sample = chunks(sample, base, max, l, [v_channel, ...consonant]);
        sample = chunks(sample, base, max, l, [v_channel, vowel]);
      }
      // and 2 chunks of vowel without voicing
      sample = chunks(sample, base, max, 2, [vowel]);
      break;
  }
  if (syl.epenthetic) {
    sample = chunks(sample, base, max, 1, epenthetics[syl.epenthetic]);
  }
}

WavEncoder.encode({
  sampleRate,
  channelData: [new Float32Array(samples)],
}).then((buffer) => {
  fs.writeFileSync("noise.wav", new Uint8Array(buffer));
});