# Story Shape

Story Shape is a browser based plot planning app. This project imports the original single-file React app from `tmp/story-shape.html` into a Vite, React and TypeScript source tree. It retains the Scene, Flowchart, Ring, Circle, Arc Chart, Threads and Words views, and the existing Markdown file format.

## Quick start

Use Node.js 20.19+ (or 22.12+) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with hot reload |
| `npm test` | Run the regression tests once |
| `npm run test:watch` | Re-run tests during editing |
| `npm run typecheck` | Check the TypeScript project |
| `npm run build` | Typecheck and build a static site in `dist/` |
| `npm run preview` | Serve the production build locally |

See [operations](docs/operations.md) for data handling, deployment and troubleshooting.

## Source layout

- `src/App.tsx` holds application state, view navigation, and file import/export controls.
- `src/views/` contains each main view and the chapter controls.
- `src/components/` contains editors, thread controls, charts and shared button styles.
- `src/domain/` contains the data types, story calculations, word counts and Markdown codec.
- `src/domain/story.test.ts` tests the Markdown format and key calculations; `tests/fixtures/` holds a representative exported story.
- `index.html` and `src/main.tsx` are the Vite and React entry points.

The original JSX has been moved with its event and state logic intact. The larger UI modules have `@ts-nocheck` markers as a migration boundary; the domain modules and new entry point are checked with strict TypeScript. Remove those markers incrementally when editing the UI, after adding component prop and state types.
