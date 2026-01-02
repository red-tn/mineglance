$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Set-Location "F:\MINEGLANCE\mobile"
npx eas build --platform ios --profile production --non-interactive
