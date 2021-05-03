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
const ao = ['za', 'zo', 'sa', 'so', 'l', 'la', 'lo'];
const au = ['xa', 'xu', 'ca', 'cu', 'r', 'ra', 'ru'];
const ai = ['ba', 'bi', 'pa', 'pi', 'm', 'ma', 'mi'];
const ou = ['go', 'gu', 'ko', 'ku', 'w', 'wo', 'wu'];
const oi = ['do', 'di', 'to', 'ti', 'n', 'no', 'ni'];
const ui = ['vu', 'vi', 'fu', 'fi', 'y', 'yu', 'yi'];

const a_compat = [...ao, ...au, ...ai];
const o_compat = [...ao, ...ou, ...oi];
const u_compat = [...au, ...ou, ...ui];
const i_compat = [...ai, ...oi, ...ui];

const ao_compat = [...new Set([...a_compat, ...o_compat])];
const au_compat = [...new Set([...a_compat, ...u_compat])];
const ai_compat = [...new Set([...a_compat, ...i_compat])];
const ou_compat = [...new Set([...o_compat, ...u_compat])];
const oi_compat = [...new Set([...o_compat, ...i_compat])];
const ui_compat = [...new Set([...u_compat, ...i_compat])];

const all = [...ao, ...au, ...ai, ...ou, ...oi, ...ui];

const cmap: { [key: string]: string[]} = {
  l: ao_compat,
  r: au_compat,
  m: ai_compat,
  w: ou_compat,
  n: oi_compat,
  y: ui_compat,
  a: a_compat,
  o: o_compat,
  u: u_compat,
  i: i_compat,
};

function genSyl(compat: string[], stress: boolean, delay: boolean): [string, string[]] {
  const core = compat[Math.floor(Math.random() * compat.length)];
  const next = cmap[core[core.length-1]];
  return [(stress ? "'" : '') + (delay ? 'h' : '') + core, next];
}

function genWord(syl_count: number) {
  const l = Math.floor(Math.random() * syl_count) + 1;
  const s = Math.floor(Math.random() * l);
  let [syl, next] = genSyl(all, s === 0, Math.random() > 0.5);
  const syls = [syl];
  for (let i = 1; i < l; i++) {
    [syl, next] = genSyl(next, s === i, false);
    syls.push(syl);
  }
  return syls.join('');
}

const words = [];
const syl_count = parseInt(process.argv[3]);
for (let i = parseInt(process.argv[2]); i >= 0; i--) {
  words.push(genWord(syl_count));
}
console.log(words.join(' '));