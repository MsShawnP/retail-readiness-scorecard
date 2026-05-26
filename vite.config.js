import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Custom plugin: handle `?base64` imports in dev mode.
 * Vite's built-in asset handling doesn't support ?base64 — it only passes through
 * the URL string in dev, which breaks jsPDF's addFileToVFS (expects actual base64).
 * This plugin resolves `?base64` imports by reading the file from disk and
 * returning its base64 content as the module's default export.
 */
function base64Plugin() {
  return {
    name: 'vite-plugin-base64',
    transform(code, id) {
      // Only handle `?base64` imports
      if (!id.includes('?base64')) return null;
      const filePath = id.replace('?base64', '');
      try {
        const data = fs.readFileSync(filePath);
        const b64 = data.toString('base64');
        return {
          code: `export default ${JSON.stringify(b64)};`,
          map: null,
        };
      } catch (e) {
        this.error(`base64Plugin: could not read file ${filePath}: ${e.message}`);
      }
    },
  };
}

export default defineConfig({
  root: 'src',
  plugins: [
    base64Plugin(),
    viteSingleFile({
      useRecommendedBuildConfig: true,
      removeViteModuleLoader: true,
    }),
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/retail-readiness-scorecard.html'),
    },
  },
});
