const getTcDefaultBinding = (action) => {
  const toCompare = typeof action === 'string' ? action : action.name;

  return _.find(tcDefaults.keyBindings, (b) => {
    if (!toCompare.includes('fixspeed')) {
      return b.action.name === toCompare;
    }

    const speedVal = Number(toCompare.split('-')[1]).toFixed(1);
    return b.action.name === `fixspeed-${speedVal}`;
  });
};

const getActionName = (action) => {
  const toCompare = typeof action === 'string' ? action : action.name;

  if (!toCompare.includes('fixspeed')) {
    return toCompare;
  }

  const speedVal = Number(toCompare.split('-')[1]).toFixed(1);
  return `fixspeed-${speedVal}`;
};
