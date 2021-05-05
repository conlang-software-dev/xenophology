import { all, compatibility } from './definitions';

function genWords(syl_count: number) {
  let working: [string[], string[]][] = [];
  for (const s of all) {
    const next = compatibility(s);
    working.push([[s], next], [['h' + s], next]);
  }

  let extended: [string[], string[]][] = [];
  for (let i = 2; i < syl_count; i++) {
    for (const [syls, next] of working) {
      extended.push(...next.map(s => {
        const n = compatibility(s);
        return [[...syls, s], n] as [string[], string[]];
      }));
    }
    working = extended;
    extended = [];
  }

  const finals: string[][] = [];
  for (const [syls, next] of working) {
    finals.push(...next.flatMap(s =>
      s.length === 1 ? [] : [[...syls, s]]
    ));
  }

  for (const syls of finals) {
    for (let i = 0; i < syl_count; i++) {
      const w = syls.slice();
      w[i] = "'" + w[i];
      console.log(w.join(''));
    }
  }
}

const syl_count = parseInt(process.argv[2]);
if (syl_count === 1) {
  for (const syl of all) {
    if (!/[aoui]/g.test(syl)) continue;
    console.log('h' + syl);
    console.log(syl);
  }
} else {
  genWords(syl_count);
}
