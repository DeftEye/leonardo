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

import test from 'ava';
import chroma from 'chroma-js';
import {getSuggestedShades} from '../index.js';

test('should return the requested number of hex shades', (t) => {
  const shades = getSuggestedShades('#1473E6', 5);
  t.is(shades.length, 5);
  t.deepEqual(shades, ['#ffffff', '#b9c4f6', '#668dec', '#004cb7', '#000000']);
  t.true(shades.every((c) => /^#[0-9a-f]{6}$/i.test(c)));
});

test('should distribute shades from light to dark', (t) => {
  const shades = getSuggestedShades('#CCFFA9', 6);
  const lightnesses = shades.map((c) => chroma(c).lch()[0]);
  for (let i = 1; i < lightnesses.length; i++) {
    t.true(lightnesses[i] <= lightnesses[i - 1]);
  }
  t.true(lightnesses[0] > lightnesses[lightnesses.length - 1]);
});

test('should preserve hue for mid-scale shades', (t) => {
  const base = '#1473E6';
  const baseHue = chroma(base).lch()[2];
  const shades = getSuggestedShades(base, 5);
  // Endpoints are near white/black (undefined hue); check middle swatches.
  const midHues = shades.slice(1, -1).map((c) => chroma(c).lch()[2]);
  midHues.forEach((hue) => {
    const delta = Math.min(Math.abs(hue - baseHue), 360 - Math.abs(hue - baseHue));
    t.true(delta < 20, `expected hue near ${baseHue}, got ${hue}`);
  });
});

test('should throw for invalid base color', (t) => {
  t.throws(() => getSuggestedShades('not-a-color', 5), {message: /invalid color/i});
});

test('should throw when shadeCount is less than 2', (t) => {
  t.throws(() => getSuggestedShades('#1473E6', 1), {message: /shadeCount must be a number >= 2/i});
  t.throws(() => getSuggestedShades('#1473E6', NaN), {message: /shadeCount must be a number >= 2/i});
});
