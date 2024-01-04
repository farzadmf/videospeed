function escapeStringRegExp(str) {
  matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
  return str.replace(matchOperatorsRe, '\\$&');
}

function isBlacklisted() {
  var blacklisted = false;
  vsc.settings.blacklist.split('\n').forEach((match) => {
    if (isLocationMatch(match)) {
      blacklisted = true;
      return;
    }
    // match = match.replace(REG_STRIP, "");
    // if (match.length == 0) {
    //   return;
    // }

    // if (match.startsWith("/")) {
    //   try {
    //     var parts = match.split("/");

    //     if (REG_ENDS_WITH_FLAGS.test(match)) {
    //       var flags = parts.pop();
    //       var regex = parts.slice(1).join("/");
    //     } else {
    //       var flags = "";
    //       var regex = match;
    //     }

    //     var regexp = new RegExp(regex, flags);
    //   } catch (err) {
    //     return;
    //   }
    // } else {
    //   var regexp = new RegExp(escapeStringRegExp(match));
    // }

    // if (regexp.test(location.href)) {
    //   blacklisted = true;
    //   return;
    // }
  });
  return blacklisted;
}

function getBaseURL(fullURL) {
  urlReg = new RegExp(new RegExp(/(https?:\/\/.*?\/).*/));
  match = fullURL.match(urlReg);

  if (!!match) {
    return match[match.length - 1];
  }

  return null;
}

function isLocationMatch(match) {
  match = match.replace(REG_STRIP, '');
  if (match.length == 0) {
    return false;
  }

  if (match.startsWith('/')) {
    try {
      var parts = match.split('/');

      if (REG_ENDS_WITH_FLAGS.test(match)) {
        var flags = parts.pop();
        var regex = parts.slice(1).join('/');
      } else {
        var flags = '';
        var regex = match;
      }

      var regexp = new RegExp(regex, flags);
    } catch (err) {
      return false;
    }
  } else {
    var regexp = new RegExp(escapeStringRegExp(match));
  }

  return regexp.test(location.href);
}
