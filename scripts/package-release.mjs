#!/usr/bin/env node
/**
 * Reproducible production ZIP packager for web-ui-auditor.
 *
 * Uses a tiny hand-rolled ZIP writer (no directory entries, fixed mtimes, fixed
 * compression level) so the output bytes are byte-identical for an identical
 * dist/ tree on every run. The .sha256 sidecar follows `sha256sum` format so CI
 * can verify with `sha256sum -c`.
 *
 * Usage: node scripts/package-release.mjs <vX.Y.Z-tag>
 */
import crypto from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? '';
if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(tag)) {
  console.error(`✗ invalid release tag for packaging: "${tag}"`);
  process.exit(1);
}

const distDir = path.resolve(process.cwd(), 'dist');
const outDir = path.resolve(process.cwd(), 'artifacts');
const zipName = `web-ui-auditor-${tag}.zip`;

// DOS timestamp for 2020-01-01 00:00:00 (the determinism anchor).
const DOS_TIME = 0;
const DOS_DATE = (2020 - 1980) * 512 + 1 * 32 + 1; // 0x5021

async function collectFiles(dir, entries = [], relBase = '') {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const abs = path.join(dir, entry.name);
    const rel = relBase === '' ? entry.name : `${relBase}/${entry.name}`;
    if (entry.isDirectory()) {
      await collectFiles(abs, entries, rel);
    } else if (entry.isFile()) {
      entries.push({ abs, rel: rel.split('\\').join('/') });
    } else {
      console.error(`✗ refusing to package non-regular file: ${rel}`);
      process.exit(1);
    }
  }
  return entries;
}

const files = await collectFiles(distDir);
if (files.length === 0) {
  console.error('✗ dist/ is empty — run "pnpm build" first');
  process.exit(1);
}

// Build central directory + local headers.
const localParts = [];
const centralParts = [];
let offset = 0;

for (const file of files) {
  const data = await readFile(file.abs);
  const compressed = zlib.deflateRawSync(data, { level: 9 });
  const crc = zlib.crc32(data);
  const nameBuf = Buffer.from(file.rel, 'utf8');

  // Local file header
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4); // version needed
  localHeader.writeUInt16LE(0, 6); // flags
  localHeader.writeUInt16LE(8, 8); // method DEFLATE
  localHeader.writeUInt16LE(DOS_TIME, 10);
  localHeader.writeUInt16LE(DOS_DATE, 12);
  localHeader.writeUInt32LE(crc >>> 0, 14);
  localHeader.writeUInt32LE(compressed.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(nameBuf.length, 26);
  localHeader.writeUInt16LE(0, 28); // extra length

  const localEntry = Buffer.concat([localHeader, nameBuf, compressed]);
  localParts.push(localEntry);

  // Central directory header
  const cdHeader = Buffer.alloc(46);
  cdHeader.writeUInt32LE(0x02014b50, 0);
  cdHeader.writeUInt16LE(20, 4); // version made by (DOS 2.0)
  cdHeader.writeUInt16LE(20, 6); // version needed
  cdHeader.writeUInt16LE(0, 8); // flags
  cdHeader.writeUInt16LE(8, 10); // method
  cdHeader.writeUInt16LE(DOS_TIME, 12);
  cdHeader.writeUInt16LE(DOS_DATE, 14);
  cdHeader.writeUInt32LE(crc >>> 0, 16);
  cdHeader.writeUInt32LE(compressed.length, 20);
  cdHeader.writeUInt32LE(data.length, 24);
  cdHeader.writeUInt16LE(nameBuf.length, 28);
  cdHeader.writeUInt16LE(0, 30); // extra length
  cdHeader.writeUInt16LE(0, 32); // comment length
  cdHeader.writeUInt16LE(0, 34); // disk number start
  cdHeader.writeUInt16LE(0, 36); // internal attrs
  cdHeader.writeUInt32LE(0, 38); // external attrs
  cdHeader.writeUInt32LE(offset, 42); // relative offset of local header

  centralParts.push(Buffer.concat([cdHeader, nameBuf]));

  offset += localEntry.length;
}

const centralDir = Buffer.concat(centralParts);
const centralDirOffset = offset;
const centralDirSize = centralDir.length;

// End of central directory
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4); // disk number
eocd.writeUInt16LE(0, 6); // disk with CD
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(centralDirSize, 12);
eocd.writeUInt32LE(centralDirOffset, 16);
eocd.writeUInt16LE(0, 20); // comment length

const zipBuffer = Buffer.concat([...localParts, centralDir, eocd]);

await mkdir(outDir, { recursive: true });
const zipPath = path.join(outDir, zipName);
await writeFile(zipPath, zipBuffer);

const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
const checksumPath = path.join(outDir, `${zipName}.sha256`);
await writeFile(checksumPath, `${hash}  ${zipName}\n`);

// Self-verify.
const reread = await readFile(zipPath);
const recompute = crypto.createHash('sha256').update(reread).digest('hex');
if (recompute !== hash) {
  console.error('✗ written artifact hash mismatch — aborting release packaging');
  process.exit(1);
}

console.log(`✓ packaged artifacts/${zipName} (${zipBuffer.length} bytes), sha256=${hash}`);
