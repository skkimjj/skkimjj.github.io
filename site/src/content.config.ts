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

export const collections = { briefings, naver };
