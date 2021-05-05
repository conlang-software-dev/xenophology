import { all, compatibility } from "./definitions";

function genSyl(compat: string[], stress: boolean, delay: boolean, final: boolean): [string, string[]] {
  let core = compat[Math.floor(Math.random() * compat.length)];
  if (final) {
    while (!/[aoui]/g.test(core))
      core = compat[Math.floor(Math.random() * compat.length)];
  }
  const next = compatibility(core);
  return [(stress ? "'" : '') + (delay ? 'h' : '') + core, next];
}

function genWord(syl_count: number) {
  const l = Math.floor(Math.random() * syl_count) + 1;
  const s = Math.floor(Math.random() * l);
  let [syl, next] = genSyl(all, s === 0, Math.random() > 0.5, l === 1);
  const syls = [syl];
  for (let i = 1; i < l; i++) {
    [syl, next] = genSyl(next, s === i, false, i === l);
    syls.push(syl);
  }
  return syls.join('');
}

const words: string[] = [];
const syl_count = parseInt(process.argv[3]);
for (let i = parseInt(process.argv[2]); i >= 0; i--) {
  words.push(genWord(syl_count));
}
console.log(words.join(' '));