// `remark-rescue-bold` 단위 테스트.
//
// 실행: cd site && npm test
//
// 사이트가 실제로 쓰는 마크다운 프로세서(astro.config.mjs와 같은 설정)를 그대로
// 만들어 렌더 결과를 본다 — 정규식 내부 구현이 아니라 최종 HTML이 판정 기준이다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';

import remarkRescueBold from '../src/remark/rescue-bold.mjs';

// ⚠️ `createMarkdownProcessor({ processor })`로 부르면 descriptor의 플러그인이
// 무시된다(옵션이 그쪽 경로로 전달되지 않는다). Astro 빌드가 실제로 타는 경로는
// descriptor의 `createRenderer(shared)`이므로 테스트도 그걸 쓴다.
function makeProcessor({ rescue }) {
  return unified({
    gfm: false,
    remarkPlugins: rescue
      ? [[remarkGfm, { singleTilde: false }], remarkRescueBold]
      : [[remarkGfm, { singleTilde: false }]],
  }).createRenderer({});
}

const [fixed, raw] = await Promise.all([
  makeProcessor({ rescue: true }),
  makeProcessor({ rescue: false }),
]);

const render = async (md) => (await fixed.render(md)).code;
const renderRaw = async (md) => (await raw.render(md)).code;

// --- 이 플러그인이 존재하는 이유 -----------------------------------------
// 2026-08-11 브리핑 네이버본에서 7곳이 `**` 그대로 노출됐다. 전부 아래 형태다:
// 닫는 `**` 앞이 구두점(%·괄호·부호)이고 바로 뒤에 조사가 붙는 경우.
const TRAPS = [
  ['퍼센트+조사', '괴리율은 **+35.1%**로 압축됐습니다.', '<strong>+35.1%</strong>로'],
  ['괄호+조사', 'VKOSPI는 **69.55(−7.99%)**로 내려왔습니다.', '<strong>69.55(−7.99%)</strong>로'],
  ['퍼센트+입니다', '다우 **53,869.37(−0.31%)**입니다.', '<strong>53,869.37(−0.31%)</strong>입니다'],
  ['퍼센트+에서', '전일 **+37.3%**에서 압축', '<strong>+37.3%</strong>에서'],
  ['부호+면', '디스카운트**(−)**면 반대', '<strong>(−)</strong>면'],
  ['금액+콤마', '삼성전자는 **230,000원(−0.43%)**, 하이닉스는 보합', '<strong>230,000원(−0.43%)</strong>'],
];

for (const [name, md, expected] of TRAPS) {
  test(`함정 복구: ${name}`, async () => {
    const html = await render(md);
    assert.doesNotMatch(html, /\*\*/, `\`**\`가 남았다: ${html}`);
    assert.ok(html.includes(expected), `기대한 굵게 범위가 아니다: ${html}`);
  });
}

test('함정 목록은 정말 깨지는 입력이다 (플러그인 없이는 ** 가 남는다)', async () => {
  for (const [name, md] of TRAPS) {
    const html = await renderRaw(md);
    // 콤마 케이스는 원래 정상 렌더되므로 전제에서 제외한다(회귀 방지용 표본).
    if (name === '금액+콤마') {
      assert.doesNotMatch(html, /\*\*/, `${name}: 원래 정상이어야 한다 — ${html}`);
      continue;
    }
    assert.match(html, /\*\*/, `${name}: 함정 입력이 아니다(테스트 전제가 깨짐) — ${html}`);
  }
});

// --- 건드리면 안 되는 것들 -----------------------------------------------
test('정상 볼드는 그대로 (이중 처리하지 않는다)', async () => {
  const html = await render('**보수**의 차이와 **핵심 수치**를 봅니다.');
  assert.ok(html.includes('<strong>보수</strong>의'), html);
  assert.ok(html.includes('<strong>핵심 수치</strong>'), html);
  assert.doesNotMatch(html, /\*\*/);
});

test('인라인 코드 안의 별표는 건드리지 않는다', async () => {
  const html = await render('`**+35.1%**로`는 코드다.');
  assert.match(html, /<code[^>]*>\*\*\+35\.1%\*\*로<\/code>/, html);
});

test('코드 블록 안의 별표는 건드리지 않는다', async () => {
  const html = await render('```\n**0.05%**의\n```\n');
  assert.ok(html.includes('**0.05%**'), html);
});

test('짝이 맞지 않는 홀로 남은 별표는 그대로 둔다', async () => {
  const html = await render('별표 하나 ** 만 있는 줄.');
  assert.ok(html.includes('**'), html);
});

test('닫는 별표 뒤가 공백이면 원래 정상이라 손대지 않는다', async () => {
  const html = await render('지수는 **−0.31%** 였고 끝.');
  assert.ok(html.includes('<strong>−0.31%</strong>'), html);
});

test('표 셀 안에서도 복구된다 (괴리율 트래커 표)', async () => {
  const md = ['| 항목 | 값 |', '| --- | --- |', '| 괴리율 | **+35.1%**로 압축 |'].join('\n');
  const html = await render(md);
  assert.doesNotMatch(html, /\*\*/, html);
  assert.ok(html.includes('<strong>+35.1%</strong>로'), html);
});

test('한 줄에 함정이 여러 개면 모두 복구된다', async () => {
  const html = await render('S&P **7,751.86(−0.07%)**로, 나스닥 **26,615.29(−0.28%)**로 마감.');
  assert.doesNotMatch(html, /\*\*/, html);
  assert.ok(html.includes('<strong>7,751.86(−0.07%)</strong>로'), html);
  assert.ok(html.includes('<strong>26,615.29(−0.28%)</strong>로'), html);
});

test('<mark> 형광펜과 섞여 있어도 복구된다', async () => {
  const html = await render('<mark>삼성전자</mark>는 **230,000원(−0.43%)**로 마감.');
  assert.doesNotMatch(html, /\*\*/, html);
  assert.ok(html.includes('<strong>230,000원(−0.43%)</strong>로'), html);
});

test('굵게 안에 링크가 있으면 통째로 삼키지 않는다', async () => {
  // 함정 복구는 한 텍스트 조각 안에서만 한다. 링크·다른 강조가 끼어 있으면
  // 원래대로 두는 편이 안전하다(잘못 잘라내면 링크가 사라진다).
  const html = await render('**[삼성전자](https://example.com) −0.43%**로 마감.');
  assert.ok(html.includes('href="https://example.com"'), html);
});

test('물결표 취소선 규칙(singleTilde:false)을 깨지 않는다', async () => {
  const html = await render('1~20일 사이, **+1.5%**로 상승. ~~취소선~~은 유지.');
  assert.doesNotMatch(html, /\*\*/, html);
  assert.ok(!html.includes('<del>1'), `물결표 하나가 취소선이 됐다: ${html}`);
  assert.ok(html.includes('<del>취소선</del>'), html);
});
