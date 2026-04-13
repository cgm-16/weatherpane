#!/usr/bin/env tsx
// Stitch 원본 PNG → WebP 후처리 파이프라인.
// 1024x1024 원본을 하단 크롭으로 3:2 (1024x683)로 맞춘 뒤 2400x1600 마스터 크기로 업스케일,
// 품질 스윕으로 400KB 이하 WebP를 만들어 public/sketches/<key>.webp 에 저장한다.
// 성공 시 asset-map.json 에 localPath 와 sha256 을 기록한다.

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const ASSET_MAP_PATH = join(REPO_ROOT, 'scripts/stitch/asset-map.json');

// 마스터 크기: WP-020 에셋 매니페스트 계약이 요구하는 3:2 landscape 기준.
const MASTER_WIDTH = 2400;
const MASTER_HEIGHT = 1600;
const MAX_BYTES = 400 * 1024;
// 품질 스윕은 고→저 순으로 MAX_BYTES 이하가 될 때까지 내려간다.
const QUALITY_SWEEP = [85, 80, 75, 70, 65, 60, 55, 50];

type AssetMapEntry = {
  screenId: string;
  downloadUrl: string;
  sourceSize: string;
  generatedAt: string;
  localPath?: string;
  sha256?: string;
};
type AssetMap = Record<string, AssetMapEntry>;

type Args = { key: string; input: string };

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--key' && value) {
      args.key = value;
      i += 1;
    } else if (flag === '--input' && value) {
      args.input = value;
      i += 1;
    }
  }
  if (!args.key || !args.input) {
    throw new Error(
      'Usage: process-sketch.ts --key <semantic-key> --input <png-path>'
    );
  }
  return args as Args;
}

// 정사각 소스를 하단 크롭으로 3:2 비율에 맞춘다.
// 날씨 앱에서 하늘 정보가 가장 중요하므로 바닥 쪽을 잘라낸다.
function computeBottomCrop(
  width: number,
  height: number
): { left: number; top: number; width: number; height: number } {
  const targetHeight = Math.round((width * 2) / 3);
  if (targetHeight >= height) {
    // 이미 3:2 이상 가로형이면 크롭 없이 그대로 둔다.
    return { left: 0, top: 0, width, height };
  }
  return { left: 0, top: 0, width, height: targetHeight };
}

async function encodeWebpUnderBudget(
  pipeline: sharp.Sharp
): Promise<{ buffer: Buffer; quality: number }> {
  for (const quality of QUALITY_SWEEP) {
    const buffer = await pipeline
      .clone()
      .webp({ quality, effort: 6 })
      .toBuffer();
    if (buffer.length <= MAX_BYTES) {
      return { buffer, quality };
    }
  }
  // 최저 품질로도 예산을 초과하면 400KB 계약을 위반하므로 에러를 던진다.
  throw new Error(
    `image cannot be encoded under ${MAX_BYTES} bytes at any quality in QUALITY_SWEEP`
  );
}

async function loadAssetMap(): Promise<AssetMap> {
  const raw = await readFile(ASSET_MAP_PATH, 'utf8');
  return JSON.parse(raw) as AssetMap;
}

async function saveAssetMap(map: AssetMap): Promise<void> {
  await writeFile(ASSET_MAP_PATH, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const { key, input } = parseArgs(process.argv.slice(2));
  const absInput = resolve(input);
  if (!existsSync(absInput)) {
    throw new Error(`input file not found: ${absInput}`);
  }

  const map = await loadAssetMap();
  if (!map[key]) {
    throw new Error(`asset-map.json has no entry for key: ${key}`);
  }

  const meta = await sharp(absInput).metadata();
  if (!meta.width || !meta.height) {
    throw new Error('could not read source image dimensions');
  }
  const crop = computeBottomCrop(meta.width, meta.height);

  const pipeline = sharp(absInput)
    .extract(crop)
    .resize(MASTER_WIDTH, MASTER_HEIGHT, { fit: 'fill' });

  const { buffer, quality } = await encodeWebpUnderBudget(pipeline);

  const outRelPath = `public/sketches/${key}.webp`;
  const outAbsPath = join(REPO_ROOT, outRelPath);
  await mkdir(dirname(outAbsPath), { recursive: true });
  await writeFile(outAbsPath, buffer);

  const sha256 = createHash('sha256').update(buffer).digest('hex');
  map[key] = { ...map[key], localPath: outRelPath, sha256 };
  await saveAssetMap(map);

  const sizeKb = (buffer.length / 1024).toFixed(1);
  console.log(
    `${key}: ${MASTER_WIDTH}x${MASTER_HEIGHT} webp q${quality} ${sizeKb}KB → ${outRelPath}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
