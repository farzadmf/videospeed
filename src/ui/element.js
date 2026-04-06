/**
 * Register <vsc-controller> so it becomes :defined.
 *
 * Sites like Reddit hide undefined custom elements via
 * `:not(:defined) { visibility: hidden }`. Upstream dropped
 * customElements.define() to avoid es5-adapter polyfill conflicts,
 * but that only affects transpiled ES5 classes — our esbuild target
 * (Chrome 114) emits native ES6 classes, so the conflict doesn't
 * apply. Upstream has the same bug; this is a divergence we chose
 * to make.
 */
if (!customElements.get('vsc-controller')) {
  customElements.define('vsc-controller', class extends HTMLElement {});
}
