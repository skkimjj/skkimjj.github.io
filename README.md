# skkimjj.github.io

개장 전 한국 증시 브리핑 블로그 (Astro → GitHub Pages).

이 레포는 **사이트만** 보유한다. 브리핑을 생성하는 파이프라인(리서치·검증·발행)은
비공개 레포에서 동작하며, 매일 아침 이곳에 콘텐츠를 푸시한다. 푸시되면
`.github/workflows/deploy-site.yml`이 Pages를 자동 배포한다.

```
site/     Astro 소스 + 발행된 브리핑 콘텐츠
```

## 로컬 미리보기

```bash
cd site && npm ci && npm run dev
```
