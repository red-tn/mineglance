; MineGlance NSIS Uninstall Hook
; Calls cleanup API to remove device instance from database

!macro NSIS_HOOK_PREUNINSTALL
  ; Write a temp batch file that reads the ID and calls the API
  FileOpen $0 "$TEMP\mg_cleanup.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'set /p ID=<"$LOCALAPPDATA\com.mineglance.desktop\instance_id.txt"$\r$\n'
  FileWrite $0 'curl -s "https://www.mineglance.com/api/desktop/uninstall?instanceId=%ID%" >nul 2>&1$\r$\n'
  FileWrite $0 'del "%~f0"$\r$\n'
  FileClose $0

  ; Execute the batch file
  Exec '"$TEMP\mg_cleanup.bat"'
!macroend
