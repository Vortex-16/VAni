# Google OAuth Setup Guide for Discharge Buddy

This guide walks you through setting up Google OAuth for the Discharge Buddy mobile app with proper RBAC (Role-Based Access Control) integration.

---

## 🎯 Overview

The app supports three authentication flows:
1. **Web OAuth Flow**: Uses `expo-auth-session` to redirect to Google's OAuth consent screen
2. **Android Native Flow**: Uses Android-specific OAuth client credentials
3. **iOS Native Flow**: Uses iOS-specific OAuth client credentials
4. **Expo Go Fallback**: Automatically falls back to web flow in Expo Go

---

## 📋 Prerequisites

- Google Cloud Project created at [https://console.cloud.google.com](https://console.cloud.google.com)
- Firebase project linked (for production push notifications)
- Android package name: `com.dischargebuddy.app` (configured in `app.json`)

---

## 🔧 Step 1: Create OAuth 2.0 Credentials in Google Cloud Console

### 1.1 Create the OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in the app information:
   - **App name**: `Discharge Buddy`
   - **User support email**: Your email
   - **App logo**: (Optional) Upload an icon
   - **Developer contact**: Your email
4. On the **Scopes** step, add these scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users if needed (your Gmail account)
6. Click **Save and Continue**

### 1.2 Create OAuth 2.0 Client IDs

#### Web Client ID (for web and fallback)
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Web application**
4. Add authorized redirect URIs:
   - `http://localhost:8081` (local dev)
   - `http://192.168.0.101:8081` (LAN testing)
   - `https://your-production-domain.com` (production)
5. Copy the **Client ID** (looks like: `1053496091346-rdlu90avmpelr3rsugdq07civngjtl1h.apps.googleusercontent.com`)

#### Android Client ID
1. Click **Create Credentials** → **OAuth 2.0 Client ID**
2. Select **Android**
3. Fill in:
   - **Package name**: `com.dischargebuddy.app`
   - **SHA-1 certificate fingerprint**: Get this from your keystore or Expo
4. Copy the **Client ID**

**To get Android SHA-1 fingerprint:**
```bash
# For development (Expo)
eas credential:create
# Choose Android
# Follow prompts to generate keystore

# Or if you have an existing keystore:
keytool -list -v -keystore /path/to/keystore.jks
```

#### iOS Client ID
1. Click **Create Credentials** → **OAuth 2.0 Client ID**
2. Select **iOS**
3. Fill in:
   - **Bundle ID**: `com.dischargebuddy.app`
   - **Team ID**: Your Apple Team ID (from Apple Developer account)
   - **App ID Prefix**: (Optional) Your app's prefix
4. Copy the **Client ID**

---

## 🔐 Step 2: Update Your `.env` File

Edit the `.env` file at the project root and add the client IDs you created:

```env
# ── Google OAuth Client IDs ──────────────────────────────────────────
# Web Client ID (for web and fallback)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>

# Android Client ID (for native Android builds)
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<your-android-client-id>

# iOS Client ID (for native iOS builds)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-ios-client-id>

# Backend Google Client ID (for server-side verification)
GOOGLE_CLIENT_ID=<same-as-web-client-id>
```

### Example:
```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1053496091346-rdlu90avmpelr3rsugdq07civngjtl1h.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=1053496091346-abc123def456.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1053496091346-xyz789uvw012.apps.googleusercontent.com
GOOGLE_CLIENT_ID=1053496091346-rdlu90avmpelr3rsugdq07civngjtl1h.apps.googleusercontent.com
```

---

## 🎮 Step 3: Testing

### Testing in Expo Go (Recommended for Development)

Expo Go automatically uses the web OAuth flow as a fallback:

```bash
# Terminal 1: Start backend
pnpm --filter api-server dev

# Terminal 2: Start Metro bundler
pnpm --filter @workspace/discharge-buddy exec expo start

# Scan QR code with Expo Go app (Android) or Camera app (iOS)
```

**Expected behavior in Expo Go:**
- ✅ Web OAuth flow is used (fallback)
- ✅ Google sign-in button works
- ✅ You're redirected to Google's OAuth screen
- ⚠️ Native push notifications are disabled (expected in Expo Go)

### Testing with Development Build (Recommended for Production Prep)

```bash
# Create a development build with native modules
eas build --platform android --profile preview
# or
eas build --platform ios --profile preview

# Run on physical device or emulator
eas build:run
```

### Testing with Production Build

For final testing before production:

```bash
# Build production APK/IPA
eas build --platform android --profile production
eas build --platform ios --profile production

# Test on physical device
```

---

## 🔄 Step 4: Backend API Integration

The backend (`/api-server`) already supports Google OAuth. The API endpoint handles:

1. **Access Token Validation**: Verifies the token against Google's userinfo endpoint
2. **User Creation/Update**: Automatically creates users on first OAuth login
3. **Email Verification**: OAuth users are automatically marked as verified
4. **JWT Generation**: Creates a session token for the app

### OAuth Endpoint: `POST /api/auth/oauth`

```typescript
{
  "provider": "google",
  "accessToken": "<google-access-token>",
  "role": "patient" | "caregiver" | "family"
}
```

**Response:**
```typescript
{
  "token": "<jwt-token>",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "patient",
    "isEmailVerified": true,
    "linkedPatientId": "patient-uuid"
  }
}
```

---

## 🛡️ RBAC (Role-Based Access Control) Integration

The app supports three user roles with different capabilities:

| Feature | Patient | Caregiver | Family |
|---------|---------|-----------|--------|
| View Own Profile | ✅ | ✅ | ✅ |
| Manage Medicines | ✅ | ✅ | ❌ |
| View Multiple Patients | ❌ | ✅ | ✅ |
| Monitor Symptoms | ✅ | ✅ | ✅ |
| Create Alerts | ✅ | ✅ | ✅ |

### Setting User Role During OAuth

When signing in with Google, you select a role:

```typescript
const [role, setRole] = useState<"patient" | "caregiver" | "family">("patient");

// In Google OAuth handler:
const res = await fetch(`${apiUrl}/api/auth/oauth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    accessToken: googleToken,
    role: role, // User-selected role
  }),
});
```

---

## 🐛 Troubleshooting

### Error: "androidClientId must be defined"
**Cause**: Running on Android without `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` set  
**Solution**: 
1. Check your `.env` file has the Android client ID
2. Reload the Expo Go app (or restart Metro bundler)
3. If testing in Expo Go, it should fallback to web flow automatically

### Error: "Invalid Google access token"
**Cause**: Token validation failed on backend  
**Solution**:
1. Verify `GOOGLE_CLIENT_ID` matches the one in Google Cloud Console
2. Check token isn't expired (should be fresh from Google)
3. Ensure Google Userinfo API is enabled in Google Cloud Console

### Error: "User already exists"
**Cause**: Email already registered  
**Solution**:
1. Use a different Google account
2. Or delete the user from database if testing

### Push notifications not working in Expo Go
**This is expected behavior** - Expo Go removed push notification support in SDK 53+. To use push notifications:
1. Build a custom development build: `eas build --platform android --profile preview`
2. Or use production build for testing
3. The app automatically disables push token requests in Expo Go

---

## 📚 Reference Links

- [Google Cloud Console](https://console.cloud.google.com)
- [expo-auth-session Documentation](https://docs.expo.dev/build-reference/expo-auth-session/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Expo EAS Build](https://docs.expo.dev/eas/build/)

---

## ✅ Verification Checklist

- [ ] Google Cloud OAuth consent screen configured
- [ ] Web Client ID created and copied to `.env`
- [ ] Android Client ID created and copied to `.env`
- [ ] iOS Client ID created and copied to `.env`
- [ ] `.env` file reloaded in development environment
- [ ] Backend API running (`pnpm --filter api-server dev`)
- [ ] Metro bundler restarted (`pnpm --filter @workspace/discharge-buddy exec expo start`)
- [ ] Google sign-in works in Expo Go
- [ ] User is redirected to dashboard after OAuth
- [ ] Role selection is preserved in session

---

## 🚀 Production Deployment

For production deployment:

1. **Create production OAuth credentials** in Google Cloud Console:
   - Web Client ID with production domain redirect URIs
   - Android Client ID with production keystore SHA-1
   - iOS Client ID with production bundle ID

2. **Update environment variables** in your CI/CD pipeline or deployment platform:
   - Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - Set `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
   - Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - Set `GOOGLE_CLIENT_ID`

3. **Build production apps**:
   ```bash
   eas build --platform android --profile production
   eas build --platform ios --profile production
   ```

4. **Submit to stores**:
   - Google Play: `eas submit --platform android`
   - Apple App Store: `eas submit --platform ios`

---

## 📞 Support

For issues or questions:
1. Check the [Expo Documentation](https://docs.expo.dev)
2. Review [Google OAuth Documentation](https://developers.google.com/identity)
3. Check app logs in Expo Go (press `j` for debugger)
4. Enable verbose logging in `.env`: `LOG_LEVEL=debug`
