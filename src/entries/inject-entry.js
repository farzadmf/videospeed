/**
 * Page context entry point - bundles all VSC modules for injection
 * This runs in the page context with access to page APIs but not chrome.* APIs
 * All modules are loaded in dependency order to ensure proper initialization
 */

import '../utils/debug-helper.js';

// Main initialization - must be last
import '../content/inject.js';

// The modules above populate window.VSC namespace and window.VSC_controller
// No additional exports needed here - side effects handle initialization
