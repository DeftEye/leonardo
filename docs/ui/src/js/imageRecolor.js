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

const PREVIEW_MAX_EDGE = 1600;

/**
 * Fit image dimensions so the longest edge does not exceed maxEdge.
 */
function fitDimensions(width, height, maxEdge = PREVIEW_MAX_EDGE) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return {width, height, scale: 1};
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale
  };
}

/**
 * Draw an HTMLImageElement onto a canvas at preview scale and return ImageData.
 */
function capturePreviewImageData(image, canvas, maxEdge = PREVIEW_MAX_EDGE) {
  const {width, height} = fitDimensions(image.naturalWidth, image.naturalHeight, maxEdge);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function clampByte(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value | 0;
}

function quantizeKey(r, g, b) {
  // 5 bits per channel → 32^3 = 32768 cache slots max
  return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return [h / 6, s, l];
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = clampByte(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [clampByte(hueToRgb(p, q, h + 1 / 3) * 255), clampByte(hueToRgb(p, q, h) * 255), clampByte(hueToRgb(p, q, h - 1 / 3) * 255)];
}

/**
 * Precompute nearest palette RGB for quantized source colors using DeltaE 2000.
 */
function buildPaletteLookup(paletteHex) {
  const paletteRgb = paletteHex.map((hex) => {
    const [r, g, b] = chroma(hex).rgb();
    return {hex, r, g, b};
  });
  const cache = new Map();

  function nearestFor(r, g, b) {
    const key = quantizeKey(r, g, b);
    let hit = cache.get(key);
    if (hit) return hit;

    const source = `rgb(${r},${g},${b})`;
    let best = paletteRgb[0];
    let bestDiff = Infinity;
    for (let i = 0; i < paletteRgb.length; i++) {
      const candidate = paletteRgb[i];
      const diff = getDifference(source, candidate.hex);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = candidate;
      }
    }
    hit = {r: best.r, g: best.g, b: best.b};
    cache.set(key, hit);
    return hit;
  }

  return {nearestFor, cache};
}

/**
 * Apply global HSL/brightness/contrast adjustments to an RGB triple.
 * hue: degrees (-180..180), sat/brightness/contrast: percent (-100..100)
 */
function applyGlobalAdjust(r, g, b, {hue = 0, saturation = 0, brightness = 0, contrast = 0}) {
  let [h, s, l] = rgbToHsl(r, g, b);

  if (hue !== 0) {
    h = (h + hue / 360 + 1) % 1;
  }
  if (saturation !== 0) {
    s = Math.max(0, Math.min(1, s + saturation / 100));
  }
  if (brightness !== 0) {
    l = Math.max(0, Math.min(1, l + brightness / 100));
  }

  let [nr, ng, nb] = hslToRgb(h, s, l);

  if (contrast !== 0) {
    // Map -100..100 → roughly -128..128 contrast curve
    const c = Math.max(-255, Math.min(255, contrast * 1.28));
    const f = (259 * (c + 255)) / (255 * (259 - c));
    nr = clampByte(f * (nr - 128) + 128);
    ng = clampByte(f * (ng - 128) + 128);
    nb = clampByte(f * (nb - 128) + 128);
  }

  return [nr, ng, nb];
}

/**
 * Process original ImageData → remapped + adjusted output ImageData.
 * Processing order: original → palette remap (strength) → global adjust.
 */
function processImageData(original, {palette = [], strength = 0.7, hue = 0, saturation = 0, brightness = 0, contrast = 0} = {}) {
  const output = new ImageData(new Uint8ClampedArray(original.data), original.width, original.height);
  const data = output.data;
  const src = original.data;
  const hasPalette = palette.length > 0 && strength > 0;
  const lookup = hasPalette ? buildPaletteLookup(palette) : null;
  const t = Math.max(0, Math.min(1, strength));
  const adjust = {hue, saturation, brightness, contrast};
  const needsAdjust = hue !== 0 || saturation !== 0 || brightness !== 0 || contrast !== 0;

  for (let i = 0; i < src.length; i += 4) {
    let r = src[i];
    let g = src[i + 1];
    let b = src[i + 2];
    const a = src[i + 3];

    if (a === 0) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
      continue;
    }

    if (lookup) {
      const nearest = lookup.nearestFor(r, g, b);
      r = Math.round(r + (nearest.r - r) * t);
      g = Math.round(g + (nearest.g - g) * t);
      b = Math.round(b + (nearest.b - b) * t);
    }

    if (needsAdjust) {
      [r, g, b] = applyGlobalAdjust(r, g, b, adjust);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }

  return output;
}

/**
 * Put ImageData onto canvas.
 */
function paintImageData(canvas, imageData) {
  if (canvas.width !== imageData.width || canvas.height !== imageData.height) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
  }
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Render original image at full native size through the same pipeline for export.
 */
function renderExportBlob(image, options) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(image, 0, 0);
  const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const processed = processImageData(original, options);
  ctx.putImageData(processed, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to export image'));
    }, 'image/png');
  });
}

export {PREVIEW_MAX_EDGE, fitDimensions, capturePreviewImageData, processImageData, paintImageData, renderExportBlob, applyGlobalAdjust};
