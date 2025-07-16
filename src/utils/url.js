export function getBaseURL(_fullURL) {
  // Decided to simply use the Website's URL as videos can have super weird URLs
  //    because of CDN and such.
  return location.hostname;

  // const urlReg = new RegExp(new RegExp(/(https?:\/\/.*?\/).*/));
  // const match = fullURL.match(urlReg);
  //
  // if (match) {
  //   return match[match.length - 1];
  // }
  //
  // return null;
}
