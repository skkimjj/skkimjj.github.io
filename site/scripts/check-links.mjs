// 빌드 산출물(dist)의 내부 링크가 실제로 존재하는지 검사한다.
//
// 왜 필요한가: 본문 마크다운의 링크는 빌드가 검증하지 않는다. 2026-07-26에 발행된 글 2편에서
// `/briefing/`(존재하지 않는 인덱스 라우트) 링크가 404인 채로 며칠 살아 있었고, 사람 눈으로
// 발견됐다. 발행 전에 기계가 잡아야 하는 종류의 문제다.
//
// 사용법: npm run check:links   (npm run build 이후)
// 종료 코드 1 = 끊어진 링크 있음 → 발행 중단.
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = 'dist';

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error(`❌ ${DIST}/ 가 없습니다. 먼저 npm run build 를 실행하세요.`);
  process.exit(1);
}

const pages = await htmlFiles(DIST);
const missing = new Map();
let checked = 0;

for (const page of pages) {
  const html = readFileSync(page, 'utf-8');
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    // 사이트 내부 절대경로만 검사(외부 URL·앵커·mailto는 대상 아님)
    if (!href.startsWith('/')) continue;
    const path = href.split('#')[0].split('?')[0];
    checked++;
    const candidates = path.endsWith('/')
      ? [join(DIST, path, 'index.html')]
      : [join(DIST, path), join(DIST, path, 'index.html')];
    if (!candidates.some((c) => existsSync(c))) {
      if (!missing.has(path)) missing.set(path, new Set());
      missing.get(path).add(relative(DIST, page));
    }
  }
}

console.log(`내부 링크 ${checked}개 / 페이지 ${pages.length}개 검사`);

if (missing.size > 0) {
  console.error('\n❌ 끊어진 내부 링크:');
  for (const [path, sources] of [...missing].sort()) {
    console.error(`  ${path}`);
    for (const s of [...sources].sort().slice(0, 8)) console.error(`      ← ${s}`);
  }
  console.error('\n발행을 중단하고 링크를 고치세요.');
  process.exit(1);
}

console.log('✅ 끊어진 내부 링크 없음');
