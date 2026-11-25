import { channelLogo } from '../lib/channel-logos';
import { channelSpriteIndex } from '../lib/channel-sprite';
import { buildPrivateCockpitHref, type OtherStreamItem } from '../lib/other-streams';
import { RACINGLAP_ICON } from '../lib/racinglap-icon';

export const PROVIDER_LABELS: Record<OtherStreamItem['provider'], string> = { matchora: 'Matchora', live24: 'Live24', esportex: 'EmbedSportex', aura: 'Aura Sports', bintv: 'BinTV', ntv: 'NTV Raptor', embdlol: 'EMB', ppv: 'PPV', strmfree: 'StreamFree', timstreams: 'TimStreams', weelo: 'RacingLap', zlive: 'ZLive' };

// Light artwork needs a dark tile; dark and mixed-colour marks keep a pale tile.
const LIGHT_SPRITES = new Set([4, 7, 16, 18, 23, 24, 30, 31, 32, 42, 47, 63, 66, 67, 68, 71, 84, 88, 90, 99, 107, 108, 128]);

const LAUNCH_ARROW_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

export function createStreamCard(item: OtherStreamItem, index: number): HTMLAnchorElement {
  const card = document.createElement('a');
  card.className = 'team-card os-stream-card';
  card.href = buildPrivateCockpitHref(item);
  card.style.setProperty('--tc', item.color);
  card.style.setProperty('--stagger', `${Math.min(index * 20, 220)}ms`);

  // A typographic channel mark keeps this directory distinctive without fetching
  // third-party logos or pretending the directory has artwork for every feed.
  const mark = document.createElement('span');
  mark.className = 'os-channel-mark';
  mark.setAttribute('aria-hidden', 'true');
  const words = item.title.match(/[\p{L}\p{N}]+/gu) || [];
  mark.textContent = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || 'TV').slice(0, 2)).toUpperCase();
  const spriteIndex = item.provider === 'weelo' ? null : channelSpriteIndex(item.title, item.subtitle);
  const logo = item.provider === 'weelo' ? RACINGLAP_ICON : spriteIndex === null ? channelLogo(item.title) : null;
  if (spriteIndex !== null) {
    mark.classList.add('has-sprite');
    if (LIGHT_SPRITES.has(spriteIndex)) mark.classList.add('is-light-logo');
    const image = document.createElement('img');
    image.src = '/assets/channel-logos/channels.webp';
    image.alt = '';
    image.loading = 'lazy';
    image.style.left = `-${(spriteIndex % 10) * 68}px`;
    image.style.top = `-${Math.floor(spriteIndex / 10) * 48}px`;
    image.addEventListener('error', () => { image.remove(); mark.classList.remove('has-sprite'); }, { once:true });
    mark.appendChild(image);
  } else if (logo) {
    const image = document.createElement('img');
    image.src = logo;
    image.alt = '';
    image.addEventListener('error', () => { image.remove(); mark.classList.remove('has-logo'); }, { once:true });
    mark.appendChild(image);
    mark.classList.add('has-logo');
  }

  const body = document.createElement('div');
  body.className = 'os-card-body';
  const provider = document.createElement('span');
  provider.className = 'os-card-provider';
  const providerName = PROVIDER_LABELS[item.provider];
  const details = (item.tag || '').split('·').map(part => part.trim()).filter(part => part && part.toLowerCase() !== providerName.toLowerCase());
  provider.textContent = [providerName, ...details].join(' · ');
  const name = document.createElement('div');
  name.className = 't-name';
  name.textContent = item.title;
  const cat = document.createElement('span');
  cat.className = 'os-card-cat';
  cat.textContent = item.category;
  body.append(provider, name, cat);

  const foot = document.createElement('div');
  foot.className = 'os-card-foot';
  const scheduled = item.status === 'scheduled';
  const badge = document.createElement('span');
  badge.className = `os-badge ${scheduled ? 'os-badge-scheduled' : item.alwaysLive ? 'os-badge-247' : 'os-badge-live'}`;
  const dot = document.createElement('span');
  dot.className = 'os-live-dot';
  dot.setAttribute('aria-hidden', 'true');
  badge.append(dot, document.createTextNode(scheduled ? 'Scheduled' : item.alwaysLive ? '24/7' : 'Live'));
  foot.appendChild(badge);
  if (scheduled && item.startAt) {
    const time = document.createElement('time');
    time.dateTime = new Date(item.startAt).toISOString();
    time.textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(item.startAt);
    foot.appendChild(time);
  } else if (item.viewers > 0) {
    const viewers = document.createElement('span');
    viewers.className = 'os-foot-viewers';
    viewers.textContent = `${item.viewers} watching`;
    foot.appendChild(viewers);
  }
  const launch = document.createElement('span');
  launch.className = 'os-launch-ico';
  launch.setAttribute('aria-hidden', 'true');
  launch.innerHTML = LAUNCH_ARROW_SVG;
  card.append(mark, body, foot, launch);
  return card;
}

