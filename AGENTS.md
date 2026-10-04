# Repository Guidelines

## Project Structure & Module Organization

`src/main.tsx` mounts the React app; `src/App.tsx` owns project state, navigation, and Markdown file controls. Put screen specific UI in `src/views/`, reusable editors and controls in `src/components/`, and data types, calculations, geometry, and serialization in `src/domain/`. Tests live beside domain code as `*.test.ts`; representative story files live in `tests/fixtures/`. `tmp/` contains the original standalone HTML and story exports for comparison. Do not edit those originals when changing the app. Vite writes generated output to `dist/`.

## Build, Test, and Development Commands

Use Node.js 20.19+ (or 22.12+) and install locked dependencies with `npm ci`. Run `npm run dev`, then open the URL Vite prints (normally `http://localhost:5173/`). Run `npm test` for one Vitest pass or `npm run test:watch` while editing. Run `npm run typecheck` for TypeScript diagnostics. Run `npm run build` to typecheck and generate the production site in `dist/`; use `npm run preview` to serve that build locally.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, ES module imports, and the existing inline React style conventions. Name React components and their `.tsx` files in PascalCase (`SceneView.tsx`); use camelCase for functions and variables (`markdownToCards`). Keep story logic out of view components. No formatter or linter is currently configured, so follow nearby code and review diffs for incidental formatting changes. Several migrated UI files have `@ts-nocheck`; add prop and state types before removing a marker.

## Testing Guidelines

Use Vitest. Add focused `*.test.ts` cases for changes to ordering, word counts, or the Markdown format. For serialization changes, test both import and export against a representative fixture and retain compatibility with older story files. Run `npm test` and `npm run build` before opening a pull request. There is no numeric coverage threshold.

## Commit & Pull Request Guidelines

The repository has one initial commit, so no established commit format exists. Use short imperative subjects that describe the change, such as `Preserve thread colors on import`. In pull requests, summarize behavior changes, list verification commands, link relevant issues when available, and include screenshots for visible UI changes. Note any Markdown format changes or migration limitations.
