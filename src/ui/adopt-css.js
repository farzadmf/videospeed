// Page CSP can block <style>, even in our shadow roots; constructed sheets are exempt.
// A sheet works only in the document that made it, and the top frame also builds
// controllers in same-origin child frames, so sheets are kept per document.

/** @type {WeakMap<Document, Map<string, CSSStyleSheet>>} */
const sheetsByDocument = new WeakMap();

/**
 * Add cssText to shadowRoot as a shared constructed sheet.
 * @param {ShadowRoot} shadowRoot
 * @param {string} cssText
 */
export function adoptCss(shadowRoot, cssText) {
  const doc = shadowRoot.ownerDocument;

  let sheets = sheetsByDocument.get(doc);
  if (!sheets) {
    sheets = new Map();
    sheetsByDocument.set(doc, sheets);
  }

  let sheet = sheets.get(cssText);
  if (!sheet) {
    sheet = new doc.defaultView.CSSStyleSheet();
    sheet.replaceSync(cssText);
    sheets.set(cssText, sheet);
  }

  shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, sheet];
}
