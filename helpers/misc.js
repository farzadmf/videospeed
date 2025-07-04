function getKeyBindings(action, what = 'value') {
  return vsc.settings.keyBindings.find((item) => item.action?.name === action)[what];
}

function setKeyBindings(action, value) {
  vsc.settings.keyBindings.find((item) => item.action?.name === action)['value'] = value;
}

function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

function getShadow(parent) {
  let result = [];
  function getChild(parent) {
    if (parent.firstElementChild) {
      var child = parent.firstElementChild;
      do {
        result.push(child);
        getChild(child);
        if (child.shadowRoot) {
          result.push(getShadow(child.shadowRoot));
        }
        child = child.nextElementSibling;
      } while (child);
    }
  }
  getChild(parent);
  return result.flat(Infinity);
}

const resetCoolDown = _.debounce(() => {
  log('cooldown finished', DEBUG);
  vsc.coolDown = false;
}, 1000);

const startCoolDown = () => {
  vsc.coolDown = true;
  resetCoolDown();
};

// vim: foldmethod=marker
