// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';

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
    processor: unified({
      gfm: false,
      remarkPlugins: [[remarkGfm, { singleTilde: false }]],
    }),
  },
  // 브리핑 목록은 홈(/)이고 `/briefing/` 인덱스 라우트는 없다. 그런데 개별 브리핑이
  // `/briefing/<날짜>-briefing/`이라 본문에서 목록을 가리킬 때 `/briefing/`을 쓰는 실수가
  // 반복됐다(2026-07-26 발행분 2편에서 죽은 링크 발견). 404 대신 홈으로 보낸다.
  redirects: {
    '/briefing': '/',
  },
  integrations: [
    sitemap({
      // 네이버 복붙용 비밀 페이지·발행 전 초안은 사이트맵에서 제외 (검색 노출 방지).
      // `/briefing/` 리다이렉트 페이지도 제외 — 실제 콘텐츠가 아니다.
      filter: (page) =>
        !page.includes('/naver/') &&
        !page.includes('/draft/') &&
        !page.endsWith('/briefing/'),
    }),
  ],
});
