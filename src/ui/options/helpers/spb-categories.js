import { SPB_CATEGORIES } from '../../../shared/defaults.js';

const CONTAINER_ID = 'yt_spb_categories';

/**
 * Render the SponsorBlock category rows and populate them from saved settings.
 * Each row = an "enable" checkbox + a collapsed details panel (color picker +
 * auto-skip toggle) that only shows when the category is enabled.
 * @param {Array<{name: string, color: string, should_skip: boolean}>} saved
 */
export function renderSpbCategories(saved) {
  const container = document.getElementById(CONTAINER_ID);
  const savedByName = new Map(saved.map((c) => [c.name, c]));

  container.replaceChildren();

  SPB_CATEGORIES.forEach((cat) => {
    const existing = savedByName.get(cat.name);
    const enabled = !!existing;
    const color = existing?.color ?? cat.color;
    const shouldSkip = existing?.should_skip ?? true;

    const col = document.createElement('div');
    col.className = 'col-lg-3';
    col.dataset.spbCategory = cat.name;

    col.innerHTML = `
      <div class="form-check">
        <input class="form-check-input spb-category-enabled" id="yt_spb_cat_${cat.name}" type="checkbox" />
        <label class="form-check-label" for="yt_spb_cat_${cat.name}">${cat.label}</label>
      </div>
      <div class="spb-category-details mt-1 ms-4 ${enabled ? '' : 'd-none'}">
        <div class="d-flex align-items-center gap-2 mb-1">
          <input class="form-control form-control-color spb-category-color" type="color" />
          <small class="text-muted">color</small>
        </div>
        <div class="form-check">
          <input class="form-check-input spb-category-skip" id="yt_spb_cat_skip_${cat.name}" type="checkbox" />
          <label class="form-check-label" for="yt_spb_cat_skip_${cat.name}">Auto-skip</label>
        </div>
      </div>
    `;

    const enabledEl = col.querySelector('.spb-category-enabled');
    const detailsEl = col.querySelector('.spb-category-details');
    const colorEl = col.querySelector('.spb-category-color');
    const skipEl = col.querySelector('.spb-category-skip');

    enabledEl.checked = enabled;
    colorEl.value = color;
    skipEl.checked = shouldSkip;

    enabledEl.addEventListener('change', () => {
      detailsEl.classList.toggle('d-none', !enabledEl.checked);
    });

    container.appendChild(col);
  });
}

/**
 * Collect the current SponsorBlock category selections from the DOM.
 * @returns {Array<{color: string, name: string, should_skip: boolean}>}
 */
export function collectSpbCategories() {
  const rows = document.querySelectorAll(`#${CONTAINER_ID} [data-spb-category]`);
  const out = [];
  rows.forEach((row) => {
    if (!row.querySelector('.spb-category-enabled').checked) {
      return;
    }
    out.push({
      color: row.querySelector('.spb-category-color').value,
      name: row.dataset.spbCategory,
      should_skip: row.querySelector('.spb-category-skip').checked,
    });
  });
  return out;
}
