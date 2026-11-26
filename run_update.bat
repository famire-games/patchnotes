@echo off
rem 매일 자동 갱신: 패치노트 수집·요약, 롤 사전, 하스스톤 전장(블리자드 약관: 30일 안 갱신)
cd /d %~dp0
echo [%date% %time%] start >> update.log
node update.mjs >> update.log 2>&1
node lol_build.mjs >> update.log 2>&1
node hs_build.mjs >> update.log 2>&1
node pkc_build.mjs >> update.log 2>&1
echo [%date% %time%] done >> update.log
