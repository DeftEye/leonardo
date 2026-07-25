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

import {buildTheme} from './buildTheme.js';
import {exportThemeFormats} from './formatTokens.js';
import {buildExportDiffs} from './diffTokens.js';

/**
 * @param {{
 *   colors: Array<{ name: string, colorKeys: string[], ratios: number[] | Record<string, number>, colorspace?: string, colorSpace?: string }>;
 *   backgroundColor: { name: string, colorKeys: string[], ratios: number[] | Record<string, number>, colorspace?: string, colorSpace?: string };
 *   modes: { light: number, dark?: number };
 *   contrast?: number;
 *   saturation?: number;
 *   output?: string;
 *   formula?: 'wcag2' | 'wcag3';
 *   themeName?: string;
 *   baseline?: { css?: string | object, tokens?: string | object };
 * }} args
 */
export function generateThemePair(args) {
  const {colors, backgroundColor, modes, contrast = 1, saturation = 100, output = 'HEX', formula = 'wcag2', themeName = '', baseline} = args;

  if (!modes || typeof modes.light !== 'number') {
    throw new Error('modes.light is required (0–100)');
  }

  const shared = {colors, backgroundColor, contrast, saturation, output, formula};
  const lightTheme = buildTheme({...shared, lightness: modes.light});
  const light = exportThemeFormats(lightTheme, {themeName: themeName ? `${themeName}Light` : 'Light'});

  const result = {
    modes: {
      light
    }
  };

  if (typeof modes.dark === 'number') {
    const darkTheme = buildTheme({...shared, lightness: modes.dark});
    result.modes.dark = exportThemeFormats(darkTheme, {themeName: themeName ? `${themeName}Dark` : 'Dark'});
  }

  const primary = result.modes.light;
  const diff = buildExportDiffs(primary, baseline);
  if (diff) result.diff = diff;

  return result;
}
