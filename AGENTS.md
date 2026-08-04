# Timelines contributor guide

## Project overview

Timelines Studio is a local-first Electron application for editing `.timeline`
(JSON) files and associated Markdown notes. The UI is built with React and Vite;
Electron owns filesystem access and exposes it to the renderer through the preload
bridge.

## Layout

- `src/`: React desktop application.
- `src/viewer/`: standalone browser viewer. It must remain independent of the
  Electron shell.
- `src/components/`: UI components; `src/styles/` contains the corresponding
  stylesheet layers.
- `src/utils/`: renderer-side domain and storage helpers.
- `electron/`: Electron main process, preload bridge, and Node-side helpers.
- `test/`: Node built-in test runner tests (`*.test.cts`).

## Common commands

```bash
bun install
bun run electron:dev    # desktop app in development
bun run dev:viewer      # browser viewer only
bun run build           # production renderer build
bun run build:viewer    # production viewer build
bun run typecheck
bun run lint
bun test
```

Use the smallest relevant verification first. Run `bun run lint` after React or
TypeScript changes, run `bun run typecheck` after any source change, and run `bun test` when changing utilities or Electron-side
logic with applicable tests.

## Implementation conventions

- Use TypeScript throughout: `.ts` for modules (including Electron source),
  `.tsx` for React UI, and `.cts` for Bun test modules.
- Preserve the existing style of the file you edit. Most newer configuration and
  utility modules omit semicolons, while some older React files use them.
- Keep reusable state and data transformations in `src/utils/` or hooks rather
  than embedding them in large components.
- Treat timeline files as user data: keep changes backward-compatible, validate
  imported data, and preserve unknown fields when practical.
- Do not call Node/Electron APIs directly from React components. Add narrowly
  scoped bridge methods through `electron/preload.ts` and consume them via
  `src/utils/electronApi.ts`.

## Viewer boundary

The web viewer must not import `HomePage`, `electronApi`, or any Electron module.
This is enforced by ESLint. Keep viewer code browser-compatible and use the
viewer-specific package/store utilities when it needs timeline data.

## Change discipline

- Avoid modifying generated output (`dist/`, `dist-viewer/`, and `release/`).
- Do not alter lockfiles unless dependency resolution is intentionally part of
  the change.
- For UI changes, test the relevant desktop or viewer flow manually when feasible.
- Keep commits focused; do not overwrite unrelated working-tree changes.
