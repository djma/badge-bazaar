import { build } from "esbuild";
import { polyfillNode } from "esbuild-plugin-polyfill-node";

const isProd = process.env.NODE_ENV === "prod";

build({
  entryPoints: ["src/web/index.tsx", "src/web/popup.tsx"],
  bundle: true,
  outdir: "www/dist",
  plugins: [
    polyfillNode({
      polyfills: {
        // "fs/promises": true,
        // fs: true,
        // crypto: true,
      },
    }),
  ],
  minify: isProd,
  platform: "browser",
  external: ["fs", "fs/promises"],
});

build({
  entryPoints: ["src/server.ts"],
  bundle: true,
  outdir: "dist/src",
  minify: isProd,
  platform: "node",
});
