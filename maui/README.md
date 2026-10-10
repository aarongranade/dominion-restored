# Dominion Restored: iOS, Android, Windows and Mac app (.NET MAUI Blazor Hybrid)

A thin native shell around the web game. `DominionRestored/` is a .NET 10 MAUI Blazor Hybrid app whose only page is a full-screen `BlazorWebView` showing the game in a frame. The game code stays in the repo root; `scripts/sync-game.sh` copies it into `DominionRestored/wwwroot/game/`.

## What the shell adds
- Fullscreen: hidden status bar on iOS, immersive mode on Android, dark background behind the web view.
- Portrait and landscape on phones and tablets.
- Screen stays awake while playing.
- The game pauses when the app goes to the background. Android's back button pauses and asks before quitting.
- Sound plays inline (WebAudio), zoom, overscroll and long-press menus are off.
- Saves live in the web view's local storage and persist between launches. No network access or permissions needed.
- App icon and splash screen from the game's gold cross emblem.

## Build
Requirements: .NET 10 SDK, then `dotnet workload install maui`. Android needs JDK 17 and the Android SDK (Visual Studio or `-t:InstallAndroidDependencies` installs it). iOS needs a Mac with the Xcode version your .NET iOS SDK asks for (the build error names it).

```sh
./maui/scripts/sync-game.sh      # after any change to the game (sync-game.ps1 on Windows)
dotnet build maui/DominionRestored -t:Run -f net10.0-android
dotnet build maui/DominionRestored -t:Run -f net10.0-ios          # Mac only
dotnet build maui/DominionRestored -t:Run -f net10.0-maccatalyst  # Mac only
dotnet build maui/DominionRestored -t:Run -f net10.0-windows10.0.19041.0  # Windows only
```

On Windows and Mac the game opens in a 900x860 window. With a mouse and a wide window the on-screen controls hide and the keyboard plays (arrows/WASD, Z attack, X item, C cycle, Enter pause). Windows runs unpackaged, so it needs no signing certificate; packaging for the Microsoft Store (MSIX) is a later step. The Mac app is sandboxed with no other entitlements.

**Visual Studio:** open `maui/DominionRestored.slnx` (Visual Studio 2022 17.13 or later, or Visual Studio 2026, with the .NET MAUI workload). Pick **Windows Machine**, an Android emulator or a device in the run target list and press F5. iOS needs a paired Mac. The game copy in `wwwroot/game/` is committed, so it builds straight away; run `scripts/sync-game.ps1` after changing the game.

GitHub Actions (`.github/workflows/maui.yml`) checks the bundled game is in sync, builds an installable Android APK (download it from the run's artifacts), builds for the iOS simulator, Windows and Mac Catalyst.

## Before publishing to the stores
1. **App ID**: `com.aarongranade.dominionrestored` is set in `DominionRestored.csproj`. Change it now if you want a different one; it cannot change after the first upload.
2. **Version**: bump `ApplicationVersion` for every upload, `ApplicationDisplayVersion` for user-visible releases.
3. **Android (Google Play)**: create an upload keystore (keep it safe, never commit it), then
   `dotnet publish maui/DominionRestored -f net10.0-android -c Release -p:AndroidKeyStore=true -p:AndroidSigningKeyStore=<path> -p:AndroidSigningKeyAlias=<alias> -p:AndroidSigningKeyPass=env:KEY_PASS -p:AndroidSigningStorePass=env:STORE_PASS`
   and upload the `.aab` in Play Console.
4. **iOS (App Store)**: Apple Developer account, App ID, distribution certificate and App Store provisioning profile, then
   `dotnet publish maui/DominionRestored -f net10.0-ios -c Release -p:ArchiveOnBuild=true -p:CodesignKey="Apple Distribution: ..." -p:CodesignProvision="..."`
   and upload the `.ipa` with Transporter.
5. Store listing: privacy "no data collected", content rating for fantasy violence, screenshots (title, overworld, a dungeon, a boss). A draft description is in `CLAUDE.md`.
