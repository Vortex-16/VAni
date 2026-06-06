# Discharge Buddy - Quick Reference Card

**Last Updated**: June 6, 2026  
**Version**: 1.0.0

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
```bash
node -v      # v18+
pnpm -v      # v8+
```

### Start Development Environment

**Terminal 1 - Backend**
```bash
cd d:\Discard\Discharge-Buddy4
pnpm --filter api-server dev
```

**Terminal 2 - Mobile App**
```bash
cd d:\Discard\Discharge-Buddy4
pnpm --filter @workspace/discharge-buddy exec expo start
```

**On Your Device**
- **iOS**: Scan QR code with Camera app
- **Android**: Scan QR code with Expo Go app

---

## 🔐 OAuth Setup (Required for Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials:
   - **Web Client ID** ← Already in `.env`
   - **Android Client ID** ← Add to `.env`
   - **iOS Client ID** ← Add to `.env`
3. Update `.env`:
   ```bash
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android-client-id>
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios-client-id>
   ```

**See**: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)

---

## 📱 Available Roles

| Role | Dashboard | Features |
|------|-----------|----------|
| **Patient** | `/(tabs)` | View own data, manage medicines, log symptoms |
| **Caregiver** | `/caregiver/dashboard` | Monitor multiple patients, manage their medicines |
| **Family** | `/family/dashboard` | Monitor multiple patients (view-only) |

---

## 📂 Project Structure

```
d:\Discard\Discharge-Buddy4/
├── artifacts/
│   ├── api-server/           # Backend API (Express.js)
│   │   └── src/
│   │       ├── routes/auth.ts      # OAuth endpoints
│   │       └── middlewares/auth.ts # Auth middleware
│   ├── discharge-buddy/      # Mobile app (React Native/Expo)
│   │   ├── app/
│   │   │   └── login.tsx           # Login & OAuth
│   │   ├── context/
│   │   │   └── AppContext.tsx      # Auth state & RBAC
│   │   └── utils/
│   │       └── NotificationHelper.ts
│   └── ocr-service/          # OCR service (Python)
├── lib/
│   ├── api-client-react/     # Generated API client
│   ├── db/                   # Database layer (Drizzle)
│   └── api-spec/             # OpenAPI spec
├── .env                       # Environment variables
├── GOOGLE_OAUTH_SETUP.md      # OAuth configuration guide
├── AUTH_FLOW_AND_RBAC.md      # Authentication flows
└── OAUTH_FIXES_SUMMARY.md     # Summary of fixes
```

---

## 🔧 Common Commands

### Backend
```bash
# Start development server
pnpm --filter api-server dev

# Run tests
pnpm --filter api-server test

# View logs
pnpm --filter api-server logs
```

### Frontend
```bash
# Start Metro bundler
pnpm --filter @workspace/discharge-buddy exec expo start

# Type check
pnpm --filter @workspace/discharge-buddy typecheck

# Build web version
pnpm --filter @workspace/discharge-buddy build

# Generate API client
pnpm --filter api-client-react generate
```

### Database
```bash
# Apply migrations
pnpm --filter @workspace/db migrate

# View database
# Use your Neon console at https://console.neon.tech
```

---

## 🔑 Environment Variables

### Required for Development
```env
# Backend
PORT=3000
NODE_ENV=development
JWT_SECRET=super_secret_dev_jwt_key

# Database
DATABASE_URL=postgresql://...

# Google OAuth (at minimum)
GOOGLE_CLIENT_ID=<your-web-client-id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>

# API URLs
EXPO_PUBLIC_API_URL=http://192.168.0.101:3000
```

### Optional (for AI Features)
```env
GEMINI_API_KEY=...          # Google Gemini
ANTHROPIC_API_KEY=...       # Claude
GROQ_API_KEY=...            # Groq (Llama)
NVIDIA_API_KEY=...          # NVIDIA
ELEVENLABS_API_KEY=...      # Text-to-speech
```

---

## 🐛 Common Issues & Fixes

### Error: "androidClientId must be defined"
```
✓ OK in Expo Go (uses web fallback)
✗ Need Android Client ID for production
→ See GOOGLE_OAUTH_SETUP.md
```

### Error: "Push tokens not supported in Expo Go"
```
✓ Expected warning (SDK 53+)
✓ Local notifications still work
✗ Need development build for remote push
→ Use: eas build --platform android --profile preview
```

### Error: "EMAIL_NOT_VERIFIED"
```
✓ Email/password signup requires OTP
✓ OAuth users auto-verified
→ Go to /verify-email screen and enter OTP code
```

### Metro Bundler Issues
```bash
# Clear cache and restart
rm -r node_modules/.cache
pnpm --filter @workspace/discharge-buddy exec expo start -c
```

### Database Connection Issues
```bash
# Verify DATABASE_URL in .env
# Test connection: psql <DATABASE_URL>
# Check Neon dashboard for active connections
```

---

## 📊 API Endpoints

### Authentication
```http
POST /api/auth/oauth
POST /api/auth/login
POST /api/auth/register
POST /api/auth/verify-email
```

### Patient Data
```http
GET    /api/patient/profile
GET    /api/patient/:id
PATCH  /api/patient/:id
GET    /api/patient/:id/medicines
GET    /api/patient/:id/doses
POST   /api/patient/:id/symptom-logs
```

### Caregiver Operations
```http
GET    /api/caregiver/patients
GET    /api/caregiver/patient/:id
PATCH  /api/caregiver/patient/:id/risk-score
```

**Auth**: All endpoints require `Authorization: Bearer <token>` header

---

## 🧪 Testing Flows

### Test Google OAuth
```
1. Open login screen
2. Select role (patient/caregiver/family)
3. Click "Sign in with Google"
4. Authenticate with Google account
5. Verify user created in database
```

### Test Email/Password
```
1. Open login screen
2. Click "Sign up with Email"
3. Enter: email, name, password, role
4. Check email for OTP code
5. Enter OTP to verify
6. Login with email/password
```

### Test RBAC
```
Patient:   Can only view own medicines, log symptoms
Caregiver: Can view multiple patients, manage their medicines
Family:    Can view multiple patients (read-only)
```

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) | Complete OAuth configuration guide |
| [AUTH_FLOW_AND_RBAC.md](./AUTH_FLOW_AND_RBAC.md) | Authentication flows and role system |
| [OAUTH_FIXES_SUMMARY.md](./OAUTH_FIXES_SUMMARY.md) | Summary of recent fixes |
| [BACKEND_GUIDE.md](./BACKEND_GUIDE.md) | Backend API documentation |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Implementation details |
| [ENV_SETUP.md](./ENV_SETUP.md) | Environment setup |

---

## 🚢 Deployment

### Build for Mobile
```bash
# Development build
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Production build
eas build --platform android --profile production
eas build --platform ios --profile production
```

### Deploy Backend
```bash
# Option 1: Render
git push origin main  # Auto-deploys from render.yaml

# Option 2: Heroku
heroku login
git push heroku main

# Option 3: Docker
docker build -t discharge-buddy .
docker run -p 3000:3000 discharge-buddy
```

### Verify Deployment
```bash
curl https://your-api.com/api/health
# Should return: { status: "ok" }
```

---

## 🆘 Getting Help

### Check Logs
```bash
# Backend logs
tail -f logs/server.log

# Expo logs (in terminal)
Press 'j' in Metro bundler → Open debugger

# Database logs
Check Neon dashboard
```

### Read Documentation
- [Expo Docs](https://docs.expo.dev)
- [Express.js Docs](https://expressjs.com)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Google OAuth Docs](https://developers.google.com/identity)

### Debug in Code
```typescript
// Add logging
console.log('[Auth] Attempting OAuth flow', { provider, role });

// Use debugger
debugger;  // Pause execution in Chrome DevTools
```

---

## ✅ Setup Verification

Run the verification script:
```bash
# Windows PowerShell
.\verify-setup.ps1

# macOS/Linux bash
bash verify-setup.sh
```

---

## 📋 Checklist for New Developers

- [ ] Clone repository
- [ ] Install Node.js (v18+) and pnpm
- [ ] Copy `.env` and update `DATABASE_URL`
- [ ] Run `pnpm install`
- [ ] Verify setup: `./verify-setup.ps1` (Windows) or `bash verify-setup.sh` (Mac/Linux)
- [ ] Start backend: `pnpm --filter api-server dev`
- [ ] Start app: `pnpm --filter @workspace/discharge-buddy exec expo start`
- [ ] Scan QR code with Expo Go
- [ ] Test login with demo account
- [ ] Read documentation for deeper understanding

---

## 🎯 Next Steps

1. **Setup Google OAuth**: Follow [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
2. **Understand Flows**: Read [AUTH_FLOW_AND_RBAC.md](./AUTH_FLOW_AND_RBAC.md)
3. **Build Features**: Use backend/frontend APIs
4. **Test**: Use Expo Go for quick iteration
5. **Deploy**: Follow deployment section

---

**Questions?** Check the documentation index or run `./verify-setup.ps1` to diagnose issues.

**Last Updated**: June 6, 2026  
**Maintained By**: Discharge Buddy Team
