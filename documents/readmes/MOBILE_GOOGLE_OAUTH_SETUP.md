# Mobile Google Sign-In Setup (Dev Build)

Google Sign-In **cannot work in Expo Go** (SDK 54). The Expo auth proxy was removed and
Google rejects Expo Go's `exp://` redirect. You must run a **development build**.

The app code is already wired for this — once the steps below are done, no code change is
needed. `isGoogleAuthAvailable()` enables Google automatically once you're off Expo Go.

---

## What's already done in the repo

- `expo-dev-client` installed (enables custom dev builds).
- `ios.bundleIdentifier` = `com.dischargebuddy.app` and `android.package` = `com.dischargebuddy.app` set in `app.json`.
- `getGoogleAuthConfig()` passes `androidClientId`/`iosClientId` (with `webClientId` fallback).
- `.env` keys ready: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.

## What you must do

### 1. Create native OAuth clients in Google Cloud

Use the **same project as your web client** (`294320272880`) so the backend's token check
stays consistent. In **APIs & Services → Credentials → Create Credentials → OAuth client ID**:

**Android client**
- Application type: **Android**
- Package name: `com.dischargebuddy.app`
- SHA-1 certificate fingerprint: see step 2.

**iOS client**
- Application type: **iOS**
- Bundle ID: `com.dischargebuddy.app`

> Android OAuth clients have no client secret and no redirect URIs — package + SHA-1 is the match.

### 2. Get the SHA-1 fingerprint

**Local dev build** (`npx expo run:android`, uses the debug keystore):

```bash
keytool -list -v \
  -keystore "$USERPROFILE/.android/debug.keystore" \
  -alias androiddebugkey -storepass android -keypass android
```
Copy the `SHA1:` line into the Android OAuth client.

**EAS build** (Expo-managed credentials):

```bash
eas credentials      # Android → Keystore → shows the SHA-1
```
Add that SHA-1 instead (or in addition).

### 3. Put the client IDs in `.env`

```bash
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=294320272880-XXXXANDROID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=294320272880-XXXXIOS.apps.googleusercontent.com
```
Keep `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and backend `GOOGLE_CLIENT_ID` as the web client ID.

### 4. Build & run the dev client

**Local (needs Android Studio + SDK):**
```bash
pnpm --filter @workspace/discharge-buddy exec expo run:android
```

**Or EAS (cloud build, no local Android SDK needed):**
```bash
npm i -g eas-cli
eas login
eas build --profile development --platform android
# install the resulting .apk/.aab on the device, then:
pnpm --filter @workspace/discharge-buddy exec expo start --dev-client
```

Open the dev build (not Expo Go) → the "Sign in with Google" button is now active and
completes the native flow, then hits the same two-step `/oauth` role-selection flow.

---

## Notes & gotchas

- **`google-services.json` project mismatch:** the committed `assets/google-services.json`
  is project `discharge-buddy-87850`, while your OAuth web client is project `294320272880`.
  This is fine for OAuth (expo-auth-session ignores that file) — it only affects Firebase
  **push notifications**. If you later want push, regenerate `google-services.json` from the
  project whose Android app you registered, and keep OAuth + Firebase in one project to avoid confusion.
- **iOS URL scheme:** for iOS native sign-in, the reversed iOS client ID must be in the app's
  URL schemes. If iOS sign-in fails to return, add it under `ios.infoPlist.CFBundleURLTypes`
  (the reversed form `com.googleusercontent.apps.294320272880-XXXXIOS`).
- Each new keystore (debug vs release vs EAS) has its own SHA-1 — register all the ones you build with.
```
