# Adobe wow demo

Open [`adobe-wow.html`](./adobe-wow.html) in a browser (or serve this folder).

```sh
pnpm --filter @adobe/leonardo-mcp exec -- python3 -m http.server 8765 --directory demo
# then visit http://localhost:8765/adobe-wow.html
```

Talk track:

1. Click brand chips — UI + tokens retheme from Leonardo Spectrum-safe presets
2. Toggle dark — same ratio names, new values
3. Audit & fix — fail badges flash, then PR-ready unified diff appears
