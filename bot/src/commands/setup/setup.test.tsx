import { describe, expect, test } from 'bun:test';
import type { CV2MessageOptions } from '../../cv2/index.js';
import { parseCustomId } from '../../utils/customId.js';
import { buildClearConfirmView, buildClearedView } from './setup.js';

interface Component {
  type?: number;
  content?: string;
  custom_id?: string;
  label?: string;
  components?: Component[];
}

/** Flatten every nested component in a cv2 message into a single list. */
function flatten(message: CV2MessageOptions): Component[] {
  const out: Component[] = [];
  const walk = (node: Component | undefined): void => {
    if (!node) return;
    out.push(node);
    for (const child of node.components ?? []) walk(child);
  };
  for (const child of message.components as Component[]) walk(child);
  return out;
}

function buttons(message: CV2MessageOptions): Component[] {
  return flatten(message).filter((c) => c.type === 2);
}

function text(message: CV2MessageOptions): string {
  return flatten(message)
    .filter((c) => c.type === 10)
    .map((c) => c.content ?? '')
    .join('\n');
}

describe('buildClearConfirmView', () => {
  // If this fails: the clear flow's Cancel/Confirm buttons are mislabeled or
  // misrouted, so a user could confirm a wipe with no way back (or cancel
  // without returning to the panel).
  test('renders Cancel and Confirm with routable customIds in both contexts', () => {
    for (const guildCtx of [true, false]) {
      const view = buildClearConfirmView(guildCtx);
      const list = buttons(view).map((b) => ({ id: b.custom_id, label: b.label }));
      expect(list).toEqual([
        { id: 'setup:setup:clear-cancel', label: 'Cancel' },
        { id: 'setup:setup:clear-confirm', label: 'Confirm' },
      ]);
      expect(parseCustomId('setup:setup:clear-cancel').action).toBe('clear-cancel');
      expect(parseCustomId('setup:setup:clear-confirm').action).toBe('clear-confirm');
    }
  });

  // If this fails: the confirmation step does not actually warn that the wipe
  // is permanent and irreversible.
  test('warns the wipe is permanent', () => {
    const view = buildClearConfirmView(false);
    expect(text(view)).toContain('cannot be undone');
  });
});

describe('buildClearedView', () => {
  // If this fails: the guild clear result hides the maintainer-required note
  // that the admin's personal DM configuration was not touched by the wipe.
  test('guild clear tells the admin their personal data was not touched', () => {
    const view = buildClearedView(true);
    const body = text(view);
    expect(body).toContain('Server setup cleared');
    expect(body).toContain('not touched');
  });

  // If this fails: the user clear result is scoped to the user's own data and
  // must not claim anything about server data.
  test('user clear only references personal configuration', () => {
    const view = buildClearedView(false);
    const body = text(view);
    expect(body).toContain('Personal setup cleared');
    expect(body).not.toContain('not touched');
  });

  // If this fails: the cleared state leaves the user stranded with no way back
  // to the (now empty) setup panel.
  test('cleared view offers a routable Back to setup button', () => {
    for (const guildCtx of [true, false]) {
      const view = buildClearedView(guildCtx);
      const list = buttons(view).map((b) => ({ id: b.custom_id, label: b.label }));
      expect(list).toEqual([{ id: 'setup:setup:clear-done', label: 'Back to setup' }]);
      expect(parseCustomId('setup:setup:clear-done').action).toBe('clear-done');
    }
  });
});
