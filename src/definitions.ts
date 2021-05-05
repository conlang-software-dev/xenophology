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
const ao = ['za', 'zo', 'sa', 'so', 'la', 'lo', 'l', 'zea', 'zeo', 'sea', 'seo', 'lea', 'leo', 'le'];
const au = ['xa', 'xu', 'ca', 'cu', 'ra', 'ru', 'r', 'xea', 'xeu', 'cea', 'ceu', 'rea', 'reu', 're'];
const ai = ['ba', 'bi', 'pa', 'pi', 'ma', 'mi', 'm', 'bea', 'bei', 'pea', 'pei', 'mea', 'mei', 'me'];
const ou = ['go', 'gu', 'ko', 'ku', 'wo', 'wu', 'w', 'geo', 'geu', 'keo', 'keu', 'weo', 'weu', 'we'];
const oi = ['do', 'di', 'to', 'ti', 'no', 'ni', 'n', 'deo', 'dei', 'teo', 'tei', 'neo', 'nei', 'ne'];
const ui = ['vu', 'vi', 'fu', 'fi', 'yu', 'yi', 'y', 'veu', 'vei', 'feu', 'fei', 'yeu', 'yei', 'ye'];

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
 
export const all = [...ao, ...au, ...ai, ...ou, ...oi, ...ui];

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
  
export function compatibility(s: string) {
    s = s.replace('e', '');
    return cmap[s[s.length-1]];
}