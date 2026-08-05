# AGENTS.md

## Cursor Cloud specific instructions

Leonardo is a **pnpm + moonrepo monorepo** with three projects (no backend, no
database, no services to stand up — everything is a library or static site):

- `contrast-colors` (`packages/contrast-colors`) — core adaptive-color library (`@adobe/leonardo-contrast-colors`). Everything depends on it.
- `ui` (`docs/ui`) — the Leonardo web app (Vite static site). Depends on `contrast-colors`.
- `mcp` (`packages/mcp`) — MCP server exposing the library as tools over stdio.

Standard commands live in each `moon.yml` / `package.json`; run tasks with
`pnpm moon run <project>:<task>` (e.g. `contrast-colors:test`, `mcp:test`,
`ui:lint`, `ui:dev`, `ui:buildSite`). `pnpm moon ci` mirrors GitHub CI.

Non-obvious caveats:

- **Node 24 is required** (`engines.node >=24.0.0`; moon pins Node `24.0.0`). moon
  always runs tasks with its own pinned Node 24, so `pnpm moon run ...` is safe
  regardless of the shell's `node`. The VM's default `node` on `PATH`
  (`/exec-daemon/node`) is v22; `~/.bashrc` prepends nvm's Node 24 so new
  interactive shells and direct `node`/`pnpm` commands use 24. If you ever get a
  v22 shell, run `nvm use 24` (or `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"`).
- **Do not let moon rewrite `package.json`.** Running moon syncs the root
  `packageManager` field to its toolchain pin (`pnpm@10.29.3` vs the committed
  `10.30.1`). This shows up as an unstaged `package.json` change; `git checkout package.json` to discard it before committing.
- **UI dev server runs on `http://localhost:5173`** (Vite 6 default), NOT the
  `localhost:1234` mentioned in the README (that was the old Parcel port).
- On `pnpm moon run ui:dev`, esbuild prints `Failed to scan for dependencies`
  errors at startup. These are non-fatal — the Vite server still starts and
  serves pages. `pnpm moon run ui:buildSite` (Rollup) builds cleanly.
- **Known broken UI pages on `main`:** `theme.html`, `scales.html`, and
  `tools.html` render blank because `docs/ui/src/js/getThemeData.js` imports
  `_colorScales`, which `initialTheme.js` does not export (`SyntaxError` in the
  browser). `index.html` and `demo.html` work fine. A fix is in progress on the
  `cursor/fix-blank-ui-pages` branch — this is an app bug, not an environment issue.
- The `mcp` `generate-theme` tool computes correctly but returns an array as
  `structuredContent`, which the current MCP SDK rejects at output validation.
  `check-contrast`, `convert-color`, and `create-palette` work over stdio.
- The two entries in `.gitmodules` (`SAPC-APCA`, `docs/ui/src/c3`) use SSH URLs,
  are not registered gitlinks, and are not needed to install, build, test, or run
  anything. Skip `git submodule update`.
