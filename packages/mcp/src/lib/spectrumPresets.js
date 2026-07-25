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

/** Default neutral color keys for Spectrum-oriented backgrounds. */
export const DEFAULT_NEUTRAL_KEYS = ['#cacaca', '#000000'];

/**
 * WCAG 2 role thresholds used for Spectrum-safe Adobe UI semantics.
 * @type {Record<'AA' | 'AAA', Record<'border' | 'largeText' | 'icon' | 'text', number>>}
 */
export const ROLE_THRESHOLDS = {
  AA: {
    border: 2,
    largeText: 3,
    icon: 3,
    text: 4.5
  },
  AAA: {
    border: 2,
    largeText: 3,
    icon: 3,
    text: 7
  }
};

/**
 * @param {'AA' | 'AAA'} level
 * @returns {Record<'border' | 'largeText' | 'icon' | 'text', number>}
 */
export function getRoleThresholds(level = 'AA') {
  return ROLE_THRESHOLDS[level] || ROLE_THRESHOLDS.AA;
}

/**
 * Build Spectrum-oriented named ratios for a color scale.
 * @param {string} colorName
 * @param {'AA' | 'AAA'} level
 * @returns {Record<string, number>}
 */
export function buildSpectrumRatios(colorName, level = 'AA') {
  const aa = getRoleThresholds('AA');
  const ratios = {
    [`${colorName}--border`]: aa.border,
    [`${colorName}--largeText`]: aa.largeText,
    [`${colorName}--icon`]: aa.icon,
    [`${colorName}--text`]: aa.text
  };
  if (level === 'AAA') {
    ratios[`${colorName}--textHigh`] = getRoleThresholds('AAA').text;
  }
  return ratios;
}

/**
 * Build neutral BackgroundColor ratios for AA/AAA ladders.
 * @param {string} neutralName
 * @param {'AA' | 'AAA'} level
 * @returns {Record<string, number>}
 */
export function buildNeutralRatios(neutralName, level = 'AA') {
  return buildSpectrumRatios(neutralName, level);
}

/**
 * Infer a role from a token name when no explicit role map is provided.
 * @param {string} tokenName
 * @returns {'border' | 'largeText' | 'icon' | 'text'}
 */
export function inferRoleFromTokenName(tokenName) {
  const name = String(tokenName).toLowerCase();
  if (name.includes('border') || name.includes('divider') || name.includes('rule')) return 'border';
  if (name.includes('icon') || name.includes('glyph')) return 'icon';
  if (name.includes('largetext') || name.includes('large-text') || name.includes('heading') || name.includes('title')) {
    return 'largeText';
  }
  if (name.includes('text') || name.includes('fg') || name.includes('foreground') || name.includes('label')) {
    return 'text';
  }
  // Default to text (strictest common AA target) for unknown semantic colors.
  return 'text';
}
