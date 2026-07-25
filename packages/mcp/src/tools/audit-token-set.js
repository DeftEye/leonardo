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

import {auditTokenSet as auditTokenSetLib} from '../lib/auditTokens.js';

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
  try {
    if (!args?.background) throw new Error('background is required');
    if (!args?.tokens || typeof args.tokens !== 'object') throw new Error('tokens object is required');
    return auditTokenSetLib(args);
  } catch (err) {
    throw new Error(`Failed to audit token set: ${err.message}`);
  }
}
