// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';
import remarkRescueBold from './src/remark/rescue-bold.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ── 사이트맵 lastmod ────────────────────────────────────────────────────────
// 구글이 사이트맵에서 실제로 참고한다고 밝힌 필드가 lastmod다. 단, **일관되게
// 정확할 때만** 쓴다고 명시했으므로 "진짜 갱신일을 아는 URL에만" 넣는다.
// - 개별 글: 프론트매터 updated(없으면 date)
// - 목록 페이지(홈·/learn/): 그 목록에 담긴 최신 글의 날짜 = 목록이 바뀐 날
// - /about/·/privacy/: 넣지 않는다. 파일 mtime은 CI 체크아웃마다 새로 찍혀
//   "매 배포마다 갱신됨"이라는 거짓 신호가 되고, 그러면 구글이 사이트맵의
//   lastmod 전체를 신뢰하지 않는다. 없는 게 틀린 것보다 낫다.
function frontmatterDate(path) {
  const parts = readFileSync(path, 'utf8').split(/^---\s*$/m);
  if (parts.length < 3) return null;
  const fm = parts[1];
  const raw = (fm.match(/^updated:\s*(\S+)/m) ?? fm.match(/^date:\s*(\S+)/m))?.[1];
  if (!raw) return null;
  const d = new Date(raw.replace(/^['"]|['"]$/g, ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

const lastmodByPath = new Map();
function collectDates(relDir, routePrefix) {
  const dates = [];
  // ⚠️ 상대 경로('./src/...')를 쓰면 안 된다. 설정 파일을 평가하는 시점의
  // 작업 디렉터리는 실행 환경마다 다를 수 있어(로컬은 site/, CI는 레포 루트)
  // 조용히 빈 맵이 되고 lastmod가 통째로 빠진다 — 2026-08-01 실제 발생.
  // 항상 이 설정 파일 위치를 기준으로 절대 경로를 만든다.
  const dir = fileURLToPath(new URL(relDir, import.meta.url));
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
  } catch (err) {
    console.warn(`[sitemap lastmod] ${dir} 읽기 실패 — lastmod 생략: ${err.message}`);
    return dates;
  }
  for (const f of files) {
    const d = frontmatterDate(`${dir}/${f}`);
    if (!d) continue;
    lastmodByPath.set(`${routePrefix}${f.replace(/\.md$/, '')}/`, d);
    dates.push(d);
  }
  return dates;
}
const briefingDates = collectDates('./src/content/briefings/', '/briefing/');
const learnDates = collectDates('./src/content/learn/', '/learn/');
const newest = (dates) =>
  dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
for (const [route, dates] of [
  ['/', briefingDates],
  ['/briefing/', briefingDates],
  ['/learn/', learnDates],
]) {
  const d = newest(dates);
  if (d) lastmodByPath.set(route, d);
}
// 빌드 로그에 한 줄 남긴다. 0이면 위 경로 해석이 깨진 것이므로 바로 보인다.
console.log(`[sitemap lastmod] ${lastmodByPath.size}개 URL에 갱신일 부여`);

// 배포 주소는 환경변수로 주입 (GitHub Actions에서 설정)
// 예: ASTRO_SITE=https://skkimjj.github.io  ASTRO_BASE=/
export default defineConfig({
  site: process.env.ASTRO_SITE ?? 'http://localhost:4321',
  base: process.env.ASTRO_BASE ?? '/',
  markdown: {
    // Astro 7 기본 마크다운 처리기(Sätteri)는 물결표 하나(~)를 취소선으로
    // 해석하고, 이를 끄는 옵션을 제공하지 않는다. 브리핑 본문은 범위·근사값
    // 표기에 ~를 자주 써서(1~20일, ~$40.2B, 5/3~) 두 개가 짝지어지면 그 사이
    // 전체에 엉뚱한 취소선이 그어졌다. → remark 처리기로 전환하고 기본 gfm을
    // 끈 뒤 remark-gfm을 singleTilde:false로 붙여, 취소선은 ~~두 개~~일 때만
    // 적용되게 한다. (표·자동링크 등 나머지 GFM은 그대로 유지)
    //
    // remark-rescue-bold: 한국어 조사 때문에 깨지는 `**+35.1%**로` 같은 표기를
    // 되살린다(자세한 이유는 src/remark/rescue-bold.mjs 주석). 순서가 중요하다 —
    // GFM(표) 다음에 둬야 표 셀 안의 본문까지 함께 복구된다.
    processor: unified({
      gfm: false,
      remarkPlugins: [[remarkGfm, { singleTilde: false }], remarkRescueBold],
    }),
  },
  // `/briefing/`은 2026-08-14부터 실제 아카이브 페이지다(그전에는 홈으로 보내는
  // 리다이렉트였다 — 본문에서 목록을 가리킬 때 `/briefing/`을 쓰는 실수가 반복돼
  // 404를 막으려던 임시방편). 이제 진짜 목록이 있으므로 리다이렉트를 걷어냈고,
  // 그런 링크들은 의도한 곳에 정확히 닿는다.
  integrations: [
    sitemap({
      // 네이버 복붙용 비밀 페이지·발행 전 초안은 사이트맵에서 제외 (검색 노출 방지).
      filter: (page) => !page.includes('/naver/') && !page.includes('/draft/'),
      // 갱신일을 아는 URL에만 lastmod를 붙인다(위 lastmodByPath 주석 참조).
      serialize(item) {
        const d = lastmodByPath.get(new URL(item.url).pathname);
        if (d) item.lastmod = d.toISOString();
        return item;
      },
    }),
  ],
});
