# @adobe/leonardo-mcp

## 0.2.0

### Minor Changes

- Add Adobe workflow tools: `generate-spectrum-theme`, `audit-token-set`, and `generate-theme-pair`.
- `generate-theme` now returns `{ contrastColors, contrastColorPairs, css, tokens }` (CSS custom properties + DTCG-style design tokens) instead of a bare `contrastColors` array.
- Shared formatters for Spectrum AA/AAA presets, token export, and PR-ready unified diffs.

## 0.1.0

### Minor Changes

- 2cda361: Add @adobe/leonardo-mcp — MCP server for Leonardo contrast colors (generate-theme, check-contrast, convert-color, create-palette).
