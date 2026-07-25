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

import {DEFAULT_NEUTRAL_KEYS, buildNeutralRatios, buildSpectrumRatios, getRoleThresholds} from '../lib/spectrumPresets.js';
import {generateThemePair} from '../lib/themePair.js';

/**
 * @param {{
 *   brandColors: Array<{ name: string, colorKeys: string[], colorspace?: string }>;
 *   neutralKeys?: string[];
 *   neutralName?: string;
 *   level?: 'AA' | 'AAA';
 *   modes?: { light?: number, dark?: number };
 *   contrast?: number;
 *   saturation?: number;
 *   output?: string;
 *   formula?: 'wcag2' | 'wcag3';
 *   themeName?: string;
 *   baseline?: { css?: string | object, tokens?: string | object };
 * }} args
 */
export function generateSpectrumTheme(args) {
  try {
    const {brandColors, neutralKeys = DEFAULT_NEUTRAL_KEYS, neutralName = 'gray', level = 'AA', modes = {light: 97, dark: 15}, contrast = 1, saturation = 100, output = 'HEX', formula = 'wcag2', themeName = 'SpectrumTheme', baseline} = args;

    if (!Array.isArray(brandColors) || brandColors.length === 0) {
      throw new Error('brandColors must be a non-empty array');
    }

    const ratios = getRoleThresholds(level);
    const backgroundColor = {
      name: neutralName,
      colorKeys: neutralKeys,
      ratios: buildNeutralRatios(neutralName, level),
      colorSpace: 'LCH'
    };

    const colors = brandColors.map((brand) => ({
      name: brand.name,
      colorKeys: brand.colorKeys,
      ratios: buildSpectrumRatios(brand.name, level),
      colorSpace: brand.colorSpace || brand.colorspace || 'LCH'
    }));

    const pair = generateThemePair({
      colors,
      backgroundColor,
      modes: {
        light: typeof modes.light === 'number' ? modes.light : 97,
        ...(typeof modes.dark === 'number' ? {dark: modes.dark} : {dark: 15})
      },
      contrast,
      saturation,
      output,
      formula,
      themeName,
      baseline
    });

    return {
      config: {
        level,
        ratios,
        formula,
        colorspace: 'LCH',
        neutralName,
        brandNames: brandColors.map((b) => b.name)
      },
      ...pair
    };
  } catch (err) {
    throw new Error(`Failed to generate Spectrum theme: ${err.message}`);
  }
}
