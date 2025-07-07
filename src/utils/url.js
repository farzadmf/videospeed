export function getBaseURL(fullURL) {
  const urlReg = new RegExp(new RegExp(/(https?:\/\/.*?\/).*/));
  const match = fullURL.match(urlReg);

  if (match) {
    return match[match.length - 1];
  }

  return null;
}
