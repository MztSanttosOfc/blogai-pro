import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the BlogAI Pro Android app.
 *
 * The app is a server-rendered web app hosted on Lovable Cloud, so the
 * Android WebView loads the live production site directly instead of a
 * static bundle. This keeps the native shell always in sync with the web
 * app and avoids re-publishing the APK/AAB for every content change.
 */
const config: CapacitorConfig = {
  appId: "br.com.monzart.blogai",
  appName: "BlogAI Pro",
  // Required by the CLI even when loading a remote URL. The build output
  // folder is used as a fallback bundle if the device is offline.
  webDir: "dist",
  server: {
    // Production site served inside the Android WebView.
    url: "https://monzart.com.br",
    androidScheme: "https",
    // Only allow secure (https) content inside the WebView.
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0b0a14",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
