import { REG_ENDS_WITH_FLAGS, REG_STRIP } from '@/options/constants';

export const isLocationMatch = (match: string) => {
  match = match.replace(REG_STRIP, '');
  if (match.length == 0) {
    return false;
  }

  let regexp: RegExp;
  if (match.startsWith('/')) {
    try {
      const parts = match.split('/');

      let flags;
      let regex;
      if (REG_ENDS_WITH_FLAGS.test(match)) {
        flags = parts.pop();
        regex = parts.slice(1).join('/');
      } else {
        flags = '';
        regex = match;
      }

      regexp = new RegExp(regex, flags);
    } catch (err) {
      return false;
    }
  } else {
    regexp = new RegExp(escapeStringRegExp(match));
  }

  return regexp.test(location.href);
};

export const getBaseURL = (fullURL: string) => {
  const urlReg = new RegExp(new RegExp(/(https?:\/\/.*?\/).*/));
  const match = fullURL.match(urlReg);

  if (match) {
    return match[match.length - 1];
  }

  return null;
};

export const inIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

const escapeStringRegExp = (str: string) => {
  const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
  return str.replace(matchOperatorsRe, '\\$&');
};

export const getShadow = (parent: ParentNode) => {
  const result: Element[] = [];

  const getChild = (parent: ParentNode) => {
    if (parent.firstElementChild) {
      let child = parent.firstElementChild;

      do {
        result.push(child);
        getChild(child);
        if (child.shadowRoot) {
          result.push(...getShadow(child.shadowRoot));
        }
        if (child.nextElementSibling) {
          child = child.nextElementSibling;
        }
      } while (child);
    }
  };

  getChild(parent);
  return result.flat(Infinity);
};
