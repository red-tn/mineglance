$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Set-Location "F:\MINEGLANCE\mobile"
npx eas submit --platform ios --latest --non-interactive
