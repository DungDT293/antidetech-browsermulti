@echo off
rem BrowserMulti - launcher with persistent profile
start "" "D:\dichchrome\src\out\Default\chrome.exe" ^
  --user-data-dir="D:\dichchrome\user_data" ^
  --no-first-run ^
  --no-default-browser-check ^
  https://www.google.com
