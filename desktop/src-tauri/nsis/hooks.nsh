; MineGlance NSIS Uninstall Hook
; Calls cleanup API to remove device instance from database

!macro NSIS_HOOK_PREUNINSTALL
  ; Read instance ID from the app's local data folder
  ClearErrors
  FileOpen $0 "$LOCALAPPDATA\com.mineglance.desktop\instance_id.txt" r
  IfErrors skip_cleanup
  FileRead $0 $1
  FileClose $0

  ; Remove trailing newline/carriage return from instance ID
  StrCpy $2 $1 -1

  ; Call the cleanup API - use start /b to run in background without waiting
  Exec 'cmd /c start /b powershell -WindowStyle Hidden -Command "Invoke-WebRequest -Uri https://www.mineglance.com/api/desktop/uninstall?instanceId=$2 -UseBasicParsing"'

  skip_cleanup:
!macroend
