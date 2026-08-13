import { test, expect } from 'bun:test';
import {
  buildCustomId,
  parseCustomId,
  buildPaginatorId,
  parsePaginatorId,
  isPaginatorId,
  buildSelectMenuId,
  parseSelectMenuId,
  isSelectMenuId,
} from './customId.js';

// If this fails: the router will misroute component interactions to the wrong command
test('roundtrips a category:command:action id with args', () => {
  const id = buildCustomId('demo', 'showcase', 'increment', '42', 'abc');
  expect(id).toBe('demo:showcase:increment:42:abc');
  const parsed = parseCustomId(id);
  expect(parsed.category).toBe('demo');
  expect(parsed.command).toBe('showcase');
  expect(parsed.action).toBe('increment');
  expect(parsed.args).toEqual(['42', 'abc']);
});

// If this fails: paginator buttons can't find their command or page, breaking restart-safe pagination
test('roundtrips a paginator id, including a negative page', () => {
  expect(parsePaginatorId(buildPaginatorId('demo:toolkit', 3))).toEqual({
    commandKey: 'demo:toolkit',
    page: 3,
  });
  expect(parsePaginatorId(buildPaginatorId('demo:toolkit', -1))).toEqual({
    commandKey: 'demo:toolkit',
    page: -1,
  });
});

// If this fails: managed select menus lose their static args and handlers get garbage input
test('roundtrips a select-menu id with static args', () => {
  const id = buildSelectMenuId('demo:toolkit', 'pick', 'blue', '5');
  expect(isSelectMenuId(id)).toBe(true);
  expect(parseSelectMenuId(id)).toEqual({
    commandKey: 'demo:toolkit',
    action: 'pick',
    staticArgs: ['blue', '5'],
  });
});

// If this fails: oversized ids reach Discord and the API rejects the whole message
test('buildCustomId throws when the id exceeds 100 characters', () => {
  expect(() => buildCustomId('a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40))).toThrow(
    '100'
  );
});

// If this fails: malformed ids silently parse into wrong category/command instead of being rejected
test('parseCustomId throws on fewer than 3 segments', () => {
  expect(() => parseCustomId('demo:showcase')).toThrow('at least 3 segments');
});

// If this fails: the router hands foreign component ids to the paginator/select machinery
test('paginator and select-menu parsers return null on foreign ids', () => {
  expect(isPaginatorId('demo:showcase:increment')).toBe(false);
  expect(parsePaginatorId('demo:showcase:increment')).toBeNull();
  expect(parseSelectMenuId('demo:showcase:increment')).toBeNull();
  expect(parseSelectMenuId('__sel:onlytwo')).toBeNull();
});
