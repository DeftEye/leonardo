# Adobe workflows with @adobe/leonardo-mcp

Prefer the MCP tools below for Adobe design-system / Spectrum-oriented agent work. They return CSS custom properties, DTCG-style tokens, and optional unified diffs ready to paste into a PR.

## 1. Generate a Spectrum-safe theme from brand hex + AA

Use **`generate-spectrum-theme`**.

```json
{
  "brandColors": [
    { "name": "blue", "colorKeys": ["#5CDBFF", "#0000FF"] },
    { "name": "red", "colorKeys": ["#FF9A81", "#FF0000"] }
  ],
  "level": "AA",
  "modes": { "light": 97, "dark": 15 },
  "themeName": "Brand"
}
```

What you get:

- Semantic ratios: `blue--border` (2), `blue--largeText` / `blue--icon` (3), `blue--text` (4.5). AAA also adds `--textHigh` (7).
- `modes.light` and `modes.dark` with shared ratio names, each including `contrastColors`, `contrastColorPairs`, `css`, `tokens`.
- Optional `baseline: { css, tokens }` → `diff.css` / `diff.tokens` unified patches.

Spectrum-safe here means Adobe UI semantics + WCAG targets in LCH — not a dump of `@adobe/spectrum-tokens` IDs.

## 2. Audit a token set and propose ratio fixes

Use **`audit-token-set`**.

```json
{
  "background": "#ffffff",
  "level": "AA",
  "tokens": {
    "gray-900": "#767676",
    "gray-400": "#d0d0d0",
    "Brand": {
      "text": { "$value": "#8899aa", "$type": "color" }
    }
  },
  "roles": {
    "gray-900": "text",
    "gray-400": "border",
    "Brand.text": "text"
  },
  "recolor": [{ "name": "gray", "colorKeys": ["#cacaca", "#000000"] }]
}
```

Behavior:

- Accepts flat maps or nested DTCG-ish `$value` nodes.
- Role thresholds (AA): border 2, largeText/icon 3, text 4.5 (AAA text 7).
- Failures list measured vs target ratios.
- When `recolor` brand keys are provided, `fixes[].suggestedValue` is a Leonardo-resolved hex at the target ratio.
- Returns fixed `css` / `tokens` and a `diff` against the original set (or an explicit `baseline`).

## 3. Produce light/dark pairings with shared ratios

Use **`generate-theme-pair`** when you already have Leonardo color defs:

```json
{
  "colors": [
    {
      "name": "blue",
      "colorKeys": ["#5CDBFF", "#0000FF"],
      "ratios": { "blue--text": 4.5, "blue--largeText": 3 },
      "colorspace": "LCH"
    }
  ],
  "backgroundColor": {
    "name": "gray",
    "colorKeys": ["#cacaca"],
    "ratios": { "gray--text": 4.5, "gray--border": 2 },
    "colorspace": "LCH"
  },
  "modes": { "light": 97, "dark": 15 }
}
```

Light and dark share the same ratio keys; only background lightness (and resolved hex values) change.

For brand-hex shortcuts, prefer `generate-spectrum-theme` which already emits both modes.

## 4. Turn MCP output into a PR

1. Call `generate-spectrum-theme`, `audit-token-set`, or `generate-theme-pair` with an optional `baseline` (current file contents).
2. Read `diff.css` and/or `diff.tokens` (unified diff text).
3. Apply the patch to the repo’s token/CSS files (or write `modes.light.css` / `modes.dark.css` and DTCG JSON when creating new files).
4. Open a PR whose body summarizes `config.level` / `summary.failed` and links contrast targets.

`generate-theme` alone is enough when you only need one lightness snapshot: it returns `{ contrastColors, contrastColorPairs, css, tokens }`.
