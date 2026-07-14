"""파이프라인 CLI — /briefing 스킬이 각 단계에서 호출하는 진입점.

사용법 (레포 루트에서):
  pipeline/.venv/bin/python -m briefing.run check-day [--date YYYY-MM-DD]
  pipeline/.venv/bin/python -m briefing.run verify --payload payload.json
  pipeline/.venv/bin/python -m briefing.run build  --payload payload.json
  pipeline/.venv/bin/python -m briefing.run email  --payload payload.json [--dry-run]
  pipeline/.venv/bin/python -m briefing.run email-error --date D --stage S --message M

payload.json 스키마:
{
  "date": "YYYY-MM-DD",
  "indices": [{"name": "S&P 500", "close": "6,234.50", "pct": -0.35}, ...],
  "disparity_pct": 2.9,
  "report_file": "풀 리포트 md 경로",
  "blog_file": "블로그 버전 md 경로 (frontmatter 포함)",
  "naver_file": "네이버 버전 md 경로 (첫 줄 '제목: ...')"
}
"""
import argparse
import json
import sys
from datetime import date
from pathlib import Path

from .config import ROOT


def _load_env_file() -> None:
    """레포 루트의 .env(gitignore됨)를 환경변수로 로드."""
    import os

    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _payload(path: str) -> dict:
    p = json.loads(Path(path).read_text(encoding="utf-8"))
    for key in ("date", "indices", "disparity_pct", "report_file", "blog_file", "naver_file"):
        if key not in p:
            raise SystemExit(f"payload에 '{key}' 누락")
    return p


def _read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def _parse_naver(naver_md: str):
    lines = naver_md.strip().splitlines()
    if not lines or not lines[0].startswith("제목:"):
        raise SystemExit("네이버 파일 첫 줄은 '제목: ...' 형식이어야 함")
    return lines[0][3:].strip(), "\n".join(lines[1:]).strip()


def cmd_check_day(args) -> int:
    from .holidays import is_trading_day

    d = date.fromisoformat(args.date) if args.date else date.today()
    if is_trading_day(d):
        print(f"TRADING_DAY {d.isoformat()}")
        return 0
    print(f"HOLIDAY {d.isoformat()} — 오늘은 거래일이 아님, 파이프라인 종료")
    return 2


def cmd_verify(args) -> int:
    from .validate import find_missing_tier1
    from .verify import verify_disparity

    p = _payload(args.payload)
    report = _read(p["report_file"])
    missing = find_missing_tier1(report)
    if missing:
        print(f"FAIL 티어1 누락: {', '.join(missing)}")
        return 1
    print("티어1 8종 통과")
    print(verify_disparity(_read(p["blog_file"])))
    return 0


def cmd_build(args) -> int:
    from .images import append_history, make_disparity_chart, make_thumbnail
    from .publish import publish_files

    p = _payload(args.payload)
    d = date.fromisoformat(p["date"])
    work = Path(p["blog_file"]).parent

    thumb = work / "thumbnail.svg"
    make_thumbnail(p["indices"], d, thumb)
    append_history(d, float(p["disparity_pct"]))
    chart = make_disparity_chart(work / "disparity.png")

    naver_title, naver_body = _parse_naver(_read(p["naver_file"]))
    result = publish_files(
        target_date=d,
        blog_md=_read(p["blog_file"]),
        naver_title=naver_title,
        naver_body=naver_body,
        full_report=_read(p["report_file"]),
        thumb_src=thumb,
        chart_src=chart,
    )
    print(json.dumps(result, ensure_ascii=False, indent=1))
    return 0


def cmd_email(args) -> int:
    from .publish import BRIEFINGS_DIR  # noqa: F401  (경로 계산용 config 로드)

    p = _payload(args.payload)
    d = p["date"]
    blog_url = f"/briefing/{d}-briefing/"
    naver_url = f"/naver/{d}/"
    if args.dry_run:
        print(f"[dry-run] 이메일 발송 생략 — 제목: [개장 전 브리핑] {d} 풀 리포트")
        print(f"[dry-run] 링크: {blog_url} / {naver_url}")
        return 0
    from .emailer import send_briefing_email

    send_briefing_email(d, _read(p["report_file"]), blog_url, naver_url)
    print(f"이메일 발송 완료 → {d}")
    return 0


def cmd_email_error(args) -> int:
    if args.dry_run:
        print(f"[dry-run] 오류 이메일 생략 — {args.stage}: {args.message}")
        return 0
    from .emailer import send_error_email

    send_error_email(args.date or date.today().isoformat(), args.stage, args.message)
    print("오류 이메일 발송 완료")
    return 0


def main() -> int:
    _load_env_file()
    ap = argparse.ArgumentParser(prog="briefing")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("check-day")
    s.add_argument("--date")
    s.set_defaults(fn=cmd_check_day)

    s = sub.add_parser("verify")
    s.add_argument("--payload", required=True)
    s.set_defaults(fn=cmd_verify)

    s = sub.add_parser("build")
    s.add_argument("--payload", required=True)
    s.set_defaults(fn=cmd_build)

    s = sub.add_parser("email")
    s.add_argument("--payload", required=True)
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(fn=cmd_email)

    s = sub.add_parser("email-error")
    s.add_argument("--date")
    s.add_argument("--stage", required=True)
    s.add_argument("--message", required=True)
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(fn=cmd_email_error)

    args = ap.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
