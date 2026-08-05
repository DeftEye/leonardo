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

import chroma from 'chroma-js';
import {getDifference} from './utils';

const MAX_SWATCHES = 10;
const DEDUPE_DELTA_E = 10;
const SAMPLE_STEP = 8;
const BUCKET_BITS = 4; // 16 levels per channel

/**
 * Extract a flat, deduped palette from an HTMLImageElement via canvas sampling.
 * Avoids color.js workers (unreliable with blob URLs in some environments).
 */
async function extractPaletteFromImage(imageOrUrl, {max = MAX_SWATCHES} = {}) {
  const image = typeof imageOrUrl === 'string' ? await loadImage(imageOrUrl) : imageOrUrl;
  const colors = sampleProminentColors(image, max * 3);
  return dedupePalette(colors, max);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image for palette extraction'));
    image.src = src;
  });
}

function sampleProminentColors(image, limit) {
  const maxEdge = 240;
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(image, 0, 0, width, height);
  const {data} = ctx.getImageData(0, 0, width, height);

  const buckets = new Map();
  const shift = 8 - BUCKET_BITS;

  for (let i = 0; i < data.length; i += 4 * SAMPLE_STEP) {
    const a = data[i + 3];
    if (a < 200) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Skip near-white / near-black noise for cleaner palettes
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 18 || min > 245) continue;

    const key = ((r >> shift) << (BUCKET_BITS * 2)) | ((g >> shift) << BUCKET_BITS) | (b >> shift);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {r: 0, g: 0, b: 0, count: 0};
      buckets.set(key, bucket);
    }
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count += 1;
  }

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(limit, maxSwatchFloor(limit)))
    .map((bucket) => {
      const r = Math.round(bucket.r / bucket.count);
      const g = Math.round(bucket.g / bucket.count);
      const b = Math.round(bucket.b / bucket.count);
      return chroma(r, g, b, 'rgb').hex();
    });
}

function maxSwatchFloor(limit) {
  return Math.max(limit, MAX_SWATCHES);
}

function dedupePalette(colors, max) {
  const unique = [];
  for (let i = 0; i < colors.length; i++) {
    const hex = chroma(colors[i]).hex();
    const isDuplicate = unique.some((existing) => getDifference(existing, hex) < DEDUPE_DELTA_E);
    if (!isDuplicate) unique.push(hex);
    if (unique.length >= max) break;
  }

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

export {extractPaletteFromImage, renderPaletteSwatches, MAX_SWATCHES};
