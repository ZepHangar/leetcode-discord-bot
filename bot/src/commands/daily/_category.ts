import type { CategoryConfig } from '../../types/command.js';

// Flat top-level `/daily`; works in DMs and guilds. The category also hosts the
// card's button/modal handlers via the category:command:action customId scheme.
export default { flat: true } satisfies CategoryConfig;
