const validate = () => {
  var valid = true;
  var status = document.getElementById('status');
  var blacklist = document.getElementById('blacklist');

  blacklist.value.split('\n').forEach((match) => {
    match = match.replace(REG_STRIP, '');

    if (match.startsWith('/')) {
      try {
        var parts = match.split('/');

        if (parts.length < 3) throw 'invalid regex';

        var flags = parts.pop();
        var regex = parts.slice(1).join('/');

        var regexp = new RegExp(regex, flags);
      } catch (err) {
        status.textContent =
          'Error: Invalid blacklist regex: "' +
          match +
          '". Unable to save. Try wrapping it in foward slashes.';
        valid = false;
        return;
      }
    }
  });
  return valid;
};
