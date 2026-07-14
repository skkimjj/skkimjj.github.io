"""괴리율 코드 재검증 — LLM(Claude)이 작성한 본문의 산수를 코드로 대조.

검증 항목:
- 환산가 ≈ SKHY 종가 × 10 × (내재된 환율이 900~2,500원 범위)
- 괴리율 ≈ (환산가 ÷ 본주 종가 − 1) × 100  (허용 오차 내)
표를 못 찾으면 실패 처리한다 — 괴리율 트래커는 필수 섹션이다.
"""
import re

from .config import DISPARITY_TOLERANCE_PP


def _num(s: str) -> float:
    return float(s.replace(",", ""))


def verify_disparity(blog_markdown: str) -> str:
    skhy = re.search(r"SKHY\s*종가[^$]*\$\s*([\d,]+\.?\d*)", blog_markdown)
    conv = re.search(r"환산가[^|]*\|\s*\**([\d,]+)\s*원", blog_markdown)
    base = re.search(r"본주\s*직전\s*종가[^|]*\|\s*\**([\d,]+)\s*원", blog_markdown)
    disp = re.search(r"괴리율\**\s*\|\s*\**([+\-−]?\s*\d+\.?\d*)\s*%", blog_markdown)
    if not (skhy and conv and base and disp):
        raise RuntimeError("괴리율 표 파싱 실패 — 필수 수치가 본문에 없음")

    skhy_price = _num(skhy.group(1))
    converted = _num(conv.group(1))
    base_price = _num(base.group(1))
    stated_disp = _num(disp.group(1).replace("−", "-").replace(" ", ""))

    implied_fx = converted / (skhy_price * 10)
    if not (900 <= implied_fx <= 2500):
        raise RuntimeError(
            f"환산가 검증 실패 — 내재 환율 {implied_fx:.1f}원은 비정상 범위"
        )

    computed_disp = (converted / base_price - 1) * 100
    if abs(computed_disp - stated_disp) > DISPARITY_TOLERANCE_PP:
        raise RuntimeError(
            f"괴리율 검증 실패 — 본문 {stated_disp:+.1f}% vs 재계산 {computed_disp:+.1f}%"
        )
    return (
        f"괴리율 검증 통과: 본문 {stated_disp:+.1f}% ≈ 재계산 {computed_disp:+.2f}% "
        f"(내재 환율 {implied_fx:,.1f}원)"
    )
