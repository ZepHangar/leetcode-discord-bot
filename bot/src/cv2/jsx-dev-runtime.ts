/**
 * Development JSX runtime for the CV2 DSL.
 *
 * Bun's JSX transform targets `jsx-dev-runtime` (with `jsxDEV`) when
 * `NODE_ENV=development` — which includes `bun test`. The CV2 DSL has no
 * dev-only behavior, so this re-exports the production runtime.
 *
 * @module cv2/jsx-dev-runtime
 */
export { Fragment, jsx, jsxs, jsx as jsxDEV } from './jsx-runtime.js';
export type { CV2MessageOptions } from './elements.js';
