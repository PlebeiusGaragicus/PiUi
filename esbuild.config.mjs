import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
	entryPoints: [join(root, "server/main.ts")],
	bundle: true,
	platform: "node",
	format: "esm",
	outfile: join(root, "dist/piui-server.mjs"),
	banner: {
		js: "#!/usr/bin/env node",
	},
});
