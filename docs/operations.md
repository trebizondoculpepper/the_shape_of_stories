# Operations

## Development and verification

Install dependencies with `npm ci` and start the app with `npm run dev`. Run `npm test` and `npm run build` before sharing a change. `npm run build` runs strict TypeScript checking and writes the production site to `dist/`.

The app runs entirely in the browser. React, React DOM and JSX compilation now come from installed dependencies; the browser no longer loads React or Babel from a CDN. Vite serves source modules during development and bundles them for production.

## Story files

The app starts with a new example outline in memory. Use **Import .md** to load an exported story and **Export .md** to save work. The app does not autosave to browser storage or a server, so export before refreshing or closing the tab. **Start Over** clears the current in-memory project after its confirmation dialog. Keep exported `.md` files as the durable copies of stories.

The existing `# STORY PLOT DATA` Markdown format and its older-file fallback are implemented in `src/domain/markdown.ts`. The sample Cinderella story in `tests/fixtures/cinderella.md` exercises that format. The original standalone source and both Desktop copies remain in `tmp/` for comparison; they are not needed at runtime.

## Production

Run `npm run build`, then deploy the contents of `dist/` to a static web server. `npm run preview` serves that exact build for a local check. No environment variables, API keys, database or backend service are required. If hosting under a URL path rather than at the site root, set Vite's `base` option in `vite.config.ts` before building.

## Editing guide

Keep serialisation changes in `src/domain/markdown.ts` and add a test with a representative `.md` file. Put story ordering and calculations in `src/domain/story.ts` or `src/domain/words.ts`; UI components should call those functions. Keep changes to a view in its corresponding `src/views/` file, and shared editor behavior in `src/components/`. The UI modules still contain the original inline styles, which can be refactored gradually without changing the data format.

If the page is blank during development, inspect the browser console and the Vite terminal output. If imports look wrong, run `npm test` and compare the file with `tests/fixtures/cinderella.md`. If a production page shows missing assets, check the deployed `dist/` contents and the Vite `base` path.
