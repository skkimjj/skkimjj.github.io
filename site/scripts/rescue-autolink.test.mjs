// `remark-rescue-autolink` 단위 테스트 — 실행: cd site && npm test
//
// 2026-11-12 라이브 확인: 공부방 dividend-calendar 본문 `공시시스템(http://kind.krx.co.kr)에 공시한`이
// `<a href="http://kind.krx.co.kr)%EC%97%90">`로 렌더돼 KRX에서 404였다. GFM 자동링크는 공백까지를
// 주소로 보므로 `)` 뒤에 조사가 바로 붙으면 `)`와 조사까지 링크에 들어간다. 발행본 5편 12곳.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';

import remarkRescueBold from '../src/remark/rescue-bold.mjs';
import remarkRescueAutolink from '../src/remark/rescue-autolink.mjs';

const proc = await unified({
  gfm: false,
  remarkPlugins: [[remarkGfm, { singleTilde: false }], remarkRescueBold, remarkRescueAutolink],
}).createRenderer({});
const render = async (md) => (await proc.render(md)).code;

test('괄호 속 생 URL 뒤의 조사를 링크 밖으로 밀어낸다', async () => {
  const html = await render('공시시스템(http://kind.krx.co.kr)에 공시한');
  assert.match(html, /<a href="http:\/\/kind\.krx\.co\.kr">http:\/\/kind\.krx\.co\.kr<\/a>\)에 공시한/);
});

test('쿼리스트링이 있는 URL도 같다', async () => {
  const html = await render('(https://www.fss.or.kr/fss/list.do?menuNo=201133)에서 확인');
  assert.match(html, /href="https:\/\/www\.fss\.or\.kr\/fss\/list\.do\?menuNo=201133"/);
  assert.match(html, /<\/a>\)에서 확인/);
});

test('괄호 뒤가 띄어져 있으면 원래 정상이라 손대지 않는다', async () => {
  const html = await render('공시시스템(http://kind.krx.co.kr) 에서');
  assert.match(html, /<a href="http:\/\/kind\.krx\.co\.kr">http:\/\/kind\.krx\.co\.kr<\/a>\) 에서/);
});

test('명시 링크 [텍스트](URL)조사 는 건드리지 않는다', async () => {
  const html = await render('[KIND](http://kind.krx.co.kr)에 공시한');
  assert.match(html, /<a href="http:\/\/kind\.krx\.co\.kr">KIND<\/a>에 공시한/);
});

test('위키백과처럼 주소 자체에 괄호가 균형 있게 든 URL은 유지한다', async () => {
  const html = await render('참고 https://ko.wikipedia.org/wiki/RSI_(지표) 항목');
  assert.match(html, /href="https:\/\/ko\.wikipedia\.org\/wiki\/RSI_\(%EC%A7%80%ED%91%9C\)"/);
});
