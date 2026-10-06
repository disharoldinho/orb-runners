/**
 * Shared guards for the window-level keyboard shortcuts (R/C restart & respawn, G ghost,
 * 1-4 emotes, Esc menu).
 */

/** True when the key event comes from a text field, so typing never drives the game. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * True when a keydown should fire a one-shot game shortcut. Skips:
 * - auto-repeat (holding R used to restart every ~30 ms, holding G flickered the ghost),
 * - Ctrl / Cmd / Alt chords, so browser shortcuts (Cmd+C copy, Ctrl+R reload,
 *   Ctrl+1 tab switch, Cmd+G find) don't also respawn, restart or emote,
 * - keys typed into a text field.
 */
export function isShortcutKey(e: KeyboardEvent): boolean {
  return !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target);
}
