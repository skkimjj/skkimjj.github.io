// /sitemap.xml 별칭.
//
// @astrojs/sitemap은 색인 파일을 `sitemap-index.xml`로 만드는데, 검색엔진 콘솔에는
// 관례적으로 `sitemap.xml`을 제출하는 경우가 많다(둘 중 무엇을 넣었는지 나중에 헷갈리기도 한다).
// 그래서 같은 색인을 이 경로에도 둬서 어느 쪽을 제출해도 200이 되게 한다.
// `context.site`(astro.config의 site)를 쓰므로 커스텀 도메인으로 바꿔도 자동으로 따라간다.
//
// ⚠️ URL이 45,000개를 넘으면 sitemap-1.xml이 추가로 생기므로 그때 여기도 함께 늘려야 한다
// (기본 entryLimit=45000, 현재 14개라 한동안 무관).
export async function GET(context) {
  const base = String(context.site).replace(/\/$/, '');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>${base}/sitemap-0.xml</loc></sitemap>
</sitemapindex>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
