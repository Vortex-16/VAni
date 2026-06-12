# VAni - Authentication Flow & RBAC Guide

This document details the complete authentication flow and RBAC implementation.

---

## 🔐 Authentication Flows

### Flow 1: Google OAuth (Recommended)

```
┌─────────────┐
│   App       │
│  (Expo Go)  │
└──────┬──────┘
       │
       ├─→ Detects: Android/iOS? → Yes
       │   └─→ Has GOOGLE_ANDROID_CLIENT_ID? → No
       │       └─→ Use Web Client Fallback ✓
       │
       └─→ Click "Sign in with Google"
           │
           └─→ Open Google OAuth Consent Screen
               │
               ├─→ User selects Google account
               │
               ├─→ Google returns accessToken
               │
               └─→ App sends to backend: POST /api/auth/oauth
                   │
                   ├─→ Backend fetches user info from Google
                   │
                   ├─→ Auto-creates user (if new)
                   │
                   ├─→ Auto-verifies email
                   │
                   ├─→ Generates JWT token
                   │
                   └─→ Returns: { token, user }
                       │
                       └─→ App stores token + navigates to dashboard ✓
```

### Flow 2: Email/Password Login

```
┌─────────────┐
│   App       │
│  (Login)    │
└──────┬──────┘
       │
       └─→ Enter email & password
           │
           └─→ Click "Sign In"
               │
               └─→ POST /api/auth/login
                   │
                   ├─→ Backend finds user by email
                   │
                   ├─→ User verified? 
                   │   ├─→ No → Return 403 EMAIL_NOT_VERIFIED
                   │   │       └─→ Redirect to /verify-email screen
                   │   │           └─→ User enters OTP code
                   │   │               └─→ Mark as verified ✓
                   │   │
                   │   └─→ Yes → Verify password
                   │       ├─→ Correct → Generate JWT ✓
                   │       └─→ Wrong → Return 401 Unauthorized
                   │
                   └─→ Returns: { token, user }
                       │
                       └─→ App navigates to dashboard ✓
```

### Flow 3: Registration

```
┌─────────────┐
│   App       │
│ (Register)  │
└──────┬──────┘
       │
       └─→ Enter: email, name, password, role
           │
           └─→ Click "Sign Up"
               │
               └─→ POST /api/auth/register
                   │
                   ├─→ Check if email exists → No ✓
                   │
                   ├─→ Generate OTP code
                   │
                   ├─→ Create user record (unverified)
                   │
                   ├─→ Send verification email
                   │
                   └─→ Return: { requiresVerification: true }
                       │
                       └─→ App navigates to /verify-email
                           │
                           └─→ User receives OTP email
                               └─→ Enters OTP in app
                                   └─→ Account verified ✓
```

---

## 👥 RBAC (Role-Based Access Control)

### User Roles

| Role | Self Patient Profile | View Other Patients | Manage Medicines | Monitor Symptoms | Alert Others |
|------|:---:|:---:|:---:|:---:|:---:|
| **Patient** | ✅ | ❌ | ✅ | ✅ | ✅ (to caregivers) |
| **Caregiver** | ✅ | ✅ | ✅ | ✅ | ✅ (to family) |
| **Family** | ❌ | ✅ | ❌ | ✅ | ✅ (to all) |

### Role Selection

**OAuth Signup**:
```typescript
// User selects role on login screen
const role = "patient" | "caregiver" | "family"

// Sent with Google OAuth request
const res = await fetch(`${apiUrl}/api/auth/oauth`, {
  method: 'POST',
  body: JSON.stringify({
    provider: 'google',
    accessToken: googleToken,
    role: role,  // ← User-selected role
  }),
});
```

**Email/Password Signup**:
```typescript
const res = await fetch(`${apiUrl}/api/auth/register`, {
  method: 'POST',
  body: JSON.stringify({
    email,
    name,
    password,
    role: "patient",  // ← Default for email signup
  }),
});
```

### Backend Role Enforcement

**Example**: Patient can only view/edit their own patient record

```typescript
// In middleware
router.get('/api/patient/:id', requireAuth, async (req, res) => {
  const user = req.user;  // From JWT
  const patientId = req.params.id;

  // Patient can only access their own record
  if (user.role === 'patient' && user.linkedPatientId !== patientId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Caregiver can view any patient they manage
  if (user.role === 'caregiver') {
    const patient = await getPatient(patientId);
    if (patient.caregiverId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  // Family can view any patient
  if (user.role === 'family') {
    // No additional check needed
  }

  return res.json(patient);
});
```

### Frontend Role-Based Navigation

```typescript
// AppContext.tsx
const determineInitialRoute = () => {
  if (!user) return '/login';
  
  switch (user.role) {
    case 'patient':
      return '/(tabs)';  // Patient dashboard
    case 'caregiver':
      return '/caregiver/dashboard';  // Caregiver portal
    case 'family':
      return '/family/dashboard';  // Family monitor
    default:
      return '/login';
  }
};
```

---

## 🔑 Token & Session Management

### JWT Token Structure

```json
{
  "sub": "user-uuid",
  "iat": 1717670400,
  "exp": 1718275200
}
```

**Token Lifespan**: 7 days

**Stored In**: AsyncStorage (mobile), localStorage (web)

### Token Refresh Strategy

```typescript
// AppContext.tsx
const isTokenExpired = (token: string): boolean => {
  const decoded = jwtDecode(token);
  const expirationTime = decoded.exp * 1000;
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000;  // 5 min buffer
  
  return now >= expirationTime - bufferTime;
};

// Before making API calls
if (isTokenExpired(token)) {
  // Redirect to login for re-authentication
  router.replace('/login');
}
```

---

## 🛡️ Security Best Practices

### 1. Token Storage
- ✅ AsyncStorage (mobile) - Encrypted on Android 6+
- ✅ localStorage (web) - Protected by HTTPS
- ❌ Never store in plain text
- ❌ Never expose in logs

### 2. API Requests
```typescript
// Always include JWT in Authorization header
const response = await fetch(`${apiUrl}/api/patient/profile`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,  // ← Required
    'Content-Type': 'application/json',
  },
});
```

### 3. OAuth Token Validation
```typescript
// Backend validates every OAuth request
const userInfoRes = await fetch(
  'https://www.googleapis.com/userinfo/v2/me',
  {
    headers: { Authorization: `Bearer ${accessToken}` },
  }
);

if (!userInfoRes.ok) {
  return res.status(400).json({ error: 'Invalid Google token' });
}
```

### 4. Email Verification
- ✅ Passwords: Never stored in plain text (always hashed)
- ✅ OTP codes: Expire after 15 minutes
- ✅ Verification links: One-time use only
- ❌ Sensitive data: Never logged or cached

---

## 🧪 Testing Authentication

### Test Case 1: Google OAuth in Expo Go
```bash
# 1. Set client IDs in .env (web fallback is automatic)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_client_id

# 2. Start backend
pnpm --filter api-server dev

# 3. Start app
pnpm --filter @workspace/discharge-buddy exec expo start

# 4. In Expo Go, click "Sign in with Google"
# Expected: Web OAuth flow opens, user can authenticate

# 5. Verify user created in database
SELECT * FROM users WHERE email = 'your_gmail@gmail.com';
# Expected: isEmailVerified = true (OAuth auto-verifies)
```

### Test Case 2: Email/Password Registration + OTP
```bash
# 1. In app login screen, click "Sign up with Email"

# 2. Enter:
#    - Email: test@example.com
#    - Name: Test User
#    - Password: SecurePass123
#    - Role: Patient

# 3. Check email for OTP code (or logs if using mock mailer)

# 4. Enter OTP in app's /verify-email screen

# 5. User should be verified and logged in ✓
```

### Test Case 3: Role-Based Access
```bash
# 1. Create patient: test-patient@example.com (role: patient)
# 2. Create caregiver: test-caregiver@example.com (role: caregiver)

# 3. Patient tries to access caregiver dashboard
#    GET /api/caregiver/dashboard
#    Expected: 403 Forbidden

# 4. Caregiver accesses patient's data
#    GET /api/patient/{patientId}
#    Expected: 200 OK (if they manage that patient)

# 5. Family member accesses multiple patients
#    GET /api/patient/{patientId1}
#    GET /api/patient/{patientId2}
#    Expected: 200 OK for all
```

---

## 🚨 Error Handling

### Common Error Responses

| Error | HTTP | Description | User Action |
|-------|------|-------------|------------|
| Invalid credentials | 401 | Wrong password | Re-enter password |
| User not found | 404 | Email not registered | Sign up first |
| Email not verified | 403 | Needs OTP verification | Go to verify-email screen |
| Invalid Google token | 400 | Token expired/invalid | Try signing in again |
| Role mismatch | 403 | Accessing wrong resource | Use correct role account |
| Token expired | 401 | JWT expired | Log in again |

### Frontend Error Recovery

```typescript
try {
  const res = await fetch(`${apiUrl}/api/patient/profile`);
  
  if (res.status === 401) {
    // Token expired or invalid → redirect to login
    router.replace('/login');
  } else if (res.status === 403) {
    const data = await res.json();
    if (data.error === 'EMAIL_NOT_VERIFIED') {
      // Unverified email → go to verify screen
      router.replace(`/verify-email?email=${email}`);
    } else {
      // Access denied → show error
      setError('You do not have permission to access this resource');
    }
  }
} catch (error) {
  setError('Network error. Please check your connection.');
}
```

---

## 📱 Mobile-Specific Considerations

### iOS
- ⚠️ Must create iOS Client ID in Google Cloud Console
- ⚠️ Bundle ID must match `app.json` (`com.dischargebuddy.app`)
- ✅ Safari uses same cookies/tokens as app
- ✅ Keychain stores tokens securely

### Android
- ⚠️ Must create Android Client ID with SHA-1 certificate
- ⚠️ Package name must match `app.json` (`com.dischargebuddy.app`)
- ✅ OS handles encryption of sensitive data
- ✅ Chrome custom tabs open OAuth flow securely

### Expo Go
- ⚠️ Push notifications not supported (SDK 53+)
- ✅ Web OAuth flow works as fallback
- ✅ Local notifications work fine
- ⚠️ No biometric auth support
- ⚠️ No native credential manager access

---

## 🔗 Related Documentation

- [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) - Detailed OAuth setup guide
- [OAUTH_FIXES_SUMMARY.md](./OAUTH_FIXES_SUMMARY.md) - Summary of recent fixes
- [Backend Authentication Middleware](./artifacts/api-server/src/middlewares/auth.ts)
- [Frontend AppContext](./artifacts/discharge-buddy/context/AppContext.tsx)
- [Login Screen](./artifacts/discharge-buddy/app/login.tsx)

---

**Last Updated**: June 6, 2026  
**Status**: Complete ✅
