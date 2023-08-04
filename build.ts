import { build } from "esbuild";
import { polyfillNode } from "esbuild-plugin-polyfill-node";

const isProd = process.env.NODE_ENV === "prod";

build({
  entryPoints: ["src/web/index.tsx", "src/web/popup.tsx"],
  bundle: true,
  outdir: "www/dist",
  plugins: [polyfillNode()],
  minify: isProd,
});
