---
name: briefing
description: >
  개장 전 브리핑 파이프라인 실행. 리서치(웹서치) → 검증 → 변환 → 이미지 →
  게시 → 이메일을 순서대로 수행한다. "브리핑", "아침 브리핑", "오늘 브리핑 만들어줘",
  "/briefing" 요청 시 사용. 인자로 "dry-run"이 오면 커밋/푸시/이메일을 생략한다.
---

# 개장 전 브리핑 파이프라인

**원칙: 파이프라인은 하나, 출력은 세 개.** 풀 리포트(예측 포함)는 이메일 전용,
공개 브리핑은 GitHub Pages, 네이버용 비밀 페이지는 복붙 원본.
어느 단계든 실패하면 **게시하지 않고** 오류 이메일만 발송한다.
유료 API는 호출하지 않는다 — 리서치와 변환은 이 세션에서 직접 수행한다.

인자에 `dry-run`이 포함되면: 파일 생성과 빌드 확인까지만 하고 커밋·푸시·이메일을 생략한다.

작업 파일은 스크래치패드 디렉토리에 `briefing-work/` 폴더를 만들어 사용한다.
아래에서 `PY` = `pipeline/.venv/bin/python` (레포 루트 기준).

## Step 0. 휴장일 체크

```
PY -m briefing.run check-day
```

- exit 2(휴장일)이면 사용자에게 알리고 종료. 사용자가 명시적으로 날짜를 지정했거나
  강행을 요청한 경우에만 `--date`로 계속한다.

## Step 1. 리서치 — 풀 리포트 작성 (직접 수행)

1. `docs/prompts/한국증시_예측리포트_프롬프트_v3.md`를 읽는다.
2. 그 지침을 그대로 따라 WebSearch/WebFetch로 데이터를 수집한다.
   - 티어1 8종(미 3대 지수+SOX, 미 선물, 원/달러, VKOSPI, KOSPI/KOSDAQ 종가·수급,
     SKHY ADR, 삼성전자·하이닉스 종가, 공매도 제도)은 **수치가 확정될 때까지 재검색**.
   - 날짜 검증 규칙 엄수: 검색 결과의 수치가 직전 거래일 것인지 반드시 확인.
   - 티어2는 1회 검색, 미확보 시 "확인 불가" 명시.
3. v3의 output_format 그대로 풀 리포트를 작성해 `briefing-work/report.md`에 저장.

## Step 2. 변환 — 블로그/네이버 버전 작성 (직접 수행)

1. `docs/prompts/블로그_레이어_프롬프트_v1.md`의 **PART A** 규칙을 읽고 그대로 적용한다.
   - 예측·방향콜·확신도·추천 표현 완전 제거, 팩트만. 미래 추측 화법 금지.
   - 원본에 없는 수치 창작 금지. quality_check 자가 점검 수행.
2. 블로그 버전(frontmatter 포함, 이미지 없이) → `briefing-work/blog.md`
3. 네이버 버전(첫 줄 `제목: ...`, 【】 소제목, 해시태그, 면책 문구) → `briefing-work/naver.md`

## Step 3. payload 작성 + 코드 검증

1. `briefing-work/payload.json` 작성:

```json
{
  "date": "YYYY-MM-DD",
  "indices": [
    {"name": "S&P 500", "close": "6,234.50", "pct": -0.35},
    {"name": "Nasdaq", "close": "...", "pct": 0.0},
    {"name": "Dow", "close": "...", "pct": 0.0},
    {"name": "SOX", "close": "...", "pct": 0.0}
  ],
  "disparity_pct": 2.9,
  "report_file": ".../briefing-work/report.md",
  "blog_file": ".../briefing-work/blog.md",
  "naver_file": ".../briefing-work/naver.md"
}
```

2. `PY -m briefing.run verify --payload .../payload.json`
   - 티어1 누락이나 괴리율 불일치로 실패하면: 원인을 고칠 수 있으면(재검색·재계산·본문 수정)
     고치고 재검증. 고칠 수 없으면 **게시 중단** 후 Step 6의 오류 이메일로 이동.

## Step 4. 빌드 — 이미지 생성 + 파일 게시

```
PY -m briefing.run build --payload .../payload.json
```

- 썸네일 SVG, 괴리율 추이 차트, 블로그/네이버 md, 풀 리포트 아카이브가 배치된다.
- 이어서 사이트 빌드가 깨지지 않는지 확인: `cd site && npm run build`
- 빌드 실패 시 콘텐츠 문제를 고치고 재시도. 못 고치면 게시 중단 + 오류 이메일.

## Step 5. 게시 + 이메일

- **dry-run이면**: 생성 결과 경로와 함께 "커밋/푸시/이메일 생략"을 보고하고,
  `git status`로 어떤 파일이 게시될지 보여준다. (생성된 파일은 되돌리지 않고 둔다)
- **정식 실행이면**:
  1. `git add` 대상: `site/src/content/`, `site/src/assets/briefing/`, `data/disparity-history.json`
  2. 커밋 메시지: `브리핑: YYYY-MM-DD` → push (GitHub Pages가 자동 배포)
  3. `PY -m briefing.run email --payload .../payload.json`
     (SMTP 설정이 없으면 dry-run 폴백하고 사용자에게 안내)

## Step 6. 실패 처리

어느 단계든 복구 불가능하게 실패하면:

```
PY -m briefing.run email-error --stage "<단계>" --message "<원인 요약>"
```

게시(커밋/푸시)는 절대 하지 않는다. 사용자에게 실패 단계와 원인을 요약 보고한다.

## 마지막 보고

성공 시: 30초 요약 3줄, 괴리율 검증 결과, 게시된 URL 2개(공개/네이버), 이메일 발송 여부를
한국어로 간결하게 보고한다.
