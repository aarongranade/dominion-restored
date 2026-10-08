# CLAUDE.md: .NET MAUI Blazor Hybrid wrapper for Dominion Restored

> Status: the project in `DominionRestored/` has been created following this plan (sections 1 to 4), along with the sync scripts and CI. Use the rest of this file as the reference for remaining work: device testing (section 5 checklist), signing and store release (section 6). Keep the conventions below when changing the app.

Goal: wrap the web game in this repo (`../index.html`, `../style.css`, `../js/*.js`) in a .NET MAUI Blazor Hybrid app so it can ship to the Apple App Store and Google Play. The game is plain static HTML/JS (no build step), so the app is a thin shell: a `BlazorWebView` that shows the game inside an `<iframe>`. Do not rewrite game logic in C#.

## Ground rules
- Keep the web game as the single source of truth. Never fork it. A sync script copies it into the app.
- Create the MAUI project in `maui/DominionRestored/` (this folder). Do not touch `js/` except for the small changes listed under "Game-side tweaks".
- Target the current .NET LTS (use `dotnet --list-sdks`; .NET 9 or newer). Install the workload with `dotnet workload install maui`.
- iOS builds and signing need a Mac with Xcode and an Apple Developer account. Android builds work on any OS. If you are on Linux or Windows, build Android and stop at the iOS checklist.
- Ask the user before: choosing the bundle ID, publishing anything, creating signing keys, or spending money.

## 1. Scaffold
```sh
cd maui
dotnet new maui-blazor -n DominionRestored -o DominionRestored
```
Use bundle/application ID `com.<owner>.dominionrestored` (confirm with the user). Set in `DominionRestored.csproj`: `<ApplicationTitle>Dominion Restored</ApplicationTitle>`, `<ApplicationId>`, `<ApplicationDisplayVersion>1.0</ApplicationDisplayVersion>`, `<ApplicationVersion>1</ApplicationVersion>` (increment for every store upload).

Delete the template demo pages (`Components/Pages/Counter`, `Weather`, `Home` content, nav menu, and the sample CSS). Keep `Main.razor`/`Routes` minimal.

## 2. Host the game
1. Create `wwwroot/game/` and copy the game into it: `index.html`, `style.css`, `js/`, `icon.svg`. Do **not** copy `sw.js`, `manifest.webmanifest`, `tools/`, or `maui/`. The game only registers its service worker on `http(s)`, so it is skipped inside the app (scheme is `app://`).
2. Add `scripts/sync-game.sh` (and `.ps1` for Windows) that wipes and re-copies those files from the repo root into `wwwroot/game/`. Run it before every build. Add it as a pre-build target in the csproj.
3. Make `wwwroot/index.html` the Blazor host page:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <base href="/" />
  <style>html,body{margin:0;height:100%;background:#0b0b14;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}</style>
</head>
<body>
  <div id="app"></div>
  <script src="_framework/blazor.webview.js" autostart="false"></script>
</body>
</html>
```
4. Root component renders only `<iframe src="game/index.html" allow="autoplay"></iframe>` (a single `Components/Routes.razor` or `Main.razor`, no layout, no nav).
5. In `MainPage.xaml`, keep the `BlazorWebView` full-screen with `HostPage="wwwroot/index.html"` and `RootComponent` selector `#app`.

Note: the game has its own `#app` element. Because it runs in an iframe it is isolated from the host's `#app`, so there is no clash.

## 3. Native polish (do all of these)
- **Orientation:** allow portrait and landscape. iOS: `UISupportedInterfaceOrientations` in `Platforms/iOS/Info.plist`. Android: `ScreenOrientation.Unspecified` in `MainActivity`.
- **Fullscreen / safe areas:** hide the status bar and use edge-to-edge. Android: `Window.SetFlags` / `WindowCompat.SetDecorFitsSystemWindows(false)` and immersive sticky mode in `MainActivity`. iOS: `UIStatusBarHidden = true`, `UIViewControllerBasedStatusBarAppearance = false`, and let the page's `env(safe-area-inset-*)` handle notches (the game's CSS already does).
- **Keep screen awake** while playing (`DeviceDisplay.Current.KeepScreenOn = true`).
- **Audio:** the game starts WebAudio on the first tap, which satisfies autoplay rules. On iOS set `allowsInlineMediaPlayback` (via a `BlazorWebViewHandler` mapper tweak) and make sure the silent switch does not matter (WebAudio plays regardless). On Android set `MediaPlaybackRequiresUserGesture = false` in a handler customization.
- **Pause when backgrounded:** the game already pauses on `visibilitychange`; verify it fires in the WebView.
- **Android back button:** override to show a "quit?" confirm or to send START (pause) to the page via `EvaluateJavaScriptAsync("Input.press.start=true")`. Never let it kill the app mid-fight without confirmation.
- **Disable** WebView text selection, long-press menus, zoom, and overscroll glow. The game CSS already sets `user-select:none` and `touch-action:none`; also disable Android's `SetSupportZoom(false)`.
- **Persistence:** saves use `localStorage` (key `dominion-restored-v1`). Confirm it persists across app restarts on both platforms; do not clear WebView data on launch.
- **Offline:** everything is bundled, so no network permission is needed. Remove `INTERNET` from the Android manifest in Release if the template added it, and add `ITSAppUsesNonExemptEncryption = false` to Info.plist.

## 4. Icons and splash
- App icon: render the game's `icon.svg` (a gold cross on a dark field) to a 1024x1024 PNG with no transparency. Put it at `Resources/AppIcon/appicon.svg` (MAUI generates all sizes) and a foreground `appiconfg.svg`.
- Splash: `Resources/Splash/splash.svg` on `#0b0b14`, centered title "DOMINION RESTORED". Set `<MauiSplashScreen ... Color="#0b0b14" />`.
- Store screenshots: capture the game with `tools/` Playwright scripts or device screenshots (iPhone 6.7" and 6.5", iPad 12.9", Android phone and 7"/10" tablet). Include one of: title, overworld, the Temptation dungeon, a boss fight.

## 5. Build and run
```sh
./scripts/sync-game.sh
dotnet build -t:Run -f net9.0-android          # emulator or device
dotnet build -t:Run -f net9.0-ios              # Mac only, simulator
```
Replace `net9.0` with the TFM in the csproj. Verify on a real phone: title screen taps work, on-screen controls respond with multitouch (stick + A at once), music plays after first tap, rotating the device re-lays-out, saving then force-quitting then relaunching continues the game, and the game reaches 60 fps.

## 6. Store release
**Android (Google Play)**
1. Generate an upload keystore (ask the user to keep it safe; never commit it). Put the path and passwords in user secrets or env vars, not the csproj.
2. `dotnet publish -f net9.0-android -c Release -p:AndroidPackageFormats=aab -p:AndroidKeyStore=true ...` to produce a signed `.aab`.
3. Play Console: create the app, fill the content rating questionnaire, data safety form (the game collects no data), target audience, upload the `.aab`, add screenshots and the description below.

**iOS (App Store)** (Mac required)
1. Apple Developer Program membership; create the App ID, distribution certificate and App Store provisioning profile.
2. `dotnet publish -f net9.0-ios -c Release -p:ArchiveOnBuild=true -p:CodesignKey="Apple Distribution: ..." -p:CodesignProvision="..."`, then upload the `.ipa` with Transporter.
3. App Store Connect: age rating, privacy "Data Not Collected", screenshots, review notes.

**Store listing text (draft, edit with the user)**
- Title: Dominion Restored
- Subtitle: An 8-bit Bible adventure
- Description: Walk from Eden to Revelation in a retro action adventure. Explore the overworld, delve into ten dungeons, wield the Dove, the Rod of Moses, the Shofar and the Sword of the Spirit, and face the Serpent, Pharaoh, Goliath, Death and the Dragon. Includes the Temptation of Jesus. Works offline. No ads, no purchases.
- Keywords: bible, adventure, retro, 8-bit, action, zelda-like, dungeons
- Content note: fantasy violence against monsters and bosses, no gore. Expect a 9+/Everyone 10+ style rating; answer questionnaires truthfully.

## 7. Game-side tweaks (small, optional, ask first)
- Add `window.addEventListener('message', ...)` in `js/game.js` so the host can send `pause` / `mute` commands, instead of using `EvaluateJavaScriptAsync` against globals.
- Hide the game's on-screen controls on tablets with keyboards or gamepads. A gamepad mapper (Gamepad API) would be a good add for iPad and Android; keep it in the web code so both targets benefit.
- Consider raising the canvas scale on tablets (the CSS already scales to the screen).

## 8. Definition of done
- `dotnet build` succeeds for Android (and iOS if on a Mac) from a clean checkout after running the sync script.
- The app launches straight into the game title screen with no Blazor chrome visible.
- All items in section 3 verified on a physical device; notes recorded in `maui/TESTING.md`.
- A signed `.aab` (and `.ipa` if possible) is produced, and the store checklist in section 6 is written up for the user with anything still needed from them (accounts, keys, bundle ID, screenshots).
- Never commit keystores, certificates, provisioning profiles, or passwords. Add them to `.gitignore`.
