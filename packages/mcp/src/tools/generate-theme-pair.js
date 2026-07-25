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

import {generateThemePair as generateThemePairLib} from '../lib/themePair.js';

/**
 * @param {{
 *   colors: Array<{ name: string, colorKeys: string[], ratios: number[] | Record<string, number>, colorspace?: string }>;
 *   backgroundColor: { name: string, colorKeys: string[], ratios: number[] | Record<string, number>, colorspace?: string };
 *   modes: { light: number, dark: number };
 *   contrast?: number;
 *   saturation?: number;
 *   output?: string;
 *   formula?: 'wcag2' | 'wcag3';
 *   themeName?: string;
 *   baseline?: { css?: string | object, tokens?: string | object };
 * }} args
 */
export function generateThemePair(args) {
  try {
    if (!args.modes || typeof args.modes.light !== 'number' || typeof args.modes.dark !== 'number') {
      throw new Error('modes.light and modes.dark are required (0–100)');
    }
    return generateThemePairLib(args);
  } catch (err) {
    throw new Error(`Failed to generate theme pair: ${err.message}`);
  }
}
