# Dominion Restored: iOS and Android app (.NET MAUI Blazor Hybrid)

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
```

GitHub Actions (`.github/workflows/maui.yml`) checks the bundled game is in sync, builds an installable Android APK (download it from the run's artifacts), and builds for the iOS simulator.

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
