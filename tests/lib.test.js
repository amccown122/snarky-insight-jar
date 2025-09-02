import { describe, it, expect, vi } from 'vitest';
import { escapeHtml, linkify, timeAgo, mulberry32, hashString, buildSpatialIndex, spatialNearby } from '../src/lib.js';

describe('escapeHtml', () => {
  it('escapes special characters', () => {
    expect(escapeHtml('<div id="x" class="y"> & " \'"')).toBe('&lt;div id=&quot;x&quot; class=&quot;y&quot;&gt; &amp; &quot; &#39;');
  });
});

describe('linkify', () => {
  it('wraps URLs with anchor tags', () => {
    const s = 'Visit https://example.com and http://a.b';
    const res = linkify(s);
    expect(res).toContain('<a href="https://example.com"');
    expect(res).toContain('<a href="http://a.b"');
  });
});

describe('timeAgo', () => {
  it('produces human-readable offsets', () => {
    const base = new Date('2023-01-01T00:00:00Z').getTime();
    vi.useFakeTimers();
    vi.setSystemTime(base + 90 * 1000); // 90 seconds later
    expect(timeAgo(new Date(base))).toMatch(/1m ago|2m ago/);
    vi.setSystemTime(base + 3600 * 1000); // 1 hour later
    expect(timeAgo(new Date(base))).toMatch(/1h ago/);
    vi.useRealTimers();
  });
});

describe('mulberry32/hashString', () => {
  it('is deterministic for same seed', () => {
    const seed = hashString('abc');
    const rng1 = mulberry32(seed);
    const rng2 = mulberry32(seed);
    const a = Array.from({ length: 5 }, () => rng1());
    const b = Array.from({ length: 5 }, () => rng2());
    expect(a).toEqual(b);
  });
});

describe('spatial index', () => {
  it('returns nearby points and excludes distant ones', () => {
    const points = [ {x:0.10,y:0.10}, {x:0.12,y:0.12}, {x:0.80,y:0.80} ];
    const minSepPx = 50; // arbitrary cell size baseline
    const idx = buildSpatialIndex(points, minSepPx, 1000, 1000);
    const near = spatialNearby(idx, 0.11, 0.11);
    expect(near.some(p => p.x === 0.10 && p.y === 0.10)).toBe(true);
    expect(near.some(p => p.x === 0.12 && p.y === 0.12)).toBe(true);
    expect(near.some(p => p.x === 0.80 && p.y === 0.80)).toBe(false);
  });
});

