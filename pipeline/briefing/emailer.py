"""Step 4b: 이메일 발송 (SMTP, 무료).

- 성공: 풀 리포트(예측 포함) 본문 + 공개 브리핑/네이버 페이지 링크
- 실패: 오류 내용만 발송, 게시는 하지 않음
설정: SMTP_USER, SMTP_PASSWORD(앱 비밀번호), MAIL_TO, SITE_URL 환경변수.
"""
import smtplib
import ssl
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import markdown as md

from .config import MAIL_TO, SITE_URL, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER, require_env

STYLE = """
<style>
  body { font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
         line-height: 1.7; color: #1a1d24; max-width: 720px; margin: 0 auto; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { border: 1px solid #d8dce3; padding: 6px 10px; text-align: left; }
  th { background: #f3f5f8; }
  .links { background: #eef4ff; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
  h2, h3, h4 { margin-top: 1.6em; }
</style>
"""


def _send(subject: str, html_body: str) -> None:
    require_env("SMTP_USER", "SMTP_PASSWORD", "MAIL_TO")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = SMTP_USER
    msg["To"] = MAIL_TO
    msg.attach(MIMEText(f"<html><head>{STYLE}</head><body>{html_body}</body></html>", "html", "utf-8"))

    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx) as server:
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, [MAIL_TO], msg.as_string())


def send_briefing_email(date_str: str, full_report: str, blog_url_path: str, naver_url_path: str) -> None:
    blog_url = f"{SITE_URL}{blog_url_path}" if SITE_URL else f"(사이트 미설정){blog_url_path}"
    naver_url = f"{SITE_URL}{naver_url_path}" if SITE_URL else f"(사이트 미설정){naver_url_path}"
    links = (
        '<div class="links">'
        f'<b>📋 네이버 복붙용 비밀 페이지:</b> <a href="{naver_url}">{naver_url}</a><br>'
        f'<b>🌐 공개 브리핑:</b> <a href="{blog_url}">{blog_url}</a>'
        "</div>"
    )
    report_html = md.markdown(full_report, extensions=["tables"])
    _send(f"[개장 전 브리핑] {date_str} 풀 리포트", links + report_html)


def send_error_email(date_str: str, stage: str, error: str) -> None:
    body = (
        f"<h2>⚠️ {date_str} 브리핑 파이프라인 실패</h2>"
        f"<p><b>실패 단계:</b> {stage}</p>"
        f"<pre style='background:#f6f6f6;padding:12px;border-radius:8px;white-space:pre-wrap'>{error}</pre>"
        "<p>게시는 진행되지 않았습니다. (잘못된 글이 나가는 것 &lt; 하루 거르는 것)</p>"
    )
    _send(f"[개장 전 브리핑] {date_str} 실패 — {stage}", body)
