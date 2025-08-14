# Firefox Compatibility Issues for Video Speed Controller Extension

## Critical Blocking Issues

### 1. **Manifest Version & Format**
- **Current**: MV3 with Chrome-specific syntax
- **Issue**: Firefox MV3 support is incomplete; different syntax required
- **Files**: `manifest.json` (line 4: `"manifest_version": 3`)
- **Action**: Create separate `manifest-firefox.json` file

### 2. **Background Script Declaration**
- **Current**: `"service_worker": "src/background.js"` (MV3 Chrome syntax)
- **Issue**: Firefox uses different background script syntax
- **Files**: `manifest.json` (lines 21-23)
- **Action**: Use `"scripts": ["src/background.js"]` for Firefox MV2 or adjust MV3 syntax

### 3. **Extension Action vs Browser Action**
- **Current**: `"action"` field (MV3 Chrome)
- **Issue**: Firefox may require `"browser_action"` (MV2) or different MV3 implementation
- **Files**: `manifest.json` (lines 15-20)
- **Action**: Conditional manifest field based on browser

### 4. **API Namespace Differences**
- **Current**: All `chrome.*` API calls (68 instances across codebase)
- **Issue**: Firefox uses `browser.*` namespace
- **Critical APIs used**:
  - `chrome.action.setIcon` → `browser.browserAction.setIcon` (or `browser.action.setIcon`)
  - `chrome.storage.sync.*` → `browser.storage.sync.*`
  - `chrome.runtime.*` → `browser.runtime.*`
  - `chrome.tabs.*` → `browser.tabs.*`
- **Files**: `src/background.js`, `src/content/injector.js`, `src/ui/popup/popup.js`, `src/ui/options/options.js`, all options helpers
- **Action**: Replace all chrome.* with browser.* or create compatibility layer

## Implementation Requirements

### 1. **Browser Detection & Polyfill**
- Add WebExtensions polyfill or manual browser detection
- **Code pattern needed**:
  ```javascript
  const api = typeof browser !== 'undefined' ? browser : chrome;
  ```
- **Files to modify**: All files using extension APIs

### 2. **Dual Manifest Strategy**
- **Simple approach**: Create separate `manifest-firefox.json`
- **Usage**: Load extension in Firefox using the Firefox-specific manifest
- **Required changes**:
  - Background script syntax
  - Action vs browser_action
  - Permissions compatibility
  - Web accessible resources format

### 3. **Background Script Compatibility**
- **Current**: Service worker pattern (MV3)
- **Firefox needs**: Event page or persistent background (MV2) or Firefox MV3 equivalent
- **Files**: `src/background.js` (entire file needs review)
- **Key functions to verify**:
  - Tab tracking (`tabsWithControllers` Set)
  - Icon updates (`updateIcon` function)
  - Message handling (`chrome.runtime.onMessage`)
  - Tab lifecycle events

### 4. **Content Script Injection**
- **Current**: Uses `chrome.runtime.getURL()` for resource URLs
- **Issue**: Firefox equivalent needed
- **Files**: `src/content/injector.js` (lines using `chrome.runtime.getURL`)
- **Action**: Replace with `browser.runtime.getURL()` or compatibility layer

### 5. **Storage API Compatibility**
- **Current**: `chrome.storage.sync.*` throughout codebase
- **Files with storage calls**:
  - `src/ui/options/helpers/save.js`
  - `src/ui/options/helpers/restore.js`
  - `src/ui/options/helpers/toggle-speeds.js`
  - `src/ui/popup/popup.js`
  - `src/content/injector.js`
- **Action**: Replace all with `browser.storage.sync.*`

### 6. **Message Passing**
- **Current**: `chrome.runtime.sendMessage`, `chrome.runtime.onMessage`
- **Files**: `src/background.js`, `src/content/injector.js`
- **Action**: Replace with `browser.runtime.*` equivalents

## Specific Code Locations Requiring Changes

### `manifest.json`
- Line 4: `"manifest_version"`
- Lines 15-20: `"action"` → `"browser_action"`
- Lines 21-23: `"background"` service worker syntax
- Lines 32-42: `"web_accessible_resources"` format verification

### `src/background.js`
- Lines 25, 31, 37: `chrome.action.setIcon` calls
- Lines 67, 85, 102: `chrome.runtime.onMessage`, `chrome.tabs.onUpdated`, `chrome.tabs.onRemoved`
- Lines 115, 125, 135: `chrome.runtime.onStartup`, `chrome.runtime.onInstalled`
- Line 142: `chrome.action.setIcon`

### `src/content/injector.js`
- Lines 18, 22: `chrome.runtime.getURL` calls
- Lines 95, 115: `chrome.storage.sync.set`, `chrome.storage.sync.get`
- Lines 125, 145: `chrome.runtime.sendMessage` calls
- Line 185: `chrome.storage.sync.get`

### UI Files
- `src/ui/popup/popup.js`: All chrome.* calls
- `src/ui/options/options.js`: Storage API calls
- All files in `src/ui/options/helpers/`: Storage API calls

## Testing Checklist

### Functional Testing
- [ ] Extension loads in Firefox
- [ ] Background script initializes
- [ ] Content scripts inject properly
- [ ] Video controls appear on HTML5 videos
- [ ] Keyboard shortcuts work
- [ ] Settings save/load correctly
- [ ] Popup opens and functions
- [ ] Options page accessible and functional

### API Testing
- [ ] Storage sync works
- [ ] Message passing between contexts
- [ ] Tab management and tracking
- [ ] Icon updates work
- [ ] Web accessible resources load

### Cross-Browser Testing
- [ ] Chrome functionality unchanged (using manifest.json)
- [ ] Firefox functionality matches Chrome (using manifest-firefox.json)

## Simple Implementation Approach

### File Structure (No Build System Needed)
```
├── manifest.json (Chrome - existing)
├── manifest-firefox.json (Firefox - new)
├── src/ (shared code, modified for compatibility)
```

### Loading Instructions
- **Chrome**: Load unpacked extension using `manifest.json`
- **Firefox**: Load temporary add-on using `manifest-firefox.json`

## Dependencies to Add
- WebExtensions polyfill (optional, for compatibility layer)

## Firefox Store Requirements
- Firefox Add-ons (AMO) submission process
- Code review requirements (stricter than Chrome)
- Manifest validation for Firefox-specific requirements
