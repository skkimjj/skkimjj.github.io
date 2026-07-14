"""Step 4a: 콘텐츠 파일 게시 — 블로그/네이버 마크다운과 이미지를 사이트에 배치.

git 커밋·푸시는 여기서 하지 않는다 (스킬 흐름에서 별도 수행, dry-run 분기 용이).
"""
import re
import shutil
from datetime import date
from pathlib import Path

from .config import ASSETS_DIR, BRIEFINGS_DIR, NAVER_DIR, REPORTS_DIR

THUMB_NAME = "thumbnail.svg"
CHART_NAME = "disparity.png"


def asset_dir(target_date: date) -> Path:
    return ASSETS_DIR / target_date.isoformat()


def _rel_asset(target_date: date, filename: str) -> str:
    # site/src/content/{briefings,naver}/x.md → ../../assets/briefing/DATE/file
    return f"../../assets/briefing/{target_date.isoformat()}/{filename}"


def inject_images_blog(blog_md: str, target_date: date, has_chart: bool) -> str:
    """블로그 본문에 이미지 삽입: 썸네일은 frontmatter 직후, 차트는 ④ 섹션 직전."""
    thumb = f"\n![오늘의 시장 요약]({_rel_asset(target_date, THUMB_NAME)})\n"
    parts = blog_md.split("---", 2)
    if len(parts) == 3 and parts[0].strip() == "":
        blog_md = f"---{parts[1]}---\n{thumb}{parts[2]}"
    else:
        blog_md = thumb + blog_md

    if has_chart:
        chart = (
            f"\n![SKHY ADR 괴리율 추이]({_rel_asset(target_date, CHART_NAME)})\n\n"
        )
        m = re.search(r"^## ④", blog_md, re.MULTILINE)
        if m:
            blog_md = blog_md[: m.start()] + chart + blog_md[m.start() :]
        else:
            blog_md += chart
    return blog_md


def inject_images_naver(naver_body: str, target_date: date, has_chart: bool) -> str:
    """네이버 본문(제목 제외)에 이미지 삽입: 썸네일 최상단, 차트는 괴리율 섹션 다음 【 직전."""
    thumb = f"![오늘의 시장 요약]({_rel_asset(target_date, THUMB_NAME)})\n\n"
    body = thumb + naver_body
    if has_chart:
        chart = f"![SKHY ADR 괴리율 추이]({_rel_asset(target_date, CHART_NAME)})\n\n"
        anchor = body.find("【괴리율")
        if anchor != -1:
            nxt = body.find("【", anchor + 1)
            if nxt != -1:
                body = body[:nxt] + chart + body[nxt:]
            else:
                body += "\n\n" + chart
        else:
            body += "\n\n" + chart
    return body


def publish_files(
    target_date: date,
    blog_md: str,
    naver_title: str,
    naver_body: str,
    full_report: str,
    thumb_src: Path,
    chart_src: Path = None,
) -> dict:
    """파일 배치 후 게시 경로 요약을 반환."""
    d = target_date.isoformat()

    # 이미지
    adir = asset_dir(target_date)
    adir.mkdir(parents=True, exist_ok=True)
    shutil.copy(thumb_src, adir / THUMB_NAME)
    has_chart = chart_src is not None and Path(chart_src).exists()
    if has_chart:
        shutil.copy(chart_src, adir / CHART_NAME)

    # 블로그 글
    blog_path = BRIEFINGS_DIR / f"{d}-briefing.md"
    blog_path.parent.mkdir(parents=True, exist_ok=True)
    blog_path.write_text(
        inject_images_blog(blog_md, target_date, has_chart), encoding="utf-8"
    )

    # 네이버 비밀 페이지
    naver_path = NAVER_DIR / f"{d}.md"
    naver_path.parent.mkdir(parents=True, exist_ok=True)
    safe_title = naver_title.replace('"', "'")
    naver_path.write_text(
        f'---\ntitle: "{safe_title}"\ndate: {d}\n---\n\n'
        + inject_images_naver(naver_body, target_date, has_chart),
        encoding="utf-8",
    )

    # 풀 리포트 로컬 아카이브 (gitignore — 커밋되지 않음)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / f"{d}-full-report.md"
    report_path.write_text(full_report, encoding="utf-8")

    return {
        "blog": str(blog_path),
        "naver": str(naver_path),
        "report": str(report_path),
        "assets": str(adir),
        "blog_url_path": f"/briefing/{d}-briefing/",
        "naver_url_path": f"/naver/{d}/",
    }
