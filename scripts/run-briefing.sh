#!/bin/zsh
# 개장 전 브리핑 자동 실행 — launchd가 평일 07:05에 호출
# Claude Code 헤드리스 모드로 /briefing 스킬을 실행한다 (구독 사용량, 유료 API 없음)
set -uo pipefail

REPO="$HOME/Projects/investment"
LOG_DIR="$REPO/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/briefing-$(date +%Y-%m-%d).log"

export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$REPO"

echo "=== 브리핑 자동 실행 시작: $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG"

"$HOME/.local/bin/claude" -p "/briefing" \
  --permission-mode bypassPermissions \
  >> "$LOG" 2>&1
STATUS=$?

echo "=== 종료 (exit $STATUS): $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG"

# 30일 지난 로그 정리
find "$LOG_DIR" -name "briefing-*.log" -mtime +30 -delete 2>/dev/null

exit $STATUS
