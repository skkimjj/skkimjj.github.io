// @ts-check
import { defineConfig } from 'astro/config';

// 배포 주소는 환경변수로 주입 (GitHub Actions에서 설정)
// 예: ASTRO_SITE=https://<계정>.github.io  ASTRO_BASE=/<레포이름>
export default defineConfig({
  site: process.env.ASTRO_SITE ?? 'http://localhost:4321',
  base: process.env.ASTRO_BASE ?? '/',
});
