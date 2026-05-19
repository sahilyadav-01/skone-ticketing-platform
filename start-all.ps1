$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $root

Write-Host 'Starting backend in a new PowerShell window...'
Start-Process powershell -ArgumentList @('-NoExit', '-Command', "cd '$root\\backend'; npm start")

Write-Host 'Starting frontend in a new PowerShell window...'
Start-Process powershell -ArgumentList @('-NoExit', '-Command', "cd '$root\\frontend'; npm start")

Pop-Location
