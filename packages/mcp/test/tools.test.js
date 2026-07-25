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

import {describe, it} from 'node:test';
import assert from 'node:assert';
import {generateTheme} from '../src/tools/generate-theme.js';
import {checkContrast} from '../src/tools/check-contrast.js';
import {convertColor} from '../src/tools/convert-color.js';
import {createPalette} from '../src/tools/create-palette.js';
import {generateSpectrumTheme} from '../src/tools/generate-spectrum-theme.js';
import {auditTokenSet} from '../src/tools/audit-token-set.js';
import {generateThemePair} from '../src/tools/generate-theme-pair.js';
import {unifiedDiff} from '../src/lib/diffTokens.js';

describe('generate-theme', () => {
  it('returns contrastColors, pairs, css, and tokens', () => {
    const result = generateTheme({
      colors: [
        {
          name: 'blue',
          colorKeys: ['#5CDBFF', '#0000FF'],
          ratios: [3, 4.5]
        }
      ],
      backgroundColor: {
        name: 'gray',
        colorKeys: ['#cacaca'],
        ratios: [2, 3, 4.5, 8]
      },
      lightness: 97
    });
    assert(Array.isArray(result.contrastColors));
    assert(result.contrastColors[0].background);
    const withValues = result.contrastColors.find((r) => r.name === 'blue' && r.values);
    assert(withValues);
    assert(withValues.values.length === 2);
    assert(typeof withValues.values[0].value === 'string');
    assert(typeof result.contrastColorPairs === 'object');
    assert(result.contrastColorPairs.background);
    assert(typeof result.css === 'string');
    assert(result.css.includes('--background:'));
    assert(typeof result.tokens === 'object');
    assert(result.tokens.Theme || Object.keys(result.tokens).length > 0);
  });
});

describe('generate-spectrum-theme', () => {
  it('emits AA semantic text ratios and light/dark CSS/DTCG with shared names', () => {
    const result = generateSpectrumTheme({
      brandColors: [{name: 'blue', colorKeys: ['#5CDBFF', '#0000FF']}],
      level: 'AA',
      modes: {light: 97, dark: 15},
      themeName: 'Brand'
    });

    assert.equal(result.config.level, 'AA');
    assert.equal(result.config.ratios.text, 4.5);
    assert(result.modes.light);
    assert(result.modes.dark);

    const lightBlue = result.modes.light.contrastColors.find((c) => c.name === 'blue');
    assert(lightBlue);
    const textSwatch = lightBlue.values.find((v) => v.name === 'blue--text');
    assert(textSwatch);
    assert.equal(textSwatch.contrast, 4.5);

    const lightNames = Object.keys(result.modes.light.contrastColorPairs)
      .filter((k) => k !== 'background')
      .sort();
    const darkNames = Object.keys(result.modes.dark.contrastColorPairs)
      .filter((k) => k !== 'background')
      .sort();
    assert.deepEqual(lightNames, darkNames);
    assert(result.modes.light.css.includes('--blue--text:'));
    assert(result.modes.dark.css.includes('--blue--text:'));
    assert(result.modes.light.tokens.BrandLight || result.modes.light.tokens.Light);
    assert(result.modes.light.contrastColorPairs.background !== result.modes.dark.contrastColorPairs.background);
  });
});

describe('audit-token-set', () => {
  it('flags low-contrast text and suggests a fix when brand keys are provided', () => {
    const result = auditTokenSet({
      background: '#ffffff',
      level: 'AA',
      tokens: {
        'gray-text': '#bbbbbb',
        'gray-border': '#e0e0e0'
      },
      roles: {
        'gray-text': 'text',
        'gray-border': 'border'
      },
      recolor: [{name: 'gray', colorKeys: ['#cacaca', '#000000']}]
    });

    assert(result.summary.failed >= 1);
    const textFailure = result.failures.find((f) => f.name === 'gray-text');
    assert(textFailure);
    assert.equal(textFailure.targetRatio, 4.5);
    const textFix = result.fixes.find((f) => f.name === 'gray-text');
    assert(textFix);
    assert(textFix.suggestedValue);
    assert(textFix.suggestedValue !== '#bbbbbb');
    assert(result.diff);
    assert(result.diff.css || result.diff.tokens);
  });
});

describe('generate-theme-pair', () => {
  it('shares ratio keys across modes and differs by lightness', () => {
    const result = generateThemePair({
      colors: [
        {
          name: 'blue',
          colorKeys: ['#5CDBFF', '#0000FF'],
          ratios: {'blue--text': 4.5, 'blue--largeText': 3},
          colorSpace: 'LCH'
        }
      ],
      backgroundColor: {
        name: 'gray',
        colorKeys: ['#cacaca'],
        ratios: {'gray--text': 4.5, 'gray--border': 2},
        colorSpace: 'LCH'
      },
      modes: {light: 97, dark: 15}
    });

    const lightKeys = Object.keys(result.modes.light.contrastColorPairs).sort();
    const darkKeys = Object.keys(result.modes.dark.contrastColorPairs).sort();
    assert.deepEqual(lightKeys, darkKeys);
    assert(result.modes.light.contrastColorPairs['blue--text']);
    assert(result.modes.dark.contrastColorPairs['blue--text']);
    assert.notEqual(result.modes.light.contrastColorPairs.background, result.modes.dark.contrastColorPairs.background);
  });
});

describe('unifiedDiff', () => {
  it('produces a non-empty patch when baseline differs', () => {
    const before = ':root {\n  --blue--text: #aaaaaa;\n}';
    const after = ':root {\n  --blue--text: #222222;\n}';
    const patch = unifiedDiff(before, after, 'theme.css');
    assert(patch.includes('--- a/theme.css'));
    assert(patch.includes('+++ b/theme.css'));
    assert(patch.includes('-  --blue--text: #aaaaaa;'));
    assert(patch.includes('+  --blue--text: #222222;'));
  });
});

describe('check-contrast', () => {
  it('returns ratio and wcag2 pass/fail for #000 on #fff', () => {
    const result = checkContrast({foreground: '#000000', background: '#ffffff', method: 'wcag2'});
    assert(typeof result.ratio === 'number');
    assert(result.ratio > 15);
    assert(result.wcag2.aa === true);
    assert(result.wcag2.aaa === true);
  });
});

describe('convert-color', () => {
  it('converts hex to RGB string', () => {
    const result = convertColor({color: '#ff0000', format: 'RGB'});
    assert(result.value.toLowerCase().includes('rgb'));
    assert(result.value.includes('255'));
  });
});

describe('create-palette', () => {
  it('returns array of color strings', () => {
    const result = createPalette({
      colorKeys: ['#ff0000', '#0000ff'],
      steps: 5
    });
    assert(Array.isArray(result.colors));
    assert(result.colors.length === 5);
    assert(result.colors.every((c) => typeof c === 'string'));
  });
});
