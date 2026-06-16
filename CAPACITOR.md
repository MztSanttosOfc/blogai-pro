# BlogAI Pro — Android (Capacitor) Guide

This project is prepared to be packaged as a native **Android** app with
[Capacitor](https://capacitorjs.com) and published to the Google Play Store.

The Android app uses a **WebView that loads the live production site**
(`https://monzart.com.br`). This means published web changes appear in the app
without re-submitting the APK/AAB — you only re-publish the native build when
you change native config (icon, splash, permissions, app version).

## What is already configured

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`,
  `@capacitor/splash-screen` installed.
- `capacitor.config.ts`:
  - `appId`: `br.com.monzart.blogai`
  - `appName`: `BlogAI Pro`
  - `server.url`: `https://monzart.com.br` (WebView target)
  - `server.androidScheme`: `https`, `cleartext: false` (secure WebView)
  - Splash Screen plugin (dark background `#0b0a14`, 1.5s, center-crop).
- App icon source: `resources/icon.png` (1024×1024).
- Splash source: `resources/splash.png` (1920×1920).
- npm scripts: `cap:add:android`, `cap:sync`, `cap:assets`, `cap:open`.

## What you must do locally (requires Android Studio + JDK 17)

These steps cannot run on the cloud build server — run them on your machine.

```bash
# 1. Install deps
npm install

# 2. (Optional) build a local fallback bundle for offline use
npm run build

# 3. Add the native Android project (creates the /android folder)
npm run cap:add:android

# 4. Generate adaptive icons + splash from resources/
npx @capacitor/assets generate --android --assetPath resources
#    (or: npm run cap:assets)

# 5. Sync config + assets into the native project
npm run cap:sync

# 6. Open in Android Studio
npm run cap:open
```

In Android Studio you can then **Build > Generate Signed Bundle / APK >
Android App Bundle (.aab)** to produce the file you upload to Play Console.

## OAuth inside the WebView (Google + Blogger)

Login uses Lovable managed OAuth and Google's Blogger OAuth. Both redirect
through the browser. For these to work inside the Android WebView:

- Keep `server.url` on the same origin as your OAuth redirect URIs
  (`https://monzart.com.br`). The managed OAuth broker already allowlists the
  custom domain.
- Google blocks OAuth in raw WebViews. If you hit "disallowed_useragent",
  open the OAuth flow in an external browser / Custom Tab instead of the
  embedded WebView. Recommended plugin: `@capacitor/browser`
  (`Browser.open({ url })`) for the auth step, then deep-link back.
- Add a deep link / App Link for the return URL so the app regains focus
  after auth (configure an `intent-filter` with `https://monzart.com.br`).

## Permissions

The WebView app needs only:

- `INTERNET` (added automatically by Capacitor).

Add others (camera, storage) **only** if you later use native plugins. Keep
the permission list minimal for an easier Play Store review.

## Versioning for Play Store

Bump `versionCode` (integer) and `versionName` (string) in
`android/app/build.gradle` for each release before generating the AAB.

## Status

- ✅ Capacitor installed and configured.
- ✅ `capacitor.config.ts` pointing to production.
- ✅ Icon + splash source assets generated.
- ✅ Splash screen configured.
- ⏳ `npm run cap:add:android` must be run locally (needs Android SDK).
- ⏳ Signing keystore + AAB generation done in Android Studio.
- ⏳ Deep Links / external Custom Tab for Google OAuth (recommended before
  release if Google blocks the embedded WebView).
