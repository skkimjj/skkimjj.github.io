"""파이프라인 공통 설정: 경로, 환경변수, 상수.

유료 API는 사용하지 않는다 — 리서치·변환은 Claude Code(구독)가 직접 수행하고,
이 패키지는 검증·이미지·게시·이메일 등 순수 코드 단계만 담당한다.
"""
import os
from pathlib import Path

# 레포 루트 기준 경로
ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT / "data"
PROMPTS_DIR = ROOT / "docs" / "prompts"
REPORTS_DIR = ROOT / "reports"  # gitignore됨 — 풀 리포트 로컬 아카이브
SITE_DIR = ROOT / "site"
BRIEFINGS_DIR = SITE_DIR / "src" / "content" / "briefings"
NAVER_DIR = SITE_DIR / "src" / "content" / "naver"
ASSETS_DIR = SITE_DIR / "src" / "assets" / "briefing"

HOLIDAYS_FILE = DATA_DIR / "krx-holidays.json"
DISPARITY_HISTORY_FILE = DATA_DIR / "disparity-history.json"
RESEARCH_PROMPT_FILE = PROMPTS_DIR / "한국증시_예측리포트_프롬프트_v3.md"
TRANSFORM_PROMPT_FILE = PROMPTS_DIR / "블로그_레이어_프롬프트_v1.md"

# 이메일 (SMTP) — .env 또는 환경변수로 주입 (로컬 전용, 커밋 금지)
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
MAIL_TO = os.environ.get("MAIL_TO", "")

# 게시된 사이트 주소 (이메일 링크 생성용) — 예: https://<계정>.github.io/<레포>
SITE_URL = os.environ.get("SITE_URL", "").rstrip("/")

# 괴리율 재계산 허용 오차 (%p) — 본문 수치와 코드 계산의 차이가 이보다 크면 실패
DISPARITY_TOLERANCE_PP = float(os.environ.get("DISPARITY_TOLERANCE_PP", "0.3"))


def require_env(*names: str) -> None:
    """필수 환경변수가 없으면 즉시 명확한 오류로 중단."""
    missing = [n for n in names if not os.environ.get(n)]
    if missing:
        raise RuntimeError(f"필수 환경변수 누락: {', '.join(missing)}")
