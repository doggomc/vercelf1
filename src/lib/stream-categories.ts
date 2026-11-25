/** Consolidate provider labels and recognise specific sports only when the
 * category or channel name supplies a clear signal. Generic channels stay Sports. */
export function streamCategory(category: string, title: string): string {
  const group = category.toLowerCase().replace(/[_-]+/g, ' ').trim();
  const text = `${group} ${title.toLowerCase()}`;
  const rules: Array<[RegExp, string]> = [
    [/\b(?:australian football|afl|fox footy)\b/, 'Australian Football'],
    [/\b(?:american football|nfl|ncaaf|ncaa football|college football|redzone)\b/, 'American Football'],
    [/\b(?:basketball|nba|wnba|ncaam|ncaaw|ncaab|ncaa basketball)\b/, 'Basketball'],
    [/\b(?:ice hockey|hockey|nhl)\b/, 'Hockey'],
    [/\b(?:soccer|football|fussball|premier league|la liga|bundesliga|champions league|nations league|serie a|ligue 1|europa league|mls)\b/, 'Football'],
    [/\b(?:motorsport|motorsports|formula [234e]|f[234]|motogp|moto gp|nascar|indycar|wec|wrc|imsa|supercup)\b/, 'Motorsport'],
    [/\b(?:mma|ufc|boxing|fight|fighting|combat|bellator)\b/, 'Combat Sports'],
    [/\b(?:wrestling|wwe|aew)\b/, 'Wrestling'],
    [/\b(?:baseball|mlb)\b/, 'Baseball'],
    [/\b(?:tennis|atp|wta)\b/, 'Tennis'],
    [/\b(?:cricket|ipl)\b/, 'Cricket'],
    [/\b(?:golf|pga|lpga)\b/, 'Golf'],
    [/\b(?:rugby|nrl)\b/, 'Rugby'],
    [/\b(?:cycling|cyclisme)\b/, 'Cycling'],
    [/\b(?:darts)\b/, 'Darts'],
  ];
  for (const [pattern, name] of rules) if (pattern.test(text)) return name;
  if (/24\s*\/\s*7/.test(group)) return '24/7 Channels';
  if (!group || /^(?:other|sports?|live sport|live channel|general|other sports|other live|others? \/ uncategorized)$/.test(group)) return 'Sports';
  return category.trim() || 'Sports';
}

/** Keep the motorsport shortcut prominent and children's channels last;
 * preserve the existing popularity order for everything in between. */
export function compareStreamCategories(a: [string, number], b: [string, number]): number {
  const rank = (name: string) => /^(?:motorsports?)$/i.test(name.trim()) ? 0 : /^kids$/i.test(name.trim()) ? 2 : 1;
  return rank(a[0]) - rank(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0]);
}
