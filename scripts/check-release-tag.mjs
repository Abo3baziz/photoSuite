#!/usr/bin/env node
/**
 * Release tag validation: the pushed tag must be a semver `v*` tag and must
 * match package.json's version so published artifacts trace to a commit state.
 * Exits 1 with a readable error otherwise.
 */
import { readFileSync } from 'node:fs';

const tag = process.env.GITHUB_REF_NAME ?? '';
const pattern = /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

if (!pattern.test(tag)) {
  console.error(`✗ Release tag "${tag}" does not match vX.Y.Z[-prerelease]|vX.Y.Z+build`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (tag !== `v${manifest.version}`) {
  console.error(`✗ Release tag ${tag} does not match package.json version ${manifest.version}.`);
  console.error('  Update package.json.version (or the tag) so the release is traceable.');
  process.exit(1);
}

console.log(`✓ release tag ${tag} matches package.json v${manifest.version}`);
