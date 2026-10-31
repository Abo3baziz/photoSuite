#!/usr/bin/env node
/** Clean build output (dist/ and artifacts/). Cross-platform, no deps. */
import { rmSync } from 'node:fs';

for (const dir of ['dist', 'artifacts']) {
  rmSync(dir, { recursive: true, force: true });
}
console.log('cleaned dist/ and artifacts/');
