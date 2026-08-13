/**
 * JSX runtime for the CV2 DSL.
 *
 * Bun/TS compile JSX to `jsx(type, props)` / `jsxs(type, props)` calls against
 * this module (see tsconfig `jsxImportSource`). Tag names map to constructors
 * in `elements.ts`; unknown tags throw immediately.
 *
 * @module cv2/jsx-runtime
 */
import {
  button,
  channelSelect,
  container,
  file,
  mediaGallery,
  mediaItem,
  mentionableSelect,
  message,
  normalizeChildren,
  option,
  roleSelect,
  row,
  section,
  separator,
  stringSelect,
  textDisplay,
  thumbnail,
  userSelect,
  type ButtonStyleName,
  type CV2MessageOptions,
  type EmojiProp,
} from './elements.js';

export type { CV2MessageOptions } from './elements.js';

type Constructor = (props: never) => unknown;

const TAGS: Record<string, Constructor> = {
  message,
  container,
  section,
  'text-display': textDisplay,
  thumbnail,
  'media-gallery': mediaGallery,
  'media-item': mediaItem,
  file,
  separator,
  row,
  button,
  'string-select': stringSelect,
  option,
  'user-select': userSelect,
  'role-select': roleSelect,
  'mentionable-select': mentionableSelect,
  'channel-select': channelSelect,
};

/** Fragment marker: `<>...</>` compiles to `jsx(Fragment, { children })`. */
export const Fragment: unique symbol = Symbol('cv2.fragment');

/**
 * JSX factory. Resolves a tag name to its element constructor and invokes it.
 *
 * @precondition `type` is a known CV2 tag or `Fragment`.
 * @throws `Error("cv2: unknown element <tag>")` for unknown tags.
 */
export function jsx(type: string | typeof Fragment, props: Record<string, unknown>): unknown {
  if (type === Fragment) return normalizeChildren(props.children);
  const constructor = TAGS[type];
  if (constructor === undefined) {
    throw new Error(`cv2: unknown element <${type}>`);
  }
  return constructor(props as never);
}

export const jsxs = jsx;

interface CommonProps {
  id?: number;
  children?: unknown;
}

interface LeafProps {
  id?: number;
}

interface AutoSelectProps {
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  defaultValues?: { id: string; type: 'user' | 'role' | 'channel' }[];
  disabled?: boolean;
  id?: number;
}

export namespace JSX {
  export interface IntrinsicElements {
    message: {
      ephemeral?: boolean;
      suppressNotifications?: boolean;
      children?: unknown;
    };
    container: CommonProps & {
      accentColor?: number | null;
      spoiler?: boolean;
    };
    section: CommonProps & {
      accessory: unknown;
    };
    'text-display': CommonProps;
    thumbnail: LeafProps & {
      url: string;
      description?: string;
      spoiler?: boolean;
    };
    'media-gallery': CommonProps;
    'media-item': {
      url: string;
      description?: string;
      spoiler?: boolean;
    };
    file: LeafProps & {
      url: string;
      spoiler?: boolean;
    };
    separator: LeafProps & {
      divider?: boolean;
      spacing?: 'small' | 'large';
    };
    row: CommonProps;
    button: {
      style: ButtonStyleName;
      customId?: string;
      url?: string;
      skuId?: string;
      label?: string;
      emoji?: string | EmojiProp;
      disabled?: boolean;
      id?: number;
      children?: string | number | (string | number)[];
    };
    'string-select': AutoSelectProps & {
      children?: unknown;
    };
    option: {
      label?: string;
      value: string;
      description?: string;
      emoji?: string | EmojiProp;
      default?: boolean;
      children?: string | number | (string | number)[];
    };
    'user-select': AutoSelectProps;
    'role-select': AutoSelectProps;
    'mentionable-select': AutoSelectProps;
    'channel-select': AutoSelectProps & { channelTypes?: number[] };
  }
}
