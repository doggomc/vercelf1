/** Display only: source data used for session filtering and playback remains unchanged. */
type ChipSource = {
  id: string; label: string; managedAuto?: boolean; autoProvider?: string; autoTag?: string;
  special?: string; embdlol?: string; weelo?: string; gated?: boolean; stripped?: boolean;
  custom?: boolean; managedCustom?: boolean; embDisplayName?: string;
  links?: Array<{ provider?: string; quality?: number }>;
};
const providers: Record<string, string> = {
  weelo: 'RACINGLAP', ppv: 'PPV', strmfree: 'STREAMFREE', embdlol: 'EMB',
  bintv: 'BINTV', cdnlive: 'CDNLIVE', cdnlivetv: 'CDNLIVE', wikisport: 'WIKISPORT',
  ehgembxe: 'EHG', hakunamatata: 'HAKUNA', custom: 'CUSTOM',
};
/** Used only for the visual source pills; the original source remains unchanged. */
export function sourceChipDisplay(source: ChipSource): {provider: string; title: string; quality: string; is4k: boolean} {
  const firstProvider = source.links?.find(link => link.provider)?.provider || '';
  let providerId = source.autoProvider || (source.id.startsWith('emb-') || source.embdlol ? 'embdlol' : source.weelo || source.id.startsWith('weelo-') ? 'weelo' : firstProvider);
  if (!source.managedAuto && source.id === 'sky-strmfree') providerId = 'strmfree';
  if (!source.managedAuto && source.id.startsWith('wikisport')) providerId = 'wikisport';
  if (source.managedCustom || (source.custom && !providerId)) providerId = 'custom';
  providerId = providerId.replace(/-stripped$/, '');
  const provider = providers[providerId] || (providerId ? providerId.toUpperCase() : 'CUSTOM');
  let title = String(source.label || '').trim() || '-';
  let quality = '';
  if (source.managedAuto && providerId === 'ppv') {
    const match = String(source.autoTag || '').trim().match(/^(HD|FHD|UHD|4K)\s*\|\s*(.+)$/i);
    if (match) {
      quality = match[1].toUpperCase();
      title = match[2].replace(/^sky sport f1(?=\s*(?:·|$))/i, 'Sky Sports F1').trim();
    }
  }
  if (providerId === 'embdlol') {
    const names: Record<string, string> = {skyf1uk:'Sky Sports F1', skyf1:'Sky Sports F1', skyf1en:'Sky Sports F1', f1atvp:'Apple TV', f1atv:'Apple TV', f1atpv:'Apple TV', f1appletv:'Apple TV', daznf1:'DAZN', daznf1hd:'DAZN', skyf1de:'Sky DE', skyf1it:'Sky Italia', skyf1uhd:'Sky Sports F1 UHD', f1uhd:'F1 UHD', f1506:'Fox Sports 506', f1sd:'F1 SD', f1drivertracker:'Driver Tracker', f1pitlane:'Pit Lane', f1lewis:'Lewis Hamilton', f1kimi:'Kimi Antonelli', f1mixedonboard:'Mixed Onboard', f1timingchannel:'Data Channel', f1stroll:'Lance Stroll'};
    const key = title.replace(/[\s_-]+/g, '').toLowerCase();
    if (names[key]) title = names[key];
  }
  if (!source.managedAuto && providerId === 'embdlol') {
    const name = source.embdlol || '';
    const clean: Record<string, string> = {fullhd1:'F1 HD 1', fullhd3:'F1 HD 2', world:'World Feed', dazn:'DAZN', skyit:'Sky Italia', skyde:'Sky DE'};
    if (source.embDisplayName) title = source.embDisplayName;
    else if (clean[name]) title = clean[name];
  }
  // Remove only known provider suffixes; keep real broadcaster details such as (F1TV).
  title = title.replace(/\s*\((?:weelo|racinglap|emb|ppv|streamfree|strmfree|bintv|ehg)\)\s*$/i, '').trim();
  const tag = String(source.autoTag || '').trim();
  if (!quality && /^(?:HD|FHD|UHD|4K)$/i.test(tag)) quality = tag.toUpperCase();
  if (!quality && !source.managedAuto) {
    const q = source.links?.find(link => Number(link.quality) > 0)?.quality || 0;
    quality = q >= 2160 ? '4K' : q >= 1080 ? 'FHD' : q >= 720 ? 'HD' : '';
  }
  const titleQuality = title.match(/(?:^|\s)(FHD|HD)\s*$/i);
  if (titleQuality) { if (!quality) quality = titleQuality[1].toUpperCase(); title = title.slice(0, titleQuality.index).trim(); }
  const is4k = Boolean(source.gated || /\b(?:4K|UHD)\b/i.test(title) || /^(?:4K|UHD)$/.test(quality));
  if (is4k) quality = '';
  return {provider, title: title || '-', quality, is4k};
}

/** Visual badges only: do not treat EMB players as Weellz special streams. */
export function sourceSpecialBadge(source: ChipSource): 'feed' | 'data' | 'onboard' | '' {
  if (source.special === 'feed' || source.special === 'data' || source.special === 'onboard') return source.special;
  if (!source.managedAuto || source.autoProvider !== 'embdlol') return '';
  const title = sourceChipDisplay(source).title.toLowerCase();
  if (title === 'data channel') return 'data';
  if (['lewis hamilton','kimi antonelli','mixed onboard','lance stroll'].includes(title)) return 'onboard';
  return '';
}
