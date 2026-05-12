import { svelte } from "@sveltejs/vite-plugin-svelte";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(root);

export default defineConfig({
	plugins: [svelte()],
	root,
	publicDir: false,
	build: {
		outDir: resolve(repoRoot, "dist/web"),
		emptyOutDir: true,
		sourcemap: true,
	},
	server: {
		port: 5173,
		proxy: {
			"/api": {
				target: "http://127.0.0.1:8502",
				changeOrigin: true,
			},
		},
	},
});
