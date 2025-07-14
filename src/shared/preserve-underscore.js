/**
 * Preserve original underscore before lodash injection
 * This script runs before lodash is injected
 */

window.VSC = window.VSC || {};

// Store the original _ if it exists
window.VSC.originalUnderscore = window._;
window.VSC.hadOriginalUnderscore = Object.prototype.hasOwnProperty.call(window, '_');
