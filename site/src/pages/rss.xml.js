import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const briefings = await getCollection('briefings');
  const learn = await getCollection('learn');
  const items = [
    ...briefings.map((p) => ({ data: p.data, link: `/briefing/${p.id}/` })),
    ...learn.map((p) => ({ data: p.data, link: `/learn/${p.id}/` })),
  ].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return rss({
    title: '개장 전 브리핑',
    description:
      '매일 아침 한국 증시 개장 전, 밤사이 미국 시장과 주요 지표를 팩트 중심으로 정리한 브리핑. 주말·공휴일에는 투자 공부방 교육 콘텐츠를 발행합니다.',
    site: context.site,
    items: items.slice(0, 30).map((post) => ({
      title: post.data.title,
      description: post.data.description ?? '',
      pubDate: post.data.date,
      link: post.link,
    })),
    customData: '<language>ko-kr</language>',
  });
}
