; MineGlance NSIS Uninstall Hook
; Calls cleanup API to remove device instance from database

!macro NSIS_HOOK_PREUNINSTALL
  ; Write a temp batch file that reads the ID, calls API, and cleans up local data
  FileOpen $0 "$TEMP\mg_cleanup.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'echo [%date% %time%] Starting MineGlance cleanup >> "$TEMP\mg_uninstall.log"$\r$\n'
  FileWrite $0 'set /p ID=<"$LOCALAPPDATA\com.mineglance.desktop\instance_id.txt"$\r$\n'
  FileWrite $0 'echo [%date% %time%] Instance ID: %ID% >> "$TEMP\mg_uninstall.log"$\r$\n'
  FileWrite $0 'curl -s "https://www.mineglance.com/api/desktop/uninstall?instanceId=%ID%" >> "$TEMP\mg_uninstall.log" 2>&1$\r$\n'
  FileWrite $0 'echo [%date% %time%] Cleaning up local data... >> "$TEMP\mg_uninstall.log"$\r$\n'
  FileWrite $0 'del /q "$LOCALAPPDATA\com.mineglance.desktop\instance_id.txt" 2>nul$\r$\n'
  FileWrite $0 'del /q "$LOCALAPPDATA\com.mineglance.desktop\settings.json" 2>nul$\r$\n'
  FileWrite $0 'rmdir /s /q "$LOCALAPPDATA\com.mineglance.desktop" 2>nul$\r$\n'
  FileWrite $0 'echo [%date% %time%] Done >> "$TEMP\mg_uninstall.log"$\r$\n'
  FileClose $0

  ; Execute the batch file
  Exec '"$TEMP\mg_cleanup.bat"'
!macroend
