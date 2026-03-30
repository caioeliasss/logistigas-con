@echo off
powershell -Command "Test-NetConnection %IP% -Port 2001"
powershell -Command "Test-NetConnection %IP% -Port 1771"
