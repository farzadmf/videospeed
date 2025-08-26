// Useful sites:
// - http://gcctech.org/csc/javascript/javascript_keycodes.htm
// - https://www.toptal.com/developers/keycode (interactive)

// Minimal blacklist - only keys that would interfere with form navigation
export const BLACKLISTED_KEYCODES = [
  9, // Tab - needed for keyboard navigation
  16, // Shift (alone)
  17, // Ctrl/Control (alone)
  18, // Alt (alone)
  91, // Meta/Windows/Command Left
  92, // Meta/Windows Right
  93, // Context Menu/Right Command
  224, // Meta/Command (Firefox)
];

export const BLACKLISTED_KEYS = [
  'Tab',
  'Shift', // alone
  'Ctrl', // alone
  'Alt', // alone
  'Meta', // alone
  // 93, // Context Menu/Right Command -> what's the "key" for this?
];

export const KEYS = {
  ' ': 'Space',
  '!': '1',
  '@': '2',
  '#': '3',
  $: '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
};

export const KEY_CODES = {
  0: 'null',
  null: 'null',
  undefined: 'null',
  32: 'Space',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',
  48: '0',
  49: '1',
  50: '2',
  51: '3',
  52: '4',
  53: '5',
  54: '6',
  55: '7',
  56: '8',
  57: '9',
  96: 'Num 0',
  97: 'Num 1',
  98: 'Num 2',
  99: 'Num 3',
  100: 'Num 4',
  101: 'Num 5',
  102: 'Num 6',
  103: 'Num 7',
  104: 'Num 8',
  105: 'Num 9',
  106: 'Num *',
  107: 'Num +',
  109: 'Num -',
  110: 'Num .',
  111: 'Num /',
  112: 'F1',
  113: 'F2',
  114: 'F3',
  115: 'F4',
  116: 'F5',
  117: 'F6',
  118: 'F7',
  119: 'F8',
  120: 'F9',
  121: 'F10',
  122: 'F11',
  123: 'F12',
  124: 'F13',
  125: 'F14',
  126: 'F15',
  127: 'F16',
  128: 'F17',
  129: 'F18',
  130: 'F19',
  131: 'F20',
  132: 'F21',
  133: 'F22',
  134: 'F23',
  135: 'F24',
  186: ';',
  188: '<',
  189: '-',
  187: '+',
  190: '.',
  191: '/',
  192: '~',
  219: '[',
  220: '\\',
  221: ']',
  222: "'",
};
