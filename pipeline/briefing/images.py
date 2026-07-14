"""Step 3: 이미지 생성 — 순수 코드 (LLM 불필요).

- 썸네일: 3대 지수 등락을 SVG 템플릿에 삽입 (상승 빨강 / 하락 파랑, 한국 관례)
- 괴리율 추이 차트: data/disparity-history.json 누적 데이터를 matplotlib로 렌더
  (차트 레이블은 폰트 문제를 피하기 위해 영문 사용)
"""
import json
from datetime import date
from xml.sax.saxutils import escape
from pathlib import Path
from typing import List, Optional

from .config import DISPARITY_HISTORY_FILE

UP_COLOR = "#d64545"    # 상승 = 빨강
DOWN_COLOR = "#3b6fd4"  # 하락 = 파랑
FLAT_COLOR = "#6b7280"

_SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#101623"/>
  <text x="80" y="120" font-family="'Apple SD Gothic Neo','Noto Sans KR',sans-serif" font-size="52" font-weight="800" fill="#ffffff">개장 전 브리핑</text>
  <text x="80" y="180" font-family="'Apple SD Gothic Neo','Noto Sans KR',sans-serif" font-size="34" fill="#93a0b5">{date_label}</text>
  {rows}
  <text x="80" y="580" font-family="'Apple SD Gothic Neo','Noto Sans KR',sans-serif" font-size="22" fill="#5b6778">밤사이 미국 시장 마감 기준 · 정보성 콘텐츠</text>
</svg>
"""

_ROW_TEMPLATE = """
  <text x="80" y="{y}" font-family="'Apple SD Gothic Neo','Noto Sans KR',sans-serif" font-size="40" font-weight="700" fill="#e6eaf2">{name}</text>
  <text x="520" y="{y}" font-family="'SF Mono',Menlo,monospace" font-size="40" fill="#e6eaf2">{close}</text>
  <text x="900" y="{y}" font-family="'SF Mono',Menlo,monospace" font-size="40" font-weight="700" fill="{color}">{pct}</text>
"""

WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"]


def _pct_color(pct: float) -> str:
    if pct > 0:
        return UP_COLOR
    if pct < 0:
        return DOWN_COLOR
    return FLAT_COLOR


def make_thumbnail(indices: List[dict], target_date: date, out_path: Path) -> None:
    """indices: [{"name": "S&P 500", "close": "6,234.50", "pct": -0.35}, ...] (최대 4개)"""
    rows = []
    for i, idx in enumerate(indices[:4]):
        pct = float(idx["pct"])
        rows.append(
            _ROW_TEMPLATE.format(
                y=280 + i * 70,
                name=escape(str(idx["name"])),
                close=escape(str(idx["close"])),
                pct=f"{pct:+.2f}%",
                color=_pct_color(pct),
            )
        )
    label = f"{target_date.month}월 {target_date.day}일({WEEKDAY_KO[target_date.weekday()]})"
    svg = _SVG_TEMPLATE.format(date_label=label, rows="".join(rows))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(svg, encoding="utf-8")


def append_history(target_date: date, disparity_pct: float) -> None:
    """오늘 괴리율을 누적 파일에 기록 (같은 날짜는 덮어씀)."""
    history = load_history()
    history = [h for h in history if h["date"] != target_date.isoformat()]
    history.append({"date": target_date.isoformat(), "disparity_pct": disparity_pct})
    history.sort(key=lambda h: h["date"])
    DISPARITY_HISTORY_FILE.write_text(
        json.dumps(history, ensure_ascii=False, indent=1), encoding="utf-8"
    )


def load_history() -> List[dict]:
    if DISPARITY_HISTORY_FILE.exists():
        return json.loads(DISPARITY_HISTORY_FILE.read_text(encoding="utf-8"))
    return []


def make_disparity_chart(out_path: Path, days: int = 30) -> Optional[Path]:
    """괴리율 추이 차트 PNG 생성. 데이터가 2일치 미만이면 생성 생략(None 반환)."""
    history = load_history()[-days:]
    if len(history) < 2:
        return None

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    dates = [h["date"][5:] for h in history]  # MM-DD
    values = [h["disparity_pct"] for h in history]
    colors = [_pct_color(v) for v in values]

    fig, ax = plt.subplots(figsize=(8, 4), dpi=150)
    ax.bar(dates, values, color=colors, width=0.6)
    ax.axhline(0, color="#444", linewidth=0.8)
    ax.set_title("SKHY ADR Premium / Discount vs KRX close (%)", fontsize=11)
    ax.set_ylabel("%")
    ax.tick_params(axis="x", rotation=45, labelsize=8)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path)
    plt.close(fig)
    return out_path
