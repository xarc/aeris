import { Theme } from './theme.types';
export const THEMES: Record<Theme, Record<string, string>> = {
  dark: {
    '--s1': '#1E1E1E',
    '--s2': '#292929',
    '--s3': '#3A3A3A',
    '--s4': '#4C4C4C',
    '--s5': '#5E5E5E',
    '--s6': '#707070',
    '--s7': '#828282',

    '--s3-rgb': '58,58,58',
    '--s4-rgb': '76,76,76',

    '--t1': '#000000',
    '--t2': '#1A1A1A',
    '--t3': '#333333',
    '--t4': '#434343',
    '--t5': '#CCCCCC',
    '--t6': '#E5E5E5',
    '--t7': '#FFFFFF',

    '--p1': '#E35C1F',
    '--p2': '#EE6224',
    '--p3': '#F06E29',
    '--p4': '#F37A2E',
    '--p5': '#F68633',
    '--p6': '#F99238',
    '--p7': '#FD9E3D',

    '--p1-rgb': '227,92,31',
    '--p2-rgb': '238,98,36',
    '--p3-rgb': '240,110,41',
    '--p4-rgb': '243,122,46',
  },

  // No tema escuro, s1→s7 vai do mais escuro ao mais claro e t1→t7 do menor ao
  // maior contraste com a superfície; no claro as escalas se invertem mantendo
  // a mesma semântica (s1 = superfície principal, t6/t7 = texto principal).
  light: {
    '--s1': '#DEDEDE',
    '--s2': '#D5D5D5',
    '--s3': '#C7C7C7',
    '--s4': '#B5B5B5',
    '--s5': '#878787',
    '--s6': '#5E5E5E',
    '--s7': '#454545',

    '--s3-rgb': '199,199,199',
    '--s4-rgb': '181,181,181',

    // t1 é o texto sobre botões laranja (preto nos dois temas); t2/t3 são
    // fundos de hover (levemente mais escuros que s1/s2); t4 é o cinza
    // neutro de placeholders e badges.
    '--t1': '#000000',
    '--t2': '#CBCBCB',
    '--t3': '#C8C8C8',
    '--t4': '#808080',
    '--t5': '#4A4A4A',
    '--t6': '#1F1F1F',
    '--t7': '#000000',

    // p5–p7 escurecem (em vez de clarear) para manterem contraste como
    // texto/fundo sobre superfícies claras.
    '--p1': '#E35C1F',
    '--p2': '#EE6224',
    '--p3': '#F06E29',
    '--p4': '#F37A2E',
    '--p5': '#D95318',
    '--p6': '#C94C15',
    '--p7': '#B84512',

    '--p1-rgb': '227,92,31',
    '--p2-rgb': '238,98,36',
    '--p3-rgb': '240,110,41',
    '--p4-rgb': '243,122,46',
  },
};

export const THEME_KEY = 'rv-sim.theme';
