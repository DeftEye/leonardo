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

/**
 * @param {Record<string, string>} pairs
 * @param {string} [themeName]
 * @returns {string}
 */
export function toCssVariables(pairs, themeName = '') {
  const selector = themeName && themeName.trim() ? `.${themeName.replace(/\s/g, '')}` : ':root';
  const declarations = Object.entries(pairs || {}).map(([key, value]) => `  --${key}: ${value};`);
  return `${selector} {\n${declarations.join('\n')}\n}`;
}

/**
 * @param {{
 *   contrastColors: Array<{ background?: string, name?: string, values?: Array<{ name: string, contrast: number, value: string }> }>;
 *   lightness?: number;
 *   contrast?: number;
 *   saturation?: number;
 *   formula?: string;
 *   themeName?: string;
 * }} meta
 * @returns {Record<string, unknown>}
 */
export function toDtcgTokens(meta) {
  const {contrastColors = [], lightness = 100, contrast = 1, saturation = 100, formula = 'wcag2', themeName = 'Theme'} = meta;

  const contrastText = contrast != 1 ? `, contrast of ${contrast * 100}%` : '';
  const saturationText = saturation != 100 ? `, saturation of ${saturation}%` : '';
  const themeObj = {
    description: `Color theme tokens at lightness of ${lightness}%${contrastText}${saturationText}`
  };

  const textLowContrast = 'Do not use for UI elements or text.';
  const textLarge = 'Color can be used for UI elements or large text.';
  const textSmall = 'Color can be used for small text.';
  const formulaString = formula === 'wcag2' ? 'WCAG 2.x (relative luminance)' : 'WCAG 3 (APCA)';
  const largeText = formula === 'wcag3' ? 60 : 3;
  const smallText = formula === 'wcag3' ? 75 : 4.5;

  const backgroundColor = contrastColors[0]?.background;
  if (backgroundColor) {
    themeObj.Background = {
      $value: backgroundColor,
      $type: 'color',
      $description: 'UI background color. All color contrasts evaluated and generated against this color.'
    };
  }

  for (let i = 1; i < contrastColors.length; i++) {
    const thisColor = contrastColors[i];
    if (!thisColor?.values) continue;
    for (const color of thisColor.values) {
      const descriptionText = color.contrast < largeText ? textLowContrast : color.contrast >= largeText && color.contrast < smallText ? textLarge : textSmall;
      themeObj[color.name] = {
        $value: color.value,
        $type: 'color',
        $description: `${descriptionText} ${formulaString} contrast is ${color.contrast}:1 against background ${backgroundColor}`
      };
    }
  }

  const name = themeName && themeName.trim() ? themeName : 'Theme';
  return {[name]: themeObj};
}

/**
 * Build CSS + DTCG exports from a Leonardo Theme instance.
 * @param {import('@adobe/leonardo-contrast-colors').Theme} theme
 * @param {{ themeName?: string }} [options]
 */
export function exportThemeFormats(theme, options = {}) {
  const themeName = options.themeName || '';
  const contrastColors = theme.contrastColors;
  const contrastColorPairs = theme.contrastColorPairs;
  const css = toCssVariables(contrastColorPairs, themeName);
  const tokens = toDtcgTokens({
    contrastColors,
    lightness: theme.lightness,
    contrast: theme.contrast,
    saturation: theme.saturation,
    formula: theme.formula,
    themeName: themeName || 'Theme'
  });
  return {contrastColors, contrastColorPairs, css, tokens};
}
