/**
 * Module:   tests/toolchain.spec.ts
 * Project:  A Penny For Our Thoughts
 * Created:  September 2026 (BUG-037 follow-up — Node pin)
 * Summary:  Guards the Node version pin against silent drift.
 *
 *           BUG-037 was only possible because CI ran Node 20 while local
 *           development had moved to Node 26 — six majors apart, with nobody
 *           watching. CI stayed green on a runtime that had also been
 *           end-of-life since 2026-04-30. These assertions make `.nvmrc` the
 *           single source of truth and fail loudly if a workflow, or the
 *           `engines` field, wanders away from it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = (rel: string): string => readFileSync(resolve(root, rel), 'utf8');

const nvmrc = read('.nvmrc').trim();
const pkg = JSON.parse(read('package.json')) as { engines?: { node?: string } };
const ciYml = read('.github/workflows/ci.yml');
const deployYml = read('.github/workflows/deploy.yml');

describe('Node toolchain pin (BUG-037 follow-up)', () => {
  it('.nvmrc pins a bare major version', () => {
    expect(nvmrc).toMatch(/^\d+$/);
  });

  it('package.json engines.node agrees with .nvmrc', () => {
    const declared = pkg.engines?.node;
    expect(declared).toBeDefined();
    const enginesMajor = declared?.match(/(\d+)/)?.[1];
    expect(enginesMajor).toBe(nvmrc);
  });

  it('CI reads its Node version from .nvmrc rather than hard-coding one', () => {
    expect(ciYml).toContain("node-version-file: '.nvmrc'");
  });

  it('the deploy workflow reads its Node version from .nvmrc', () => {
    // Node 20 was hard-coded here and went EOL on 2026-04-30 while still
    // building the shipped bundle. The pin must drive the deploy toolchain.
    expect(deployYml).toContain("node-version-file: '.nvmrc'");
    expect(deployYml).not.toMatch(/node-version:\s*'\d+'/);
  });

  it('CI still exercises a Node newer than the pin (the BUG-037 blind spot)', () => {
    // The shadowing global that caused BUG-037 is absent on v20/v22/v24 and
    // present on v26 — so a CI pinned to an LTS alone would never reproduce it.
    // The forward-compat job must therefore run something newer than the pin.
    const forwardVersions = [...ciYml.matchAll(/node-version:\s*'(\d+)'/g)].map((m) => Number(m[1]));
    expect(forwardVersions.length).toBeGreaterThan(0);
    expect(Math.max(...forwardVersions)).toBeGreaterThan(Number(nvmrc));
  });
});
