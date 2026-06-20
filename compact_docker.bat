@echo off
echo ===================================================
echo Docker Disk Compactor (WSL2 VHDX)
echo Please ensure Docker Desktop is CLOSED/QUIT before running this!
echo ===================================================
echo.
echo 1. Shutting down WSL2 instances...
wsl --shutdown
echo.
echo 2. Preparing diskpart script...
set VHDX_PATH=C:\Users\User\AppData\Local\Docker\wsl\disk\docker_data.vhdx
set TEMP_SCRIPT=%TEMP%\compact_vdisk.txt

echo select vdisk file="%VHDX_PATH%" > "%TEMP_SCRIPT%"
echo attach vdisk readonly >> "%TEMP_SCRIPT%"
echo compact vdisk >> "%TEMP_SCRIPT%"
echo detach vdisk >> "%TEMP_SCRIPT%"

echo 3. Compacting VHDX file using diskpart...
diskpart /s "%TEMP_SCRIPT%"

echo.
echo 4. Cleaning up temporary files...
del "%TEMP_SCRIPT%"

echo.
echo Done! Please restart Docker Desktop.
pause
