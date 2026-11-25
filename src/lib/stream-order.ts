import { compareStreamProviders, type OtherStreamItem } from './other-streams';

const entertainment = /\b(?:sponge\s*bob|spongebob|cartoon|nickelodeon|nick\s*jr|disney|boomerang|simpsons|family guy|south park|anime|movies?|comedy|entertainment|kids|children|music|news|shows?)\b/i;
const sports = /\b(?:sport(?:s)?|football|soccer|cricket|tennis|golf|rugby|racing|motorsport|formula|motogp|nba|nfl|nhl|mlb|espn|dazn|bein|tsn|ufc|wrestling|baseball|basketball|hockey|fox footy|sky racing|rally|cycling|darts|super\s*sport)\b/i;
/** Sports channels stay up top even if they run 24/7. Unknown 24/7 channels
 * go below sporting events; explicitly named entertainment always goes below. */
export function otherStreamSection(item: Pick<OtherStreamItem,'title'|'category'|'alwaysLive'>): 'sports' | 'other' {
  const text=`${item.category} ${item.title}`;
  if (entertainment.test(text)) return 'other';
  if (sports.test(text)) return 'sports';
  return item.alwaysLive || /24\s*\/\s*7/i.test(item.category) ? 'other' : 'sports';
}
export function compareOtherStreams(a:OtherStreamItem,b:OtherStreamItem,labels:Record<OtherStreamItem['provider'],string>):number {
  return Number(otherStreamSection(a)==='other')-Number(otherStreamSection(b)==='other') || compareStreamProviders(a.provider,b.provider,labels) || a.title.localeCompare(b.title);
}
