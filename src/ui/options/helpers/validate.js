import { REG_STRIP } from '../../../shared/constants.js';

export const validate = () => {
  let valid = true;
  const status = document.getElementById('status');
  const blacklist = document.getElementById('blacklist');

  blacklist.value.split('\n').forEach((match) => {
    match = match.replace(REG_STRIP, '');

    if (match.startsWith('/')) {
      try {
        const parts = match.split('/');

        if (parts.length < 3) {
          throw new Error('invalid regex');
        }

        const flags = parts.pop();
        const regex = parts.slice(1).join('/');

        new RegExp(regex, flags);
      } catch (err) {
        status.textContent = `Error: Invalid blacklist regex: "${match}". Unable to save. Try wrapping it in foward slashes.`;
        valid = false;
      }
    }
  });
  return valid;
};
