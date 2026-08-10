/**
 * remark-rescue-bold — 한국어 조사 때문에 깨진 `**굵게**`를 살려낸다.
 *
 * ## 왜 필요한가
 *
 * 마크다운 규격(CommonMark)은 닫는 구분자를 판정할 때 좌우 문자를 본다.
 * 닫는 `**` 바로 **앞이 구두점**이고 바로 **뒤가 글자**면, 그 `**`는 여닫이
 * 양쪽 다 될 수 있는 애매한 위치로 취급돼 닫는 구분자로 인정받지 못한다.
 * 그러면 강조가 성립하지 않고 `**`가 본문에 그대로 노출된다.
 *
 *     **보수**의        → 정상 (닫기 앞이 글자)
 *     **+35.1%**로      → 깨짐 (닫기 앞이 `%`, 뒤가 `로`)
 *     **69.55(−7.99%)**로 → 깨짐 (닫기 앞이 `)`)
 *
 * 이 블로그 본문은 "수치+단위를 굵게 하고 조사를 붙이는" 문장이 기본형이라
 * (`**+35.1%**로 압축`) 이 조합을 피하기가 사실상 불가능하다. 2026-08-11
 * 브리핑 네이버본에서 한 번에 7곳이 노출됐다. 규격은 영어 문장을 기준으로
 * 만들어졌으니, 한국어를 쓰는 쪽에서 렌더 단계에 한 번 손을 대는 게 맞다.
 *
 * ## 무엇을 하는가
 *
 * 파싱이 끝난 뒤 텍스트 조각을 훑어, **위 조건으로 깨진 경우에만** `**…**`를
 * strong 노드로 되살린다. 그 외의 `**`(짝이 없는 것, 코드 안, 원래 정상 렌더된
 * 것)는 손대지 않는다. 파싱 전 문자열을 치환하는 방식이 아니므로 코드 블록·
 * 인라인 코드는 애초에 대상에서 빠진다(그쪽은 텍스트 노드가 아니다).
 *
 * 한 텍스트 조각 안에서 여닫이가 모두 보일 때만 복구한다. 굵게 범위 안에
 * 링크나 다른 강조가 끼어 있으면 조각이 쪼개지므로 그냥 둔다 — 잘못 잘라내
 * 링크를 잃는 것보다 `**`가 보이는 게 덜 나쁘다(그런 사례는 아직 없다).
 */

// `**` + (공백으로 시작하지 않고 `**`를 포함하지 않는 내용) + `**`
const BOLD_RUN = /\*\*(?=\S)((?:(?!\*\*)[\s\S])+?)\*\*/g;

/** 구두점·기호·공백이면 true (CommonMark가 닫기 판정에서 걸고 넘어지는 부류) */
function isPunctOrSpace(ch) {
  return /[\s\p{P}\p{S}]/u.test(ch);
}

/** 글자·숫자면 true (조사·단위가 바로 붙은 상태) */
function isWordChar(ch) {
  return /[\p{L}\p{N}]/u.test(ch);
}

/**
 * 텍스트 하나를 노드 배열로 쪼갠다. 복구할 게 없으면 null을 반환해
 * 호출자가 원본 노드를 그대로 쓰게 한다.
 */
function rescue(value) {
  const out = [];
  let cursor = 0;
  BOLD_RUN.lastIndex = 0;
  let m;
  while ((m = BOLD_RUN.exec(value)) !== null) {
    const inner = m[1];
    const after = value[m.index + m[0].length];
    // 깨지는 조건이 아니면 건드리지 않는다 — 그건 파서가 이미 처리했거나
    // 처리할 수 있는 표기다.
    if (!after || !isPunctOrSpace(inner.at(-1)) || !isWordChar(after)) continue;
    if (m.index > cursor) out.push({ type: 'text', value: value.slice(cursor, m.index) });
    out.push({ type: 'strong', children: [{ type: 'text', value: inner }] });
    cursor = m.index + m[0].length;
  }
  if (!out.length) return null;
  if (cursor < value.length) out.push({ type: 'text', value: value.slice(cursor) });
  return out;
}

export default function remarkRescueBold() {
  return (tree) => {
    walk(tree);
  };
}

function walk(node) {
  if (!Array.isArray(node.children)) return;
  // 생 HTML(html 노드)은 값 그대로 나가는 영역이라 마크다운 강조가 애초에
  // 적용되지 않는다 — 여기서도 손대지 않는다.
  let changed = false;
  const next = [];
  for (const child of node.children) {
    if (child.type === 'text') {
      const parts = rescue(child.value);
      if (parts) {
        next.push(...parts);
        changed = true;
        continue;
      }
      next.push(child);
      continue;
    }
    walk(child);
    next.push(child);
  }
  if (changed) node.children = next;
}
