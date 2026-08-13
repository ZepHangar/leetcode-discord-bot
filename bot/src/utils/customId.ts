import type { ParsedCustomId } from '../types/command.js';

const MAX_CUSTOM_ID_LENGTH = 100;
const PAGINATOR_PREFIX = '__pag:';
const SELECT_MENU_PREFIX = '__sel:';

export function buildCustomId(
  category: string,
  command: string,
  action: string,
  ...args: string[]
): string {
  const id = [category, command, action, ...args].join(':');

  if (id.length > MAX_CUSTOM_ID_LENGTH) {
    throw new Error(`CustomId exceeds 100 character limit: ${id}`);
  }

  return id;
}

export function parseCustomId(customId: string): ParsedCustomId {
  const parts = customId.split(':');

  if (parts.length < 3) {
    throw new Error(`Invalid customId format (need at least 3 segments): ${customId}`);
  }

  return {
    category: parts[0]!,
    command: parts[1]!,
    action: parts[2]!,
    args: parts.slice(3),
  };
}

export function buildPaginatorId(commandKey: string, page: number): string {
  return `${PAGINATOR_PREFIX}${commandKey}:${page}`;
}

export function parsePaginatorId(
  customId: string
): { commandKey: string; page: number } | null {
  if (!isPaginatorId(customId)) return null;

  const withoutPrefix = customId.slice(PAGINATOR_PREFIX.length);
  const lastColon = withoutPrefix.lastIndexOf(':');

  if (lastColon === -1) return null;

  const commandKey = withoutPrefix.slice(0, lastColon);
  const page = parseInt(withoutPrefix.slice(lastColon + 1), 10);

  if (isNaN(page)) return null;

  return { commandKey, page };
}

export function isPaginatorId(customId: string): boolean {
  return customId.startsWith(PAGINATOR_PREFIX);
}

export function buildSelectMenuId(
  commandKey: string,
  action: string,
  ...staticArgs: string[]
): string {
  const id = `${SELECT_MENU_PREFIX}${[commandKey, action, ...staticArgs].join(':')}`;

  if (id.length > MAX_CUSTOM_ID_LENGTH) {
    throw new Error(`SelectMenuId exceeds 100 character limit: ${id}`);
  }

  return id;
}

export function parseSelectMenuId(
  customId: string
): { commandKey: string; action: string; staticArgs: string[] } | null {
  if (!isSelectMenuId(customId)) return null;

  const body = customId.slice(SELECT_MENU_PREFIX.length);
  const parts = body.split(':');

  if (parts.length < 3) return null;

  const commandKey = `${parts[0]}:${parts[1]}`;
  const action = parts[2]!;
  const staticArgs = parts.slice(3);

  return { commandKey, action, staticArgs };
}

export function isSelectMenuId(customId: string): boolean {
  return customId.startsWith(SELECT_MENU_PREFIX);
}
