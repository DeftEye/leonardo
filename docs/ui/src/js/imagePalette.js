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

import {prominent} from 'color.js';
import chroma from 'chroma-js';
import {getDifference} from './utils';

const EXTRACT_AMOUNT = 14;
const EXTRACT_GROUP = 40;
const MAX_SWATCHES = 10;
const DEDUPE_DELTA_E = 8;

/**
 * Extract a flat, deduped palette of hex colors from an image URL / object URL.
 */
async function extractPaletteFromImage(fileUrl, {amount = EXTRACT_AMOUNT, max = MAX_SWATCHES} = {}) {
  const colors = await prominent(fileUrl, {
    amount,
    format: 'hex',
    group: EXTRACT_GROUP
  });

  const unique = [];
  for (let i = 0; i < colors.length; i++) {
    const hex = chroma(colors[i]).hex();
    const isDuplicate = unique.some((existing) => getDifference(existing, hex) < DEDUPE_DELTA_E);
    if (!isDuplicate) unique.push(hex);
    if (unique.length >= max) break;
  }

  // Prefer variety by sorting remaining by chroma then lightness spread
  return unique.sort((a, b) => chroma(b).get('lch.c') - chroma(a).get('lch.c'));
}

/**
 * Render editable swatch list into a container.
 * onChange(index, hex) is called when a color is edited.
 */
function renderPaletteSwatches(container, palette, onChange) {
  container.innerHTML = '';

  if (!palette.length) {
    const empty = document.createElement('p');
    empty.className = 'spectrum-Body spectrum-Body--sizeXS imageStudio-hint';
    empty.textContent = 'Upload an image to extract colors.';
    container.appendChild(empty);
    return;
  }

  palette.forEach((hex, index) => {
    const item = document.createElement('div');
    item.className = 'imageStudio-swatch';

    const pickerId = `imageSwatchPicker_${index}`;
    const inputId = `imageSwatchInput_${index}`;

    const pickerLabel = document.createElement('label');
    pickerLabel.className = 'imageStudio-swatchChip';
    pickerLabel.htmlFor = pickerId;
    pickerLabel.style.backgroundColor = hex;
    pickerLabel.title = `Edit color ${index + 1}`;

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.id = pickerId;
    picker.className = 'imageStudio-swatchNative';
    picker.value = chroma(hex).hex();
    picker.setAttribute('aria-label', `Palette color ${index + 1}`);

    const text = document.createElement('input');
    text.type = 'text';
    text.id = inputId;
    text.className = 'spectrum-Textfield spectrum-Textfield--sizeS imageStudio-swatchHex';
    text.value = chroma(hex).hex();
    text.setAttribute('aria-label', `Hex for color ${index + 1}`);
    text.spellcheck = false;

    const commit = (value) => {
      try {
        const next = chroma(value).hex();
        picker.value = next;
        text.value = next;
        pickerLabel.style.backgroundColor = next;
        onChange(index, next);
      } catch (e) {
        text.value = chroma(palette[index]).hex();
      }
    };

    picker.addEventListener('input', () => commit(picker.value));
    text.addEventListener('change', () => commit(text.value));
    text.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit(text.value);
      }
    });

    pickerLabel.appendChild(picker);
    item.appendChild(pickerLabel);
    item.appendChild(text);
    container.appendChild(item);
  });
}

export {extractPaletteFromImage, renderPaletteSwatches, EXTRACT_AMOUNT, MAX_SWATCHES};
