#!/usr/bin/env node
/**
 * Production build validation for web-ui-auditor (MV3).
 *
 * Single source of truth used by `build.yml` and `release.yml` so the checks
 * never drift. Validates structure, manifest references, and absence of
 * development-only artifacts in `dist/`. Exits 1 with a readable report.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function note(message) {
  notes.push(message);
}

function listFiles(dir, base = dir, entries = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(fullPath, base, entries);
    } else {
      entries.push({ relative: path.relative(base, fullPath).split('\\').join('/'), fullPath });
    }
  }
  return entries;
}

// --- 1. dist exists ---------------------------------------------------------

if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  console.error(`✗ dist/ not found. Run "pnpm build" first. (looked at ${distDir})`);
  process.exit(1);
}

const files = listFiles(distDir);
const relativeFiles = new Set(files.map((f) => f.relative));

function expectFile(rel) {
  if (!relativeFiles.has(rel)) fail(`manifest-referenced artifact missing: "${rel}"`);
}

// --- 2. manifest ------------------------------------------------------------

const manifestPath = path.join(distDir, 'manifest.json');
if (!relativeFiles.has('manifest.json')) {
  console.error('✗ dist/manifest.json not found.');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(
    `dist/manifest.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
  );
  manifest = null;
}

if (manifest !== null) {
  if (manifest.manifest_version !== 3)
    fail(`manifest_version must be 3, got: ${manifest.manifest_version}`);
  if (typeof manifest.name !== 'string' || manifest.name.length === 0)
    fail('manifest.name missing');
  const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
  if (typeof manifest.version !== 'string' || !semver.test(manifest.version)) {
    fail(`manifest.version must be semver, got: ${JSON.stringify(manifest.version)}`);
  }

  // - background service worker (module MV3) -------------------------------
  const sw = manifest.background?.service_worker;
  if (typeof sw !== 'string' || sw.length === 0) {
    fail('manifest.background.service_worker missing');
  } else {
    expectFile(sw);
    if (manifest.background.type !== 'module') {
      fail('manifest.background.type must be "module" (bundles are ES modules)');
    }
  }

  // - side panel ------------------------------------------------------------
  const panel = manifest.side_panel?.default_path;
  if (typeof panel !== 'string' || panel.length === 0) {
    fail('manifest.side_panel.default_path missing');
  } else {
    expectFile(panel);
    // every script/stylesheet the generated panel page references must exist
    if (relativeFiles.has(panel)) {
      const panelHtml = readFileSync(path.join(distDir, panel), 'utf8');
      const assetRef = /(?:src|href)="([^"\\]+)"/g;
      let match;
      while ((match = assetRef.exec(panelHtml)) !== null) {
        const ref = match[1];
        if (!/^(?:[a-z]+:)?\/\//i.test(ref) && !ref.startsWith('#')) {
          const resolved = path
            .normalize(path.join(path.posix.dirname(panel), ref))
            .split('\\')
            .join('/');
          if (!relativeFiles.has(resolved)) {
            fail(`panel ${panel} references missing asset: "${resolved}" (raw: "${ref}")`);
          }
        }
      }
    }
  }

  // - statically declared content scripts (none in MVP, but keep honest) ----
  for (const cs of manifest.content_scripts ?? []) {
    for (const file of cs.js ?? []) expectFile(file);
    for (const cssFile of cs.css ?? []) expectFile(cssFile);
  }

  // - declared action icons -------------------------------------------------
  const iconRefs = Object.values(manifest.action?.default_icon ?? {});
  for (const icon of [...iconRefs].flat()) {
    if (typeof icon === 'string') expectFile(icon);
  }
  if (manifest.action?.default_icon === undefined) {
    note('no action/default_icon declared (planned for hardening milestone M7)');
  }

  // - permissions: least privilege ------------------------------------------
  const permissions = manifest.permissions ?? [];
  if (permissions.includes('debugger'))
    fail('manifest requests the "debugger" permission (forbidden by spec)');
  const hostPermissions = manifest.host_permissions ?? [];
  if (hostPermissions.length > 0) {
    fail(
      `manifest requests install-time host_permissions ${JSON.stringify(hostPermissions)}; only optional per-origin grants are allowed`,
    );
  }
  for (const optional of manifest.optional_host_permissions ?? []) {
    if (
      !/^\*?:?\/?\/?\*?\//.test(optional) &&
      !optional.startsWith('http://') &&
      !optional.startsWith('https://')
    ) {
      fail(`optional_host_permissions contains a non-http(s) scheme: ${optional}`);
    }
  }
}

// --- 3. no development-only artifacts ---------------------------------------

for (const f of files) {
  if (f.relative.endsWith('.map')) {
    fail(`source map leaked into production output: "${f.relative}"`);
  }
  const size = statSync(f.fullPath).size;
  if (size === 0) fail(`empty artifact: "${f.relative}"`);
  if (size < 2 * 1024 * 1024) {
    const text = readFileSync(f.fullPath, 'utf8');
    if (text.includes('sourceMappingURL')) fail(`bundle references a source map: "${f.relative}"`);
    if (/VITE_[A-Z0-9_]+/.test(text) && !f.relative.includes('manifest.json')) {
      fail(`possible Vite env leak in "${f.relative}"`);
    }
  }
}

// --- 4. expected core outputs ------------------------------------------------

for (const expected of ['background.js', 'content.js']) {
  expectFile(expected);
}

// --- report ------------------------------------------------------------------

for (const n of notes) console.log(`• ${n}`);
if (failures.length > 0) {
  for (const f of failures) console.error(`✗ ${f}`);
  console.error(`\nbuild validation FAILED with ${failures.length} problem(s)`);
  process.exit(1);
}
console.log(
  `✓ build validation passed: ${files.length} files, manifest MV3 OK, panel/service-worker/content validated`,
);
