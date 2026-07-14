"""KRX 거래일 판정. 주말이거나 휴장일이면 False.

휴장일 데이터(data/krx-holidays.json)는 연 단위로 관리하며,
커버되지 않는 연도에 대해 판정을 요청하면 예외를 던진다 —
조용히 잘못된 날에 발행하는 것보다 실패가 낫다.
"""
import json
from datetime import date

from .config import HOLIDAYS_FILE


def load_holidays() -> dict:
    with open(HOLIDAYS_FILE, encoding="utf-8") as f:
        raw = json.load(f)
    return {
        year: {item["date"] for item in items}
        for year, items in raw.items()
        if not year.startswith("_")
    }


def is_trading_day(d: date) -> bool:
    if d.weekday() >= 5:  # 토=5, 일=6
        return False
    holidays = load_holidays()
    year = str(d.year)
    if year not in holidays:
        raise RuntimeError(
            f"{year}년 KRX 휴장일 데이터가 없습니다. "
            f"{HOLIDAYS_FILE} 에 {year}년 목록을 추가하세요."
        )
    return d.isoformat() not in holidays[year]
