#!/usr/bin/env node
/**
 * Offline-guarantee check. Runs after `npm run build` (via the postbuild hook).
 *
 * The scorecard must work from a downloaded local file with no internet
 * connection — every asset inlined, zero network requests. This guards that
 * promise: it fails the build if the bundled HTML would load any external
 * resource, so a future change (e.g. swapping doc.save() for an HTML-based PDF
 * render, or a font that fails to inline) can't silently reintroduce a fetch.
 *
 * It flags resource-LOADING references only (script/link/img/iframe src+href,
 * CSS url()/@import). Plain anchor links like <a href="https://lailarallc.com">
 * are user navigation, not loads, and are allowed. String URLs buried in
 * bundled libraries (jsPDF's unused cdnjs/license URLs) are not resource loads
 * and are likewise ignored.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist/retail-readiness-scorecard.html');

if (!fs.existsSync(DIST)) {
  console.error(`✗ offline check: build output not found at ${DIST}`);
  process.exit(1);
}

const html = fs.readFileSync(DIST, 'utf8');

// Each pattern targets a way the browser would actually fetch something external.
const externalLoaders = [
  { name: '<script src="http…">',  re: /<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//i },
  { name: '<link href="http…">',   re: /<link\b[^>]*\bhref\s*=\s*["']https?:\/\//i },
  { name: '<img src="http…">',     re: /<img\b[^>]*\bsrc\s*=\s*["']https?:\/\//i },
  { name: '<iframe src="http…">',  re: /<iframe\b[^>]*\bsrc\s*=\s*["']https?:\/\//i },
  { name: 'CSS url(http…)',        re: /url\(\s*["']?https?:\/\//i },
  { name: 'CSS @import http…',     re: /@import\s+(?:url\(\s*)?["']?https?:\/\//i },
];

const hits = externalLoaders.filter(p => p.re.test(html)).map(p => p.name);

if (hits.length > 0) {
  console.error('✗ offline check FAILED — built HTML would load external resources:');
  for (const h of hits) console.error(`    • ${h}`);
  console.error('  All assets must be inlined. See DECISIONS.md (offline-first architecture).');
  process.exit(1);
}

// Positive confirmation that fonts are inlined (they should be base64 data URIs).
const fontsInlined = /data:(?:font|application\/font|application\/x-font)/i.test(html)
  || /url\(\s*["']?data:[^)]*base64/i.test(html);
if (!fontsInlined) {
  console.error('✗ offline check FAILED — no inlined font data URI found; fonts may be loading externally.');
  process.exit(1);
}

const sizeKB = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`✓ offline check passed — no external resource loads; fonts inlined (${sizeKB} KB raw).`);
