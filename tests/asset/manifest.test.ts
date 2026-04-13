import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import baseline from '~/entities/asset/data/baseline-manifest.json';
import sketchBatch from '../../scripts/stitch/sketch-batch.json';
import assetMap from '../../scripts/stitch/asset-map.json';
import {
  BASELINE_MANIFEST,
  mergeManifest,
} from '~/entities/asset/model/manifest';
import { isSemanticKey } from '~/entities/asset';

// 드리프트 가드: sketch-batch.json 키 집합과 baseline manifest 키 집합이 정확히 일치해야 한다.
describe('baseline manifest drift guard', () => {
  it('baseline 키 집합이 sketch-batch.json과 일치한다', () => {
    const batchKeys = new Set((sketchBatch as { keys: string[] }).keys);
    const manifestKeys = new Set(Object.keys(baseline));
    expect(manifestKeys).toEqual(batchKeys);
  });

  it('baseline의 모든 키가 유효한 SemanticKey다', () => {
    for (const key of Object.keys(baseline)) {
      expect(isSemanticKey(key)).toBe(true);
    }
  });

  it('asset-map.json의 localPath가 baseline URL 경로와 일치한다', () => {
    const map = assetMap as Record<string, { localPath?: string }>;
    for (const [key, url] of Object.entries(
      baseline as Record<string, string>
    )) {
      const entry = map[key];
      expect(entry, `asset-map has entry for ${key}`).toBeDefined();
      expect(entry.localPath, `${key} has localPath`).toBeDefined();
      expect(entry.localPath).toBe(`public${url}`);
    }
  });

  it('baseline이 가리키는 WebP 파일이 디스크에 존재한다', () => {
    const repoRoot = join(__dirname, '../..');
    for (const url of Object.values(baseline as Record<string, string>)) {
      const abs = join(repoRoot, 'public', url.replace(/^\//, ''));
      expect(existsSync(abs), `${url} exists`).toBe(true);
    }
  });
});

describe('mergeManifest', () => {
  it('override가 없으면 baseline을 그대로 반환한다', () => {
    expect(mergeManifest(BASELINE_MANIFEST, null)).toBe(BASELINE_MANIFEST);
    expect(mergeManifest(BASELINE_MANIFEST, undefined)).toBe(BASELINE_MANIFEST);
  });

  it('유효한 키에 대한 override만 baseline 위에 덮어쓴다', () => {
    const merged = mergeManifest(BASELINE_MANIFEST, {
      'hub/seoul/clear-day': 'https://cdn.example.com/seoul-clear-day.webp',
    });
    expect(merged['hub/seoul/clear-day']).toBe(
      'https://cdn.example.com/seoul-clear-day.webp'
    );
    expect(merged['hub/busan/clear-day']).toBe(
      BASELINE_MANIFEST['hub/busan/clear-day']
    );
  });

  it('유효하지 않은 키는 무시한다', () => {
    const merged = mergeManifest(BASELINE_MANIFEST, {
      'bogus/key/name': 'https://cdn.example.com/x.webp',
    } as Record<string, string>);
    expect(Object.keys(merged).length).toBe(
      Object.keys(BASELINE_MANIFEST).length
    );
  });

  it('빈 문자열이나 비문자열 값은 무시한다', () => {
    const merged = mergeManifest(BASELINE_MANIFEST, {
      'hub/seoul/clear-day': '',
    });
    expect(merged['hub/seoul/clear-day']).toBe(
      BASELINE_MANIFEST['hub/seoul/clear-day']
    );
  });
});
