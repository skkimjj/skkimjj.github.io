"""검증 게이트: 풀 리포트에 티어1 핵심 수치 8종이 존재하는지 파싱 체크.

키워드 존재 기반의 보수적 검사다 — 하나라도 빠지면 게시하지 않는다.
("잘못된 글이 나가는 것 < 하루 거르는 것")
"""
import re
from typing import List

# (항목 이름, 모두 존재해야 하는 패턴 목록)
TIER1_CHECKS = [
    ("미 3대 지수 + SOX", [r"S&P", r"나스닥|Nasdaq", r"SOX|필라델피아"]),
    ("미 지수선물", [r"선물"]),
    ("원/달러 환율", [r"원[/·]?달러|USD/KRW|원달러"]),
    ("VKOSPI", [r"VKOSPI"]),
    ("한국 지수·수급", [r"KOSPI|코스피", r"KOSDAQ|코스닥", r"외국인"]),
    ("SKHY ADR", [r"SKHY|ADR"]),
    ("삼성전자·SK하이닉스 종가", [r"삼성전자", r"하이닉스"]),
    ("공매도 제도", [r"공매도"]),
]


def find_missing_tier1(report: str) -> List[str]:
    """리포트에서 누락된 티어1 항목 이름 목록을 반환. 빈 리스트면 통과."""
    missing = []
    for name, patterns in TIER1_CHECKS:
        if not all(re.search(p, report) for p in patterns):
            missing.append(name)
    return missing


def assert_tier1(report: str) -> None:
    missing = find_missing_tier1(report)
    if missing:
        raise RuntimeError(f"검증 게이트 실패 — 티어1 누락: {', '.join(missing)}")
