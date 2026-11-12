/**
 * remark-rescue-autolink — 괄호 속 생 URL 뒤에 조사가 붙어 깨진 자동링크를 살려낸다.
 *
 * GFM 자동링크(autolink literal)는 공백이 나올 때까지를 주소로 본다. 주소가 `)`로
 * **끝나면** 괄호 짝을 세어 남는 `)`를 떼지만, `)` 뒤에 글자가 바로 붙으면 그 규칙이
 * 발동하지 않는다. 한국어는 `공시시스템(http://kind.krx.co.kr)에 공시한`처럼 괄호
 * 바로 뒤에 조사를 붙이는 게 자연스러워서 이 함정에 정확히 걸린다.
 *
 *     (http://kind.krx.co.kr)에   → href="http://kind.krx.co.kr)%EC%97%90"  (KRX 404)
 *
 * 2026-11-12 라이브에서 확인(공부방 2편 3곳, 전체 5편 12곳). 볼드 함정과 같은
 * 처방이다 — 원문은 두고 렌더 단계에서 한 번 손본다. 새 글은 린터 L10이 막는다.
 *
 * ## 무엇을 하는가
 * 파싱된 link 노드 중 url이 `)` + 한글로 끝나고 그 `)`가 짝이 없는 것(여는 괄호보다
 * 닫는 괄호가 많은 것)만 고른다. url과 링크 텍스트에서 그 꼬리를 떼어 링크 뒤에
 * 평문으로 되돌려 놓는다. `[텍스트](URL)조사`는 url에 꼬리가 없으므로 대상이 아니다.
 * 주소 자체에 균형 잡힌 괄호가 든 URL(위키백과 `RSI_(지표)`)은 그대로 둔다.
 */

const TAIL = /\)[가-힣]+$/;

function unbalancedClose(url) {
  let depth = 0;
  for (const ch of url) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
  }
  return depth < 0;
}

function split(url) {
  const m = TAIL.exec(url);
  if (!m) return null;
  const head = url.slice(0, m.index);
  if (!unbalancedClose(url) || !head) return null;
  return { head, tail: m[0] };
}

export default function remarkRescueAutolink() {
  return (tree) => walk(tree);
}

function walk(node) {
  if (!Array.isArray(node.children)) return;
  const next = [];
  let changed = false;
  for (const child of node.children) {
    if (child.type === 'link') {
      const parts = split(child.url);
      if (parts) {
        child.url = parts.head;
        // 자동링크의 텍스트는 주소와 같다 — 텍스트 쪽 꼬리도 함께 뗀다.
        for (const c of child.children ?? []) {
          if (c.type === 'text' && c.value.endsWith(parts.tail)) {
            c.value = c.value.slice(0, -parts.tail.length);
          }
        }
        next.push(child, { type: 'text', value: parts.tail });
        changed = true;
        continue;
      }
    }
    walk(child);
    next.push(child);
  }
  if (changed) node.children = next;
}
