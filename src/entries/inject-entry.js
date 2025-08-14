/**
 * Page context entry point - bundles all VSC modules for injection
 * This runs in the page context with access to page APIs but not chrome.* APIs
 * All modules are loaded in dependency order to ensure proper initialization
 */

import '../shared/preserve-underscore.js';
import '../assets/pkgs/lodash-4.7.15.min.js';
import '../shared/restore-underscore.js';

import '../utils/debug-helper.js';

// Main initialization - must be last
import '../content/inject.js';

// The modules above populate window.VSC namespace and window.VSC_controller
// No additional exports needed here - side effects handle initialization
