/**
 * CV2 element constructors.
 *
 * Every constructor takes camelCase props and returns a plain snake_case
 * Discord API JSON object (discord-api-types shape). Invalid input throws
 * `Error("cv2: <reason>")` immediately — construction time is when the
 * layout is wrong, not when Discord rejects the payload.
 *
 * @module cv2/elements
 */
import type {
  APIActionRowComponent,
  APIButtonComponent,
  APIChannelSelectComponent,
  APIComponentInMessageActionRow,
  APIContainerComponent,
  APIFileComponent,
  APIMediaGalleryComponent,
  APIMediaGalleryItem,
  APIMentionableSelectComponent,
  APIMessageTopLevelComponent,
  APIRoleSelectComponent,
  APISectionComponent,
  APISelectMenuOption,
  APISeparatorComponent,
  APIStringSelectComponent,
  APITextDisplayComponent,
  APIThumbnailComponent,
  APIUserSelectComponent,
} from 'discord.js';

/** Named button styles accepted by the DSL. */
export type ButtonStyleName = 'primary' | 'secondary' | 'success' | 'danger' | 'link' | 'premium';

/** Structured emoji prop; a plain string is also accepted and treated as `name`. */
export interface EmojiProp {
  id?: string;
  name: string;
  animated?: boolean;
}

/** A constructed message ready to pass to `interaction.reply()` / `channel.send()`. */
export interface CV2MessageOptions {
  components: APIMessageTopLevelComponent[];
  /** 32768 (Components V2) | 64 (ephemeral) | 4096 (suppress notifications). */
  flags: number;
}

const BUTTON_STYLE: Record<ButtonStyleName, number> = {
  primary: 1,
  secondary: 2,
  success: 3,
  danger: 4,
  link: 5,
  premium: 6,
};

/** Object identity markers for children that carry no `type` field (media items, select options). */
const mediaItemMarker = new WeakSet<object>();
const optionMarker = new WeakSet<object>();

/**
 * Calculate UTF-8 byte length for string fields to accurately match Discord API limits.
 */
function strLen(str: string | undefined): number {
  if (typeof str !== 'string') return 0;
  return Buffer.byteLength(str, 'utf8');
}

/**
 * Flatten nested JSX children into a single array, dropping `null`,
 * `undefined`, and booleans so `{cond && <…/>}` works.
 *
 * @postcondition The result contains no arrays, nulls, undefineds, or booleans.
 */
export function normalizeChildren(children: unknown): unknown[] {
  const out: unknown[] = [];
  const walk = (value: unknown): void => {
    if (value === null || value === undefined || typeof value === 'boolean') return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    out.push(value);
  };
  walk(children);
  return out;
}

function fail(reason: string): never {
  throw new Error(`cv2: ${reason}`);
}

function assertRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${what} must be a constructed element object`);
  }
  return value as Record<string, unknown>;
}

function typeOf(value: unknown, what: string): number {
  const record = assertRecord(value, what);
  if (typeof record.type !== 'number') fail(`${what} must be a constructed element object`);
  return record.type;
}

function resolveEmoji(emoji: string | EmojiProp | undefined): EmojiProp | undefined {
  if (emoji === undefined) return undefined;
  if (typeof emoji === 'string') return { name: emoji };
  if (typeof emoji.name !== 'string' || strLen(emoji.name) === 0) fail('emoji requires a name');
  return emoji;
}

/**
 * Helper to process text/string children for components like `<button>` or `<option>`
 * that can accept string/number children as their label.
 */
function resolveLabelFromProps(
  propsLabel: string | undefined,
  rawChildren: unknown,
  tagName: string,
): string | undefined {
  const children = normalizeChildren(rawChildren);
  if (children.length === 0) return propsLabel;

  const childText = children
    .map((part) => {
      if (typeof part === 'object') fail(`<${tagName}> children must be string or number`);
      return String(part);
    })
    .join('');

  if (propsLabel !== undefined && propsLabel !== childText) {
    fail(`<${tagName}> cannot specify both label prop and different children`);
  }

  return childText;
}

/**
 * Disallow children on elements that do not accept nested content.
 */
function rejectChildren(rawChildren: unknown, tagName: string): void {
  if (normalizeChildren(rawChildren).length > 0) {
    fail(`<${tagName}> does not accept children`);
  }
}

/**
 * `<text-display>` — a block of markdown text.
 *
 * @precondition All children are strings or numbers.
 * @postcondition Returns `{ type: 10, content }` with children joined by "".
 * @throws if any child is an object (no implicit text wrapping elsewhere — layout mistakes fail loudly).
 */
export function textDisplay(props: { children?: unknown; id?: number }): APITextDisplayComponent {
  const parts = normalizeChildren(props.children);
  const content = parts
    .map((part) => {
      if (typeof part === 'object') fail('<text-display> accepts only string children');
      return String(part);
    })
    .join('');
  const out: Record<string, unknown> = { type: 10, content };
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APITextDisplayComponent;
}

/**
 * `<thumbnail>` — a small image, usable standalone or as a section accessory.
 *
 * @precondition `url` is a non-empty string; `description` ≤ 1024 UTF-8 bytes.
 */
export function thumbnail(props: {
  url: string;
  description?: string;
  spoiler?: boolean;
  id?: number;
  children?: unknown;
}): APIThumbnailComponent {
  rejectChildren(props.children, 'thumbnail');
  if (typeof props.url !== 'string' || props.url.length === 0) fail('<thumbnail> requires url');
  if (props.description !== undefined && strLen(props.description) > 1024) {
    fail('<thumbnail> description must be ≤ 1024 characters');
  }
  const out: Record<string, unknown> = { type: 11, media: { url: props.url } };
  if (props.description !== undefined) out.description = props.description;
  if (props.spoiler !== undefined) out.spoiler = props.spoiler;
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APIThumbnailComponent;
}

/**
 * `<button>` — styles primary/secondary/success/danger/link/premium.
 * Supports string/number children as label if `label` prop is absent.
 *
 * @precondition Mutual exclusion per style: styles 1–4 require `customId` (1–100 chars)
 *   and forbid `url`/`skuId`; `link` requires `url` (≤512) and forbids `customId`/`skuId`;
 *   `premium` requires `skuId` and forbids `customId`/`url`/`label`/`emoji`.
 *   `label` ≤ 80 UTF-8 bytes when present.
 */
export function button(props: {
  style: ButtonStyleName;
  customId?: string;
  url?: string;
  skuId?: string;
  label?: string;
  emoji?: string | EmojiProp;
  disabled?: boolean;
  id?: number;
  children?: unknown;
}): APIButtonComponent {
  const style = BUTTON_STYLE[props.style];
  if (style === undefined) fail(`<button> unknown style "${String(props.style)}"`);

  const label = resolveLabelFromProps(props.label, props.children, 'button');
  if (label !== undefined && strLen(label) > 80) fail('<button> label must be ≤ 80 characters');

  const out: Record<string, unknown> = { type: 2, style };
  if (style <= 4) {
    if (props.customId === undefined || strLen(props.customId) < 1 || strLen(props.customId) > 100) {
      fail('<button> customId (1-100 characters) is required for this style');
    }
    if (props.url !== undefined || props.skuId !== undefined) {
      fail('<button> url/skuId are only valid for link/premium styles');
    }
    out.custom_id = props.customId;
  } else if (style === 5) {
    if (typeof props.url !== 'string' || props.url.length === 0 || strLen(props.url) > 512) {
      fail('<button style="link"> requires url (≤ 512 characters)');
    }
    if (props.customId !== undefined || props.skuId !== undefined) {
      fail('<button style="link"> forbids customId/skuId');
    }
    out.url = props.url;
  } else {
    if (typeof props.skuId !== 'string' || props.skuId.length === 0) {
      fail('<button style="premium"> requires skuId');
    }
    if (
      props.customId !== undefined ||
      props.url !== undefined ||
      label !== undefined ||
      props.emoji !== undefined
    ) {
      fail('<button style="premium"> forbids customId/url/label/emoji');
    }
    out.sku_id = props.skuId;
  }

  if (label !== undefined) out.label = label;
  const emoji = resolveEmoji(props.emoji);
  if (emoji !== undefined) out.emoji = emoji;
  if (props.disabled !== undefined) out.disabled = props.disabled;
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APIButtonComponent;
}

/**
 * `<section>` — 1–3 text displays beside one accessory (button or thumbnail).
 *
 * @precondition `accessory` is a constructed button (type 2) or thumbnail (type 11);
 *   children are 1–3 text displays (type 10).
 */
export function section(props: { accessory?: unknown; children?: unknown; id?: number }): APISectionComponent {
  if (props.accessory === undefined || props.accessory === null) {
    fail('<section> requires 1-3 <text-display> children and a button/thumbnail accessory');
  }
  const accessoryType = typeOf(props.accessory, '<section> accessory');
  const children = normalizeChildren(props.children);
  const valid =
    (accessoryType === 2 || accessoryType === 11) &&
    children.length >= 1 &&
    children.length <= 3 &&
    children.every((child) => {
      try {
        return typeOf(child, '<section> child') === 10;
      } catch {
        return false;
      }
    });
  if (!valid) fail('<section> requires 1-3 <text-display> children and a button/thumbnail accessory');
  const out: Record<string, unknown> = {
    type: 9,
    components: children,
    accessory: props.accessory,
  };
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APISectionComponent;
}

/**
 * `<media-item>` — one image inside a `<media-gallery>`. Not a component.
 *
 * @precondition `url` is a non-empty string.
 */
export function mediaItem(props: {
  url: string;
  description?: string;
  spoiler?: boolean;
  children?: unknown;
}): APIMediaGalleryItem {
  rejectChildren(props.children, 'media-item');
  if (typeof props.url !== 'string' || props.url.length === 0) fail('<media-item> requires url');
  const out: Record<string, unknown> = { media: { url: props.url } };
  if (props.description !== undefined) out.description = props.description;
  if (props.spoiler !== undefined) out.spoiler = props.spoiler;
  const item = out as unknown as APIMediaGalleryItem;
  mediaItemMarker.add(item as object);
  return item;
}

/**
 * `<media-gallery>` — 1–10 media items.
 *
 * @precondition Children are 1–10 `<media-item>` results.
 */
export function mediaGallery(props: { children?: unknown; id?: number }): APIMediaGalleryComponent {
  const items = normalizeChildren(props.children);
  const valid =
    items.length >= 1 &&
    items.length <= 10 &&
    items.every((item) => typeof item === 'object' && item !== null && mediaItemMarker.has(item));
  if (!valid) fail('<media-gallery> requires 1-10 <media-item> children');
  const out: Record<string, unknown> = { type: 12, items };
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APIMediaGalleryComponent;
}

/**
 * `<file>` — an attached file displayed in the message.
 *
 * @precondition `url` starts with `attachment://`.
 */
export function file(props: { url: string; spoiler?: boolean; id?: number; children?: unknown }): APIFileComponent {
  rejectChildren(props.children, 'file');
  if (typeof props.url !== 'string' || !props.url.startsWith('attachment://')) {
    fail('<file> url must start with "attachment://"');
  }
  const out: Record<string, unknown> = { type: 13, file: { url: props.url } };
  if (props.spoiler !== undefined) out.spoiler = props.spoiler;
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APIFileComponent;
}

/**
 * `<separator>` — a visual divider.
 *
 * @precondition `spacing`, if present, is "small" or "large" (→ 1 | 2).
 */
export function separator(props: {
  divider?: boolean;
  spacing?: 'small' | 'large';
  id?: number;
  children?: unknown;
}): APISeparatorComponent {
  rejectChildren(props.children, 'separator');
  const out: Record<string, unknown> = { type: 14 };
  if (props.divider !== undefined) out.divider = props.divider;
  if (props.spacing !== undefined) {
    if (props.spacing !== 'small' && props.spacing !== 'large') {
      fail('<separator> spacing must be "small" or "large"');
    }
    out.spacing = props.spacing === 'small' ? 1 : 2;
  }
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APISeparatorComponent;
}

const SELECT_TYPES = new Set([3, 5, 6, 7, 8]);

/**
 * `<row>` — an action row: either 1–5 buttons OR exactly 1 select menu.
 *
 * @precondition Children are all buttons (type 2, max 5) or a single select (type 3/5/6/7/8).
 */
export function row(props: { children?: unknown; id?: number }): APIActionRowComponent<APIComponentInMessageActionRow> {
  const children = normalizeChildren(props.children);
  let valid = false;
  if (children.length >= 1 && children.length <= 5) {
    const types = children.map((child) => {
      try {
        return typeOf(child, '<row> child');
      } catch {
        return -1;
      }
    });
    valid =
      types.every((type) => type === 2) || (types.length === 1 && SELECT_TYPES.has(types[0] as number));
  }
  if (!valid) fail('<row> requires 1-5 <button> children or exactly 1 select menu');
  const out: Record<string, unknown> = { type: 1, components: children };
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APIActionRowComponent<APIComponentInMessageActionRow>;
}

const CONTAINER_CHILD_TYPES = new Set([1, 9, 10, 12, 13, 14]);

/**
 * `<container>` — the V2 card. Wraps rows, sections, text, galleries, files, separators.
 *
 * @precondition Children are rows/sections/text-displays/media-galleries/files/separators;
 *   nesting a container is an error. `accentColor` is an integer 0x000000–0xFFFFFF or null.
 */
export function container(props: {
  accentColor?: number | null;
  spoiler?: boolean;
  children?: unknown;
  id?: number;
}): APIContainerComponent {
  const children = normalizeChildren(props.children);
  for (const child of children) {
    const type = typeOf(child, '<container> child');
    if (type === 17) fail('<container> cannot contain another <container>');
    if (!CONTAINER_CHILD_TYPES.has(type)) {
      fail('<container> children must be row/section/text-display/media-gallery/file/separator');
    }
  }
  if (props.accentColor !== undefined && props.accentColor !== null) {
    if (!Number.isInteger(props.accentColor) || props.accentColor < 0 || props.accentColor > 0xffffff) {
      fail('<container> accentColor must be an integer 0x000000-0xFFFFFF or null');
    }
  }
  const out: Record<string, unknown> = { type: 17, components: children };
  if (props.accentColor !== undefined) out.accent_color = props.accentColor;
  if (props.spoiler !== undefined) out.spoiler = props.spoiler;
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APIContainerComponent;
}

/**
 * `<option>` — one option inside a `<string-select>`. Not a component.
 * Supports string/number children as label if `label` prop is absent.
 *
 * @precondition `label`/`value`/`description` ≤ 100 UTF-8 bytes.
 */
export function option(props: {
  label?: string;
  value: string;
  description?: string;
  emoji?: string | EmojiProp;
  default?: boolean;
  children?: unknown;
}): APISelectMenuOption {
  const label = resolveLabelFromProps(props.label, props.children, 'option');
  if (typeof label !== 'string' || strLen(label) < 1 || strLen(label) > 100) {
    fail('<option> label must be 1-100 characters');
  }
  if (typeof props.value !== 'string' || props.value.length < 1 || strLen(props.value) > 100) {
    fail('<option> value must be 1-100 characters');
  }
  if (props.description !== undefined && strLen(props.description) > 100) {
    fail('<option> description must be ≤ 100 characters');
  }
  const out: Record<string, unknown> = { label, value: props.value };
  if (props.description !== undefined) out.description = props.description;
  const emoji = resolveEmoji(props.emoji);
  if (emoji !== undefined) out.emoji = emoji;
  if (props.default !== undefined) out.default = props.default;
  const opt = out as unknown as APISelectMenuOption;
  optionMarker.add(opt as object);
  return opt;
}

function validateSelectBounds(props: { minValues?: number; maxValues?: number }, tag: string): void {
  for (const [key, value] of [
    ['minValues', props.minValues],
    ['maxValues', props.maxValues],
  ] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 25)) {
      fail(`<${tag}> ${key} must be an integer 0-25`);
    }
  }
}

interface AutoSelectProps {
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  defaultValues?: { id: string; type: 'user' | 'role' | 'channel' }[];
  disabled?: boolean;
  id?: number;
  children?: unknown;
}

function autoSelect(
  type: 5 | 6 | 7 | 8,
  tag: string,
  props: AutoSelectProps,
): APIUserSelectComponent | APIRoleSelectComponent | APIMentionableSelectComponent | APIChannelSelectComponent {
  rejectChildren(props.children, tag);
  if (typeof props.customId !== 'string' || strLen(props.customId) < 1 || strLen(props.customId) > 100) {
    fail(`<${tag}> customId must be 1-100 characters`);
  }
  if (props.placeholder !== undefined && strLen(props.placeholder) > 100) {
    fail(`<${tag}> placeholder must be ≤ 100 characters`);
  }
  validateSelectBounds(props, tag);
  const out: Record<string, unknown> = { type, custom_id: props.customId };
  if (props.placeholder !== undefined) out.placeholder = props.placeholder;
  if (props.minValues !== undefined) out.min_values = props.minValues;
  if (props.maxValues !== undefined) out.max_values = props.maxValues;
  if (props.defaultValues !== undefined) out.default_values = props.defaultValues;
  if (props.disabled !== undefined) out.disabled = props.disabled;
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APIUserSelectComponent;
}

/** `<string-select>` — a select menu with 1–25 `<option>` children. */
export function stringSelect(props: {
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
  children?: unknown;
  id?: number;
}): APIStringSelectComponent {
  const options = normalizeChildren(props.children);
  const valid =
    options.length >= 1 &&
    options.length <= 25 &&
    options.every((opt) => typeof opt === 'object' && opt !== null && optionMarker.has(opt));
  if (!valid) fail('<string-select> requires 1-25 <option> children');
  if (typeof props.customId !== 'string' || strLen(props.customId) < 1 || strLen(props.customId) > 100) {
    fail('<string-select> customId must be 1-100 characters');
  }
  if (props.placeholder !== undefined && strLen(props.placeholder) > 100) {
    fail('<string-select> placeholder must be ≤ 100 characters');
  }
  validateSelectBounds(props, 'string-select');
  const out: Record<string, unknown> = { type: 3, custom_id: props.customId, options };
  if (props.placeholder !== undefined) out.placeholder = props.placeholder;
  if (props.minValues !== undefined) out.min_values = props.minValues;
  if (props.maxValues !== undefined) out.max_values = props.maxValues;
  if (props.disabled !== undefined) out.disabled = props.disabled;
  if (props.id !== undefined) out.id = props.id;
  return out as unknown as APIStringSelectComponent;
}

/** `<user-select>` — a user select menu. */
export function userSelect(props: AutoSelectProps): APIUserSelectComponent {
  return autoSelect(5, 'user-select', props) as APIUserSelectComponent;
}

/** `<role-select>` — a role select menu. */
export function roleSelect(props: AutoSelectProps): APIRoleSelectComponent {
  return autoSelect(6, 'role-select', props) as APIRoleSelectComponent;
}

/** `<mentionable-select>` — a user-or-role select menu. */
export function mentionableSelect(props: AutoSelectProps): APIMentionableSelectComponent {
  return autoSelect(7, 'mentionable-select', props) as APIMentionableSelectComponent;
}

/** `<channel-select>` — a channel select menu; `channelTypes` restricts pickable channel types. */
export function channelSelect(props: AutoSelectProps & { channelTypes?: number[] }): APIChannelSelectComponent {
  const out = autoSelect(8, 'channel-select', props) as unknown as Record<string, unknown>;
  if (props.channelTypes !== undefined) out.channel_types = props.channelTypes;
  return out as unknown as APIChannelSelectComponent;
}

const MAX_COMPONENTS = 40;
const MAX_TEXT_LENGTH = 4000;

/** Count a component plus its nested `components` and `accessory` (media-gallery items do not count). */
function countComponents(node: unknown): number {
  if (typeof node !== 'object' || node === null) return 0;
  const record = node as { components?: unknown[]; accessory?: unknown };
  let count = 1;
  if (Array.isArray(record.components)) {
    for (const child of record.components) count += countComponents(child);
  }
  if (record.accessory !== undefined) count += countComponents(record.accessory);
  return count;
}

/**
 * Sum UTF-8 text length across all text fields (content, label, placeholder, description)
 * and all nested components/items/options recursively.
 */
function sumTextLength(node: unknown): number {
  if (typeof node !== 'object' || node === null) return 0;
  const record = node as Record<string, unknown>;
  let sum = 0;

  if (typeof record.content === 'string') sum += strLen(record.content);
  if (typeof record.label === 'string') sum += strLen(record.label);
  if (typeof record.placeholder === 'string') sum += strLen(record.placeholder);
  if (typeof record.description === 'string') sum += strLen(record.description);

  if (Array.isArray(record.items)) {
    for (const item of record.items) {
      if (typeof item === 'object' && item !== null) {
        const desc = (item as Record<string, unknown>).description;
        if (typeof desc === 'string') sum += strLen(desc);
      }
    }
  }

  if (Array.isArray(record.options)) {
    for (const opt of record.options) {
      if (typeof opt === 'object' && opt !== null) {
        const o = opt as Record<string, unknown>;
        if (typeof o.label === 'string') sum += strLen(o.label);
        if (typeof o.description === 'string') sum += strLen(o.description);
      }
    }
  }

  if (Array.isArray(record.components)) {
    for (const child of record.components) sum += sumTextLength(child);
  }
  if (record.accessory !== undefined) sum += sumTextLength(record.accessory);

  return sum;
}

/**
 * `<message>` — the root element. Evaluates to `{ components, flags }` passable
 * directly to `interaction.reply()` / `channel.send()`.
 *
 * @precondition At least one component child; total recursive component count ≤ 40;
 *   combined text content across all components ≤ 4000 UTF-8 bytes.
 * @postcondition `flags` = 32768 | (ephemeral ? 64 : 0) | (suppressNotifications ? 4096 : 0).
 */
export function message(props: {
  ephemeral?: boolean;
  suppressNotifications?: boolean;
  children?: unknown;
}): CV2MessageOptions {
  const components = normalizeChildren(props.children) as APIMessageTopLevelComponent[];
  if (components.length === 0) fail('<message> requires at least one component child');
  const count = components.reduce((sum, component) => sum + countComponents(component), 0);
  if (count > MAX_COMPONENTS) {
    fail(`<message> has ${count} components; Discord allows at most ${MAX_COMPONENTS}`);
  }
  const textLength = components.reduce((sum, component) => sum + sumTextLength(component), 0);
  if (textLength > MAX_TEXT_LENGTH) {
    fail(`<message> has ${textLength} characters of text; Discord allows at most ${MAX_TEXT_LENGTH}`);
  }
  const flags = 32768 | (props.ephemeral ? 64 : 0) | (props.suppressNotifications ? 4096 : 0);
  return { components, flags };
}
