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

import {readFileSync} from 'fs';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {generateTheme} from './tools/generate-theme.js';
import {checkContrast} from './tools/check-contrast.js';
import {convertColor} from './tools/convert-color.js';
import {createPalette} from './tools/create-palette.js';
import {generateSpectrumTheme} from './tools/generate-spectrum-theme.js';
import {auditTokenSet} from './tools/audit-token-set.js';
import {generateThemePair} from './tools/generate-theme-pair.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const server = new McpServer({
  name: 'leonardo',
  version: pkg.version
});

const colorSpaceSchema = z.enum(['LCH', 'LAB', 'RGB', 'HSL', 'HSV', 'HSLuv', 'CAM02', 'CAM02p', 'OKLAB', 'OKLCH']);

const colorDefSchema = z.object({
  name: z.string(),
  colorKeys: z.array(z.string()),
  ratios: z.union([z.array(z.number()), z.record(z.string(), z.number())]),
  colorSpace: colorSpaceSchema.optional(),
  colorspace: colorSpaceSchema.optional()
});

const brandColorSchema = z.object({
  name: z.string(),
  colorKeys: z.array(z.string()),
  colorSpace: colorSpaceSchema.optional(),
  colorspace: colorSpaceSchema.optional()
});

const outputFormatSchema = z.enum(['HEX', 'RGB', 'HSL', 'HSV', 'HSLuv', 'LAB', 'LCH', 'OKLAB', 'OKLCH', 'CAM02', 'CAM02p']);

const baselineSchema = z
  .object({
    css: z.union([z.string(), z.record(z.unknown())]).optional(),
    tokens: z.union([z.string(), z.record(z.unknown())]).optional()
  })
  .optional();

function toolResult(result) {
  return {
    content: [{type: 'text', text: JSON.stringify(result, null, 2)}],
    structuredContent: result
  };
}

function toolError(err) {
  return {content: [{type: 'text', text: err.message}], isError: true};
}

server.registerTool(
  'generate-theme',
  {
    title: 'Generate theme',
    description: 'Generate a contrast-based color theme. Returns contrastColors, contrastColorPairs, CSS custom properties, and DTCG-style design tokens.',
    inputSchema: z.object({
      colors: z.array(colorDefSchema),
      backgroundColor: colorDefSchema,
      lightness: z.number().min(0).max(100),
      contrast: z.number().optional(),
      saturation: z.number().min(0).max(100).optional(),
      output: outputFormatSchema.optional(),
      formula: z.enum(['wcag2', 'wcag3']).optional(),
      themeName: z.string().optional()
    })
  },
  async (args) => {
    try {
      return toolResult(generateTheme(args));
    } catch (err) {
      return toolError(err);
    }
  }
);

server.registerTool(
  'generate-theme-pair',
  {
    title: 'Generate light/dark theme pair',
    description: 'Generate light and dark theme snapshots from the same Leonardo color definitions and shared ratios. Returns CSS and DTCG tokens for each mode, plus optional unified diffs against a baseline.',
    inputSchema: z.object({
      colors: z.array(colorDefSchema),
      backgroundColor: colorDefSchema,
      modes: z.object({
        light: z.number().min(0).max(100),
        dark: z.number().min(0).max(100)
      }),
      contrast: z.number().optional(),
      saturation: z.number().min(0).max(100).optional(),
      output: outputFormatSchema.optional(),
      formula: z.enum(['wcag2', 'wcag3']).optional(),
      themeName: z.string().optional(),
      baseline: baselineSchema
    })
  },
  async (args) => {
    try {
      return toolResult(generateThemePair(args));
    } catch (err) {
      return toolError(err);
    }
  }
);

server.registerTool(
  'generate-spectrum-theme',
  {
    title: 'Generate Spectrum-safe theme',
    description: 'Generate a Spectrum-oriented Adobe UI theme from brand hex keys and AA/AAA targets. Uses semantic ratios (border, largeText, icon, text) in LCH, emits light/dark modes with CSS variables and DTCG tokens, and optional PR-ready diffs.',
    inputSchema: z.object({
      brandColors: z.array(brandColorSchema),
      neutralKeys: z.array(z.string()).optional(),
      neutralName: z.string().optional(),
      level: z.enum(['AA', 'AAA']).optional(),
      modes: z
        .object({
          light: z.number().min(0).max(100).optional(),
          dark: z.number().min(0).max(100).optional()
        })
        .optional(),
      contrast: z.number().optional(),
      saturation: z.number().min(0).max(100).optional(),
      output: outputFormatSchema.optional(),
      formula: z.enum(['wcag2', 'wcag3']).optional(),
      themeName: z.string().optional(),
      baseline: baselineSchema
    })
  },
  async (args) => {
    try {
      return toolResult(generateSpectrumTheme(args));
    } catch (err) {
      return toolError(err);
    }
  }
);

server.registerTool(
  'audit-token-set',
  {
    title: 'Audit token set',
    description: 'Audit a flat or DTCG-ish color token set against a background and AA/AAA role thresholds. Returns failures, suggested ratio/value fixes (when recolor brand keys are provided), CSS/DTCG output, and PR-ready unified diffs.',
    inputSchema: z.object({
      background: z.string(),
      tokens: z.record(z.unknown()),
      level: z.enum(['AA', 'AAA']).optional(),
      roles: z.record(z.enum(['border', 'largeText', 'icon', 'text'])).optional(),
      recolor: z
        .array(
          z.object({
            name: z.string().optional(),
            colorKeys: z.array(z.string())
          })
        )
        .optional(),
      formula: z.enum(['wcag2', 'wcag3']).optional(),
      lightness: z.number().min(0).max(100).optional(),
      themeName: z.string().optional(),
      baseline: baselineSchema
    })
  },
  async (args) => {
    try {
      return toolResult(auditTokenSet(args));
    } catch (err) {
      return toolError(err);
    }
  }
);

server.registerTool(
  'check-contrast',
  {
    title: 'Check contrast',
    description: 'Check contrast ratio between foreground and background. Returns ratio and WCAG 2 AA/AAA pass/fail, or APCA Lc when method is wcag3.',
    inputSchema: z.object({
      foreground: z.string(),
      background: z.string(),
      method: z.enum(['wcag2', 'wcag3']).optional()
    })
  },
  async (args) => {
    try {
      return toolResult(checkContrast(args));
    } catch (err) {
      return toolError(err);
    }
  }
);

server.registerTool(
  'convert-color',
  {
    title: 'Convert color',
    description: 'Convert a color value to another format (HEX, RGB, HSL, LCH, etc.).',
    inputSchema: z.object({
      color: z.string(),
      format: outputFormatSchema
    })
  },
  async (args) => {
    try {
      return toolResult(convertColor(args));
    } catch (err) {
      return toolError(err);
    }
  }
);

server.registerTool(
  'create-palette',
  {
    title: 'Create palette',
    description: 'Create an interpolated color scale from color keys (no contrast targeting).',
    inputSchema: z.object({
      colorKeys: z.array(z.string()),
      colorspace: colorSpaceSchema.optional(),
      colorSpace: colorSpaceSchema.optional(),
      steps: z.number().int().min(2),
      smooth: z.boolean().optional(),
      shift: z.number().optional(),
      fullScale: z.boolean().optional(),
      distributeLightness: z.enum(['linear', 'polynomial']).optional(),
      sortColor: z.boolean().optional()
    })
  },
  async (args) => {
    try {
      return toolResult(createPalette(args));
    } catch (err) {
      return toolError(err);
    }
  }
);

export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
