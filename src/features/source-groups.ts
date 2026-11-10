/** Source tiers affect presentation and fallback priority, not the saved source ordering. */
export type SourceTier = 'main' | 'backup' | 'custom';
type SourceLike = {
  id: string;
  hidden?: boolean;
  managedCustom?: boolean;
  special?: string;
  lang?: string;
  links?: Array<{ provider?: string }>;
  base?: { links: Array<{ provider?: string }> };
};
const MAIN_PROVIDERS = new Set(['strmfree', 'weelo', 'weelo-stripped', 'embdlol', 'embdlol-stripped', 'ppv', 'ppv-stripped', 'taifood']);

export function sourceTier(source: SourceLike): SourceTier {
  if (source.managedCustom || source.id.startsWith('custom-')) return 'custom';
  if (source.id === 'sky-uk' || source.id.startsWith('emb-') || source.id.startsWith('weelo-')) return 'main';
  const links = source.base?.links || source.links || [];
  return links.some(link => MAIN_PROVIDERS.has(link.provider || '')) ? 'main' : 'backup';
}

/** Keep the selected feed first, then main feeds, custom feeds and backups. Onboards and
 * other-language feeds never become accidental automatic substitutes for a broadcast. */
export function sourceFallbackOrder(sources: SourceLike[], selected: number): number[] {
  const chosen = sources[selected];
  if (!chosen || chosen.hidden) return [];
  const lang = chosen.lang || 'en';
  const rest = sources.map((source, index) => ({ source, index }))
    .filter(({ source, index }) => index !== selected && !source.hidden && !source.special && (source.lang || 'en') === lang);
  const priority: Record<SourceTier, number> = { main: 0, custom: 1, backup: 2 };
  rest.sort((a, b) => priority[sourceTier(a.source)] - priority[sourceTier(b.source)] || a.index - b.index);
  return [selected, ...rest.map(({ index }) => index)];
}
