// Copies MapLibre's web worker next to the site's static files (public/vendor), so the browser can load it from a
// fixed URL. Runs automatically before `npm run build` / `npm run dev`; the copy always matches the installed version.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("maplibre-gl/package.json"));
const version = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")).version;
mkdirSync("public/vendor", { recursive: true });
copyFileSync(join(pkgDir, "dist/maplibre-gl-worker.mjs"), "public/vendor/maplibre-gl-worker.mjs");
console.log(`maplibre worker ${version} → public/vendor/maplibre-gl-worker.mjs`);
