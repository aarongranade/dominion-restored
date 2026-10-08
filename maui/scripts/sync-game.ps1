# Copies the web game from the repo root into the MAUI app's wwwroot/game. Run after changing the game.
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$dest = Join-Path $root 'maui\DominionRestored\wwwroot\game'
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $dest 'js') | Out-Null
Copy-Item (Join-Path $root 'index.html'), (Join-Path $root 'style.css'), (Join-Path $root 'icon.svg') $dest
Copy-Item (Join-Path $root 'js\*.js') (Join-Path $dest 'js')
$index = Join-Path $dest 'index.html'
(Get-Content $index) | Where-Object { $_ -notmatch 'rel="manifest"' } | Set-Content $index -Encoding utf8
Write-Host "Synced game into $dest"
