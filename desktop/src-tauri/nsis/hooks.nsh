; MineGlance NSIS Uninstall Hook
; Calls cleanup API to remove device instance from database

!macro NSIS_HOOK_PREUNINSTALL
  ; Read the instance ID first before we delete anything
  ClearErrors
  FileOpen $0 "$LOCALAPPDATA\com.mineglance.desktop\instance_id.txt" r
  IfErrors skip_cleanup
  FileRead $0 $1
  FileClose $0

  ; Delete local data IMMEDIATELY via NSIS (synchronous) to prevent stale ID on reinstall
  Delete "$LOCALAPPDATA\com.mineglance.desktop\settings.json"
  Delete "$LOCALAPPDATA\com.mineglance.desktop\instance_id.txt"
  RMDir /r "$LOCALAPPDATA\com.mineglance.desktop"

  ; Write a temp batch file that calls API with the ID we already read
  ; We pass the ID directly since the file is now deleted
  FileOpen $0 "$TEMP\mg_cleanup.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'echo [%date% %time%] Starting MineGlance cleanup >> "$TEMP\mg_uninstall.log"$\r$\n'
  FileWrite $0 'echo [%date% %time%] Instance ID: $1 >> "$TEMP\mg_uninstall.log"$\r$\n'
  FileWrite $0 'curl -s "https://www.mineglance.com/api/desktop/uninstall?instanceId=$1" >> "$TEMP\mg_uninstall.log" 2>&1$\r$\n'
  FileWrite $0 'echo [%date% %time%] Done >> "$TEMP\mg_uninstall.log"$\r$\n'
  FileClose $0

  ; Execute the batch file
  Exec '"$TEMP\mg_cleanup.bat"'

  skip_cleanup:
!macroend
