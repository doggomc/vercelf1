/** Width available at the right of the player, leaving a gap and outer gutter. */
export function replayRailWidth(playerRight: number, containerRight: number, viewportWidth: number): number {
  const available = containerRight - playerRight - 32;
  return viewportWidth > 1100 && available >= 145 ? Math.min(320, Math.floor(available)) : 0;
}
