; MineGlance NSIS Uninstall Hook
; Calls cleanup API to remove device instance from database

!macro NSIS_HOOK_PREUNINSTALL
  ; Let PowerShell handle file reading and API call to avoid NSIS string issues
  ; The -replace removes any whitespace/newlines from the file content
  Exec 'powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$$id = (Get-Content -Raw \"$LOCALAPPDATA\com.mineglance.desktop\instance_id.txt\" -ErrorAction SilentlyContinue) -replace ''[\r\n\s]'',''''; if($$id){Invoke-WebRequest -Uri \"https://www.mineglance.com/api/desktop/uninstall?instanceId=$$id\" -UseBasicParsing -TimeoutSec 10}"'
!macroend
