/**
 * Namespace our lodash and restore original underscore
 * This script runs after lodash is injected
 */

if (window.VSC && window._) {
  // Store our lodash in the namespace
  window.VSC._ = window._;

  // Restore the original state
  if (window.VSC.hadOriginalUnderscore) {
    window._ = window.VSC.originalUnderscore;
  } else {
    delete window._;
  }

  // Clean up our temporary storage
  delete window.VSC.originalUnderscore;
  delete window.VSC.hadOriginalUnderscore;
} else {
  console.warn('[FMVSC] Failed to namespace lodash properly');
}
