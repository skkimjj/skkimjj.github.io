import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// 공개 브리핑 — 파이프라인이 src/content/briefings/YYYY-MM-DD-briefing.md 로 커밋
const briefings = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/briefings' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
  }),
});

// 네이버 복붙용 — 목록·검색에 노출하지 않는 비공개 성격의 페이지
const naver = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/naver' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

// 투자 공부방 — 주말·공휴일 발행 교육 콘텐츠 (상록수 SEO). 태그로 갈래 구분.
const learn = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/learn' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(), // 예: "ETF 완전정복" — 이전/다음 링크 묶음
    seriesOrder: z.number().optional(), // 시리즈 내 순서(오름차순)
  }),
});

// 공부방 초안 — 발행 전 검수용. 전용 폴더로 격리해 공개 컬렉션에 절대 섞이지 않는다.
// /draft/ 라우트에서만 렌더되며 noindex + sitemap 제외. 발행 시 learn/·naver/로 이동.
const drafts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/drafts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
  }),
});

export const collections = { briefings, naver, learn, drafts };
