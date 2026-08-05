/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import * as Leo from '@adobe/leonardo-contrast-colors';
import {_theme} from './initialTheme';
import {round} from './utils';

function cloneColor(color) {
  return new Leo.Color({
    name: color.name,
    colorKeys: [...color.colorKeys],
    colorSpace: color.colorSpace,
    ratios: Array.isArray(color.ratios) ? [...color.ratios] : {...color.ratios},
    smooth: color.smooth,
    output: 'HEX'
  });
}

function cloneBackground(backgroundColor) {
  return new Leo.BackgroundColor({
    name: backgroundColor.name,
    colorKeys: [...backgroundColor.colorKeys],
    colorSpace: backgroundColor.colorSpace,
    ratios: Array.isArray(backgroundColor.ratios) ? [...backgroundColor.ratios] : {...backgroundColor.ratios},
    smooth: backgroundColor.smooth,
    output: 'HEX'
  });
}

function buildBaselineTheme() {
  return new Leo.Theme({
    colors: _theme.colors.map(cloneColor),
    backgroundColor: cloneBackground(_theme.backgroundColor),
    lightness: 100,
    contrast: 1,
    saturation: 100,
    formula: _theme.formula,
    output: 'HEX'
  });
}

function swatchMapFromContrastColors(contrastColors) {
  const map = new Map();
  for (const group of contrastColors) {
    if (group.background) {
      map.set('background', {name: 'background', value: group.background, contrast: null});
    }
    if (!group.values) continue;
    for (const swatch of group.values) {
      map.set(swatch.name, swatch);
    }
  }
  return map;
}

function diffThemes(baseline, adapted) {
  const baselineMap = swatchMapFromContrastColors(baseline.contrastColors);
  const adaptedMap = swatchMapFromContrastColors(adapted.contrastColors);
  const names = new Set([...baselineMap.keys(), ...adaptedMap.keys()]);

  return [...names].map((name) => {
    const oldSwatch = baselineMap.get(name);
    const newSwatch = adaptedMap.get(name);
    const oldHex = oldSwatch?.value;
    const newHex = newSwatch?.value;
    const oldContrastTarget = oldSwatch?.contrast;
    const newContrastTarget = newSwatch?.contrast;
    const changed = oldHex !== newHex || oldContrastTarget !== newContrastTarget;

    return {
      name,
      oldHex,
      newHex,
      oldContrastTarget,
      newContrastTarget,
      changed
    };
  });
}

function pickByContrast(group, preference) {
  if (!group?.values?.length) return undefined;
  const sorted = [...group.values].sort((a, b) => Math.abs(b.contrast) - Math.abs(a.contrast));
  if (preference === 'high') return sorted[0].value;
  if (preference === 'low') return sorted[sorted.length - 1].value;
  return sorted[Math.floor((sorted.length - 1) / 2)].value;
}

function applyPreviewVariables(root, theme) {
  const pairs = theme.contrastColorPairs || {};

  root.removeAttribute('style');

  for (const [key, value] of Object.entries(pairs)) {
    root.style.setProperty(`--${key}`, value);
  }

  const groups = (theme.contrastColors || []).filter((group) => group.values);
  const backgroundName = theme.backgroundColor?.name;
  const backgroundGroup = groups.find((group) => group.name === backgroundName) || groups[0];
  const accentGroup = groups.find((group) => group.name !== backgroundName) || backgroundGroup;

  const background = pairs.background || pickByContrast(backgroundGroup, 'low') || '#ffffff';
  const text = pickByContrast(backgroundGroup, 'high') || '#000000';
  const textMuted = pickByContrast(backgroundGroup, 'mid') || text;
  const border = pickByContrast(backgroundGroup, 'low') || textMuted;
  const surface = pickByContrast(backgroundGroup, 'low') || background;
  const accent = pickByContrast(accentGroup, 'high') || text;
  const accentSubtle = pickByContrast(accentGroup, 'mid') || accent;

  root.style.setProperty('--adaptive-bg', background);
  root.style.setProperty('--adaptive-surface', surface);
  root.style.setProperty('--adaptive-text', text);
  root.style.setProperty('--adaptive-text-muted', textMuted);
  root.style.setProperty('--adaptive-border', border);
  root.style.setProperty('--adaptive-accent', accent);
  root.style.setProperty('--adaptive-accent-subtle', accentSubtle);
  root.style.setProperty('--adaptive-on-accent', background);
}

function formatContrastTarget(value) {
  if (value === null || value === undefined) return '—';
  return String(value);
}

function colorChipHtml(hex) {
  if (!hex) return '<span class="adaptiveTokenDiff-missing">—</span>';
  return `<span class="adaptiveTokenDiff-swatchWrap"><span class="adaptiveTokenDiff-swatch" style="background-color:${hex}"></span><code>${hex}</code></span>`;
}

function hasThemeColors() {
  return document.getElementsByClassName('themeColor_item').length > 0;
}

function renderDiffTable(diffs, changedOnly) {
  const tableDest = document.getElementById('adaptiveTokenDiffTable');
  const empty = document.getElementById('adaptiveTokenDiffEmpty');
  if (!tableDest || !empty) return;

  const visible = changedOnly ? diffs.filter((diff) => diff.changed) : diffs;

  if (!hasThemeColors()) {
    empty.hidden = false;
    empty.textContent = 'Add colors to your theme to compare adaptive tokens against the authoring baseline (lightness 100, contrast 1, saturation 100).';
    tableDest.hidden = true;
    tableDest.innerHTML = '';
    return;
  }

  empty.hidden = true;
  tableDest.hidden = false;

  if (!visible.length) {
    tableDest.innerHTML = '<p class="spectrum-Body spectrum-Body--sizeS adaptiveTokenDiff-none">No token differences from the authoring baseline.</p>';
    return;
  }

  const rows = visible
    .map((diff) => {
      const target = diff.name === 'background' ? '—' : `${formatContrastTarget(diff.oldContrastTarget)} → ${formatContrastTarget(diff.newContrastTarget)}`;
      const changedLabel = diff.changed ? 'Yes' : 'No';
      const rowClass = diff.changed ? 'spectrum-Table-row' : 'spectrum-Table-row adaptiveTokenDiff-row--unchanged';
      return `<tr class="${rowClass}">
        <td class="spectrum-Table-cell"><code>${diff.name}</code></td>
        <td class="spectrum-Table-cell">${colorChipHtml(diff.oldHex)}</td>
        <td class="spectrum-Table-cell">${colorChipHtml(diff.newHex)}</td>
        <td class="spectrum-Table-cell">${target}</td>
        <td class="spectrum-Table-cell">${changedLabel}</td>
      </tr>`;
    })
    .join('');

  tableDest.innerHTML = `<table class="spectrum-Table spectrum-Table--sizeM spectrum-Table--quiet">
    <thead class="spectrum-Table-head">
      <tr>
        <th class="spectrum-Table-headCell">Token</th>
        <th class="spectrum-Table-headCell">Baseline</th>
        <th class="spectrum-Table-headCell">Adapted</th>
        <th class="spectrum-Table-headCell">Target contrast</th>
        <th class="spectrum-Table-headCell">Changed</th>
      </tr>
    </thead>
    <tbody class="spectrum-Table-body">${rows}</tbody>
  </table>`;
}

function updateKnobReadout() {
  const readout = document.getElementById('adaptiveKnobReadout');
  if (!readout) return;
  const lightness = round(_theme.lightness, 0);
  const contrastPercent = round(_theme.contrast * 100, 0);
  const saturation = round(_theme.saturation, 0);
  readout.textContent = `Lightness ${lightness}% · Contrast ${contrastPercent}% · Saturation ${saturation}%`;
}

function updateAdaptivePreview() {
  const root = document.getElementById('adaptivePreviewRoot');
  const changedOnlyInput = document.getElementById('adaptiveChangedOnly');
  if (!root) return;

  updateKnobReadout();

  if (!hasThemeColors()) {
    root.classList.add('is-empty');
    renderDiffTable([], changedOnlyInput?.checked ?? true);
    return;
  }

  root.classList.remove('is-empty');
  applyPreviewVariables(root, _theme);

  let diffs = [];
  try {
    const baseline = buildBaselineTheme();
    diffs = diffThemes(baseline, _theme);
  } catch (err) {
    console.warn('Adaptive preview baseline diff failed:', err);
    diffs = [];
  }

  renderDiffTable(diffs, changedOnlyInput?.checked ?? true);
}

function syncSliderDom(id, value, isContrast = false) {
  const slider = document.getElementById(id);
  const label = document.getElementById(id.replace('Slider', 'Value'));
  if (slider) slider.value = String(value);
  if (label) label.innerHTML = isContrast ? `${round(value * 100)}%` : `${value}%`;
}

function resetAdaptiveKnobs() {
  syncSliderDom('themeBrightnessSlider', 100, false);
  syncSliderDom('themeContrastSlider', 1, true);
  syncSliderDom('themeSaturationSlider', 100, false);

  _theme.lightness = 100;
  _theme.contrast = 1;
  _theme.saturation = 100;

  // Prefer the shared full refresh path when available (avoids circular imports).
  if (typeof window.themeUpdate === 'function') {
    window.themeUpdate();
  } else {
    updateAdaptivePreview();
  }
}

function openAdaptiveSettings(e) {
  const button = document.getElementById('buttonAdaptiveControls');
  const popover = document.getElementById('popoverAdaptiveControls');
  if (!button || !popover) return;

  if (!popover.classList.contains('is-open')) {
    if (typeof window.togglePopover === 'function') {
      window.togglePopover({target: button});
    } else {
      popover.classList.add('is-open');
      button.classList.add('is-selected');
    }
  }

  if (e?.preventDefault) e.preventDefault();
}

function setupAdaptivePreview() {
  try {
    const resetButton = document.getElementById('adaptiveReset');
    const settingsButton = document.getElementById('adaptiveOpenSettings');
    const changedOnlyInput = document.getElementById('adaptiveChangedOnly');

    if (resetButton) {
      resetButton.addEventListener('click', resetAdaptiveKnobs);
    }
    if (settingsButton) {
      settingsButton.addEventListener('click', openAdaptiveSettings);
    }
    if (changedOnlyInput) {
      changedOnlyInput.addEventListener('change', updateAdaptivePreview);
    }

    updateAdaptivePreview();
  } catch (err) {
    console.warn('Adaptive preview setup failed:', err);
  }
}

window.updateAdaptivePreview = updateAdaptivePreview;
window.resetAdaptiveKnobs = resetAdaptiveKnobs;
window.setupAdaptivePreview = setupAdaptivePreview;

export {updateAdaptivePreview, resetAdaptiveKnobs, setupAdaptivePreview, diffThemes, buildBaselineTheme};
