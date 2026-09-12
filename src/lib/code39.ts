const CODE39_PATTERNS: Record<string, string> = {
  '*': 'nwnnwnwnn',
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw',
};

export const normalizeCode39Value = (value: string): string => {
  const normalized = String(value || '').trim().toUpperCase().replace(/[^0-9A-Z-]/g, '-');
  return normalized.slice(0, 32) || 'NQ-0001';
};

export const getCode39Bars = (value: string): boolean[] => {
  const encoded = `*${normalizeCode39Value(value)}*`;
  const bars: boolean[] = [];
  encoded.split('').forEach((character, characterIndex) => {
    const pattern = CODE39_PATTERNS[character] || CODE39_PATTERNS['-'];
    pattern.split('').forEach((width, index) => {
      const isBar = index % 2 === 0;
      const count = width === 'w' ? 3 : 1;
      for (let repeat = 0; repeat < count; repeat += 1) bars.push(isBar);
    });
    if (characterIndex < encoded.length - 1) bars.push(false);
  });
  return bars;
};
