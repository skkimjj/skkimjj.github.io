// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 배포 주소는 환경변수로 주입 (GitHub Actions에서 설정)
// 예: ASTRO_SITE=https://skkimjj.github.io  ASTRO_BASE=/
export default defineConfig({
  site: process.env.ASTRO_SITE ?? 'http://localhost:4321',
  base: process.env.ASTRO_BASE ?? '/',
  integrations: [
    sitemap({
      // 네이버 복붙용 비밀 페이지·발행 전 초안은 사이트맵에서 제외 (검색 노출 방지)
      filter: (page) => !page.includes('/naver/') && !page.includes('/draft/'),
    }),
  ],
});
