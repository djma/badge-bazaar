import { build } from "esbuild";
import { polyfillNode } from "esbuild-plugin-polyfill-node";

build({
  entryPoints: ["src/web/index.tsx", "src/web/popup.tsx"],
  bundle: true,
  outdir: "www/dist",
  plugins: [polyfillNode()],
});
