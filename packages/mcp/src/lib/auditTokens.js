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

import {Theme, Color, BackgroundColor} from '@adobe/leonardo-contrast-colors';
import {checkContrast} from '../tools/check-contrast.js';
import {getRoleThresholds, inferRoleFromTokenName} from './spectrumPresets.js';
import {toCssVariables} from './formatTokens.js';
import {buildExportDiffs} from './diffTokens.js';

/**
 * Flatten flat maps or DTCG-ish nested color tokens into { name: colorString }.
 * @param {Record<string, unknown>} tokens
 * @param {string} [prefix]
 * @returns {Record<string, string>}
 */
export function flattenTokens(tokens, prefix = '') {
  const out = {};
  if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) return out;

  for (const [key, value] of Object.entries(tokens)) {
    if (key === 'description') continue;
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      out[path] = value;
      continue;
    }

    if (value && typeof value === 'object') {
      if (typeof value.$value === 'string') {
        out[path] = value.$value;
        continue;
      }
      Object.assign(out, flattenTokens(value, path));
    }
  }
  return out;
}

/**
 * @param {string} tokenPath
 * @returns {string}
 */
function tokenCssName(tokenPath) {
  return tokenPath.replace(/\./g, '-');
}

/**
 * Suggest a fixed hex by solving a one-color Theme at the target ratio.
 * @param {{
 *   background: string;
 *   brandKeys: string[];
 *   targetRatio: number;
 *   tokenName: string;
 *   lightness?: number;
 *   formula?: 'wcag2' | 'wcag3';
 * }} args
 * @returns {string | null}
 */
function suggestValueFromBrand(args) {
  const {background, brandKeys, targetRatio, tokenName, lightness = 97, formula = 'wcag2'} = args;
  if (!brandKeys?.length) return null;

  try {
    const neutral = new BackgroundColor({
      name: 'auditBg',
      colorKeys: [background],
      ratios: [targetRatio],
      colorSpace: 'LCH'
    });
    const key = tokenCssName(tokenName);
    const brand = new Color({
      name: 'fix',
      colorKeys: brandKeys,
      ratios: {[key]: targetRatio},
      colorSpace: 'LCH'
    });
    const theme = new Theme({
      colors: [neutral, brand],
      backgroundColor: neutral,
      lightness,
      formula,
      output: 'HEX'
    });
    const pairs = theme.contrastColorPairs;
    return pairs[key] || Object.entries(pairs).find(([k]) => k !== 'background')?.[1] || null;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, string>} pairs
 * @param {string} background
 * @param {string} themeName
 * @param {string} description
 */
function pairsToDtcg(pairs, background, themeName, description) {
  return {
    [themeName || 'Theme']: {
      description,
      Background: {
        $value: background,
        $type: 'color',
        $description: 'UI background color used for contrast audit.'
      },
      ...Object.fromEntries(
        Object.entries(pairs)
          .filter(([k]) => k !== 'background')
          .map(([name, value]) => [
            name,
            {
              $value: value,
              $type: 'color',
              $description: 'Color token.'
            }
          ])
      )
    }
  };
}

/**
 * @param {{
 *   background: string;
 *   tokens: Record<string, unknown>;
 *   level?: 'AA' | 'AAA';
 *   roles?: Record<string, 'border' | 'largeText' | 'icon' | 'text'>;
 *   recolor?: Array<{ name?: string, colorKeys: string[] }>;
 *   formula?: 'wcag2' | 'wcag3';
 *   lightness?: number;
 *   themeName?: string;
 *   baseline?: { css?: string | object, tokens?: string | object };
 * }} args
 */
export function auditTokenSet(args) {
  const {background, tokens, level = 'AA', roles = {}, recolor = [], formula = 'wcag2', lightness = 97, themeName = 'Theme', baseline} = args;

  const flat = flattenTokens(tokens);
  const thresholds = getRoleThresholds(level);
  const method = formula === 'wcag3' ? 'wcag3' : 'wcag2';
  const brandKeys = recolor.flatMap((r) => r.colorKeys || []);

  const results = [];
  const failures = [];
  const fixes = [];
  const originalPairs = {background};
  const fixedPairs = {background};

  for (const [name, value] of Object.entries(flat)) {
    const cssName = tokenCssName(name);
    originalPairs[cssName] = value;
    fixedPairs[cssName] = value;

    if (name.toLowerCase() === 'background' || name.endsWith('.Background') || name === 'Background') {
      continue;
    }

    const role = roles[name] || roles[cssName] || inferRoleFromTokenName(name);
    const targetRatio = thresholds[role] ?? thresholds.text;
    const contrastResult = checkContrast({foreground: value, background, method});
    const currentRatio = Math.abs(contrastResult.ratio);
    const passes = currentRatio + 1e-6 >= targetRatio;

    const entry = {
      name,
      value,
      role,
      currentRatio: contrastResult.ratio,
      targetRatio,
      passes
    };
    results.push(entry);

    if (!passes) {
      failures.push(entry);
      const suggestedValue = suggestValueFromBrand({
        background,
        brandKeys,
        targetRatio,
        tokenName: name,
        lightness,
        formula
      });
      const fix = {
        name,
        role,
        currentRatio: contrastResult.ratio,
        targetRatio,
        currentValue: value,
        suggestedValue,
        reason: suggestedValue ? `Re-solved ${role} token to ${targetRatio}:1 using provided brand keys.` : 'No brand keys provided in recolor; cannot re-solve hex. Raise contrast to targetRatio or pass recolor brand keys.'
      };
      fixes.push(fix);
      if (suggestedValue) {
        fixedPairs[cssName] = suggestedValue;
      }
    }
  }

  const css = toCssVariables(fixedPairs, themeName);
  const tokensOut = pairsToDtcg(fixedPairs, background, themeName, `Audited color tokens (${level}) against background ${background}`);
  const originalCss = toCssVariables(originalPairs, themeName);
  const originalTokens = pairsToDtcg(originalPairs, background, themeName, 'Original color tokens before audit fixes');
  const effectiveBaseline = baseline || {css: originalCss, tokens: originalTokens};
  const diff = buildExportDiffs({css, tokens: tokensOut}, effectiveBaseline);

  return {
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passes).length,
      failed: failures.length,
      level,
      background
    },
    results,
    failures,
    fixes,
    css,
    tokens: tokensOut,
    ...(diff ? {diff} : {})
  };
}
