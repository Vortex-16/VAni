# Role-Based Onboarding & Patient-Linking — System Architecture

**Status:** Design proposal (not yet implemented)
**Author:** Engineering
**Date:** 2026-06-06
**Related:** [AUTH_FLOW_AND_RBAC.md](./AUTH_FLOW_AND_RBAC.md), [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)

---

## 1. Goals

This document specifies the target design for three connected pieces of work:

1. **Role selection on Google sign-in.** When a *brand-new* user signs in with Google, show a nicely animated, on-brand pop-up that asks whether they are registering as a **Patient**, **Family** member, or **Caregiver**. No OTP is required for Google sign-in (Google already verifies the email).
2. **A soft "professional" heuristic.** If the user's email domain looks like a medical/clinical organisation (e.g. `@*.hospital`, `@nurse.*`, an allow-listed clinic domain), the pop-up *pre-selects* Caregiver as a convenience and light security signal — but the user can always override it. This is intentionally a *suggestion*, not a gate, because we have very little caregiver data today.
3. **A unique patient code for linking.** Every patient gets a unique, shareable code. When a Family member or Caregiver enters that code, the patient is linked to them and appears on their dashboard. This is the secure, deterministic way to connect accounts (replacing the current "guess by email" approach).

### Non-goals (for this phase)
- Hard verification of medical licenses (we collect `licenseNumber` but do not validate it against any registry).
- Multi-organisation / hospital tenancy.
- Real-time websockets for dashboards (existing polling stays).

---

## 2. Current System (as-built)

### 2.1 Data model (`lib/db/src/schema/index.ts`)

```
users
  id              uuid pk
  name            text
  email           text unique
  role            enum(patient | caregiver | family)   -- nullable today
  linkedPatientId uuid        -- the user's OWN patient profile (patient/caregiver)
  isEmailVerified boolean
  emailVerificationCode / Expires
  password        text        -- nullable (OAuth users have none)
  ...

patients
  id            uuid pk
  caregiverId   uuid -> users.id   -- "who manages this patient" (OVERLOADED)
  name, age, condition, dischargeDate, emergencyContact
  ...
```

### 2.2 How roles & linking work today

| Concern | Current behaviour | File |
|---|---|---|
| Role on Google sign-in | Taken silently from the login-screen chip; default `patient` | `login.tsx:293`, `auth.ts:116` |
| OTP for Google | Skipped — OAuth users created with `isEmailVerified: true` | `auth.ts:130` |
| Patient self-profile | `patient`/`caregiver` get a self `patients` row via `linkedPatientId`; `family` does not | `auth.ts:117-132` |
| Linking a managed patient | Set `patients.caregiverId = managerUserId`, matched by the patient's **email** | `familyController.ts:58-86`, `auth.ts:90-93` |

### 2.3 Problems this design fixes

1. **No explicit role choice on Google sign-in.** A new user becomes whatever chip happened to be selected (usually `patient`). There is no confirmation step.
2. **`patients.caregiverId` is single-valued and overloaded.** It is reused for both the `family` and `caregiver` roles, so a patient can be linked to **only one** manager. Your requirement (family *and* a professional caregiver both seeing the patient) is impossible without a change.
3. **Linking by email is fragile.** It requires the manager to know the patient's exact account email, the patient must already be a `patient`-role user (`familyController.ts:67`), and it silently *overwrites* any existing manager.
4. **`/login` does not check the password.** The handler at `auth.ts:256-297` reads only `email` and issues a JWT if the user exists and is verified — the `password` sent by the client is ignored. This is a security hole that must be closed as part of hardening auth.

---

## 3. Target Architecture

### 3.1 Role definitions (unchanged conceptually)

| Role | Has own patient profile | Manages other patients | Typical entry |
|---|:---:|:---:|---|
| **Patient** | ✅ (`linkedPatientId`) | ❌ | Self sign-up; shares their code |
| **Family** | ❌ | ✅ (via code) | Enters a patient's code |
| **Caregiver** | ✅ (optional self) | ✅ (via code, many) | Professional; enters patient codes |

### 3.2 New: many-to-many linking via a `care_links` table

Replace the single overloaded `patients.caregiverId` with an explicit membership table so a patient can be connected to multiple managers, each with a typed relationship and lifecycle.

```
care_links
  id           uuid pk
  patientId    uuid -> patients.id      not null
  managerId    uuid -> users.id         not null   -- the family/caregiver user
  relationship enum(family | caregiver) not null
  status       enum(active | revoked)   default 'active'
  createdAt    timestamp default now()
  unique(patientId, managerId)          -- one link per (patient, manager) pair
```

- `patients.caregiverId` is **kept for backward compatibility** during migration (see §7) but new reads go through `care_links`.
- Dashboards (`FamilyController.getMembers`, caregiver routes) change from `where patients.caregiverId = me` to a join on `care_links where managerId = me and status = 'active'`.

### 3.3 New: unique patient code

Add a shareable code to every patient profile.

```
patients
  + linkCode     varchar(12) unique     -- e.g. "DB-7G4K2P"
  + linkCodeIssuedAt timestamp
```

- **Format:** `DB-` prefix + 6 chars from an unambiguous alphabet (`ABCDEFGHJKMNPQRSTUVWXYZ23456789` — no `0/O/1/I/L`). ~30^6 ≈ 729M combinations.
- **Generated** with a CSPRNG when the patient profile is created (`crypto.randomBytes`), retried on the rare unique-collision.
- **Regenerable / revocable** by the patient (a "reset code" action) so a leaked code can be invalidated.
- Display in the patient app with a copy button and a QR code (a QR just encodes the same code string).

---

## 4. Flows

### 4.1 First-time Google sign-in with role pop-up

```
App: tap "Sign in with Google"
  → expo-auth-session returns accessToken (existing)
  → POST /api/auth/oauth { provider:'google', accessToken }      // NOTE: no role on first call
        │
        ▼
  Backend resolves email/name from Google (existing, auth.ts:30-44)
        │
   ┌────┴─────────────────────────────┐
   │ Existing user?                    │
   ├── YES → issue JWT, return {token,user}   (and verify email if needed)
   │
   └── NO  → return 200 {
                 needsRoleSelection: true,
                 pendingProfile: { email, name },
                 suggestedRole: 'caregiver' | 'patient'   // from domain heuristic §4.2
             }
        │
        ▼
  App shows animated RoleSelectModal (patient / family / caregiver),
  pre-highlighting suggestedRole.
        │
        ▼
  User picks role (+ optional code for family/caregiver, see §4.3)
  → POST /api/auth/oauth {
        provider:'google', accessToken,
        role, confirmRole:true,
        linkCode?            // if family/caregiver want to link immediately
    }
        │
        ▼
  Backend creates the user with the chosen role (isEmailVerified:true, no OTP),
  optionally creating a care_link from linkCode, then returns {token,user}.
```

Key point: the **backend decides "new vs existing"**, not the client. The role is only used on the *confirming* call. This removes the "silently became a patient" bug and means the access token is re-validated on the second call (it is short-lived but still valid within the same flow; if it has expired we return `needsReauth:true` and the app re-prompts Google).

### 4.2 Caregiver email-domain heuristic (soft)

A small, **config-driven** helper computes `suggestedRole`:

```ts
// auth heuristic — suggestion only, never an authorization decision
const CAREGIVER_DOMAIN_HINTS = (process.env.CAREGIVER_DOMAIN_HINTS ?? "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
// e.g. "hospital,clinic,health,nhs,nurse,med,care,apollo,fortis"

function suggestRole(email: string): "caregiver" | "patient" {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const looksClinical = CAREGIVER_DOMAIN_HINTS.some(h => domain.includes(h));
  return looksClinical ? "caregiver" : "patient";
}
```

- Lives in env (`CAREGIVER_DOMAIN_HINTS`) so it can be tuned without a deploy.
- **Never** grants caregiver privileges by itself — it only changes which chip is pre-highlighted. The user always confirms.
- Generic consumer domains (`gmail.com`, `outlook.com`, etc.) always suggest `patient`.

### 4.3 Linking a patient by code (Family / Caregiver)

Two entry points, same backend:

1. **At onboarding** — the role modal for family/caregiver shows an optional "Enter patient code" field.
2. **Later** — a "Link a patient" button on the family/caregiver dashboard.

```
Family/Caregiver enters code "DB-7G4K2P"
  → POST /api/links { linkCode }     (requireAuth)
        │
        ▼
  Backend:
    - find patient by linkCode  → 404 if unknown
    - rate-limit by user (§6)
    - upsert care_link(patientId, managerId=me, relationship=myRole, status='active')
    - return { patient: { id, name, condition, ... } }
        │
        ▼
  Patient now appears in GET /api/family/members (or caregiver list),
  which reads care_links.
```

Patient-side consent option (recommended, see §6): instead of instant linking, create the link as `status='pending'` and surface an in-app approval to the patient. For the first release we can ship **instant link** (knowledge of the code = permission) and add pending-approval in phase 2.

### 4.4 Distinguishing Family vs Patient — summary

- **Patient**: owns a `patients` row (`linkedPatientId`), has a `linkCode`, consumes care.
- **Family**: no self-patient; appears as `managerId` on one or more `care_links` with `relationship='family'`.
- **Caregiver**: may have a self-profile; appears as `managerId` on many `care_links` with `relationship='caregiver'`; sees an aggregated multi-patient dashboard.

---

## 5. API Changes

| Method | Endpoint | Change | Purpose |
|---|---|---|---|
| POST | `/api/auth/oauth` | **Modified** | First call (no `role`) returns `needsRoleSelection`; confirming call (`role`,`confirmRole`) creates the user. Accepts optional `linkCode`. |
| POST | `/api/links` | **New** | Link the authenticated family/caregiver to a patient by `linkCode`. |
| DELETE | `/api/links/:patientId` | **New** | Revoke a link (`status='revoked'`). |
| GET | `/api/family/members` | **Modified** | Read via `care_links` join instead of `patients.caregiverId`. |
| POST | `/api/patient/link-code/reset` | **New** | Patient regenerates their `linkCode`. |
| POST | `/api/auth/login` | **Fixed** | Verify the password (bcrypt) before issuing a JWT (closes the bug in §2.3.4). |

### Example: modified `/oauth` response (new user)

```json
{
  "needsRoleSelection": true,
  "pendingProfile": { "email": "asha@apollohospitals.com", "name": "Asha R" },
  "suggestedRole": "caregiver"
}
```

### Example: `POST /api/links`

```json
// request  (Authorization: Bearer <jwt>)
{ "linkCode": "DB-7G4K2P" }

// 200
{ "patient": { "id": "…", "name": "Ravi", "condition": "Post-op knee" } }
// 404 { "error": "INVALID_CODE" }
// 429 { "error": "TOO_MANY_ATTEMPTS" }
```

---

## 6. Security Considerations

1. **Code entropy & guessing.** ~729M codes; combined with per-user **rate limiting** (e.g. 5 link attempts / 15 min) brute force is impractical. Return a generic `INVALID_CODE` (don't reveal whether a code exists).
2. **Code is a bearer secret.** Anyone with the code can link. Mitigations: codes are **regenerable/revocable**; offer **patient approval** for links (phase 2); show the patient a list of who is linked, with one-tap revoke.
3. **Domain heuristic is advisory only.** Never use `suggestRole` for authorization. A self-declared `caregiver` gets caregiver *navigation*, not access to arbitrary patients — they still only see patients they are linked to via `care_links`.
4. **Authorization on every patient resource** must check `care_links` (active) OR `linkedPatientId`, replacing the current `patients.caregiverId == me` checks (`AUTH_FLOW_AND_RBAC.md` §"Backend Role Enforcement", `notificationService.ts`, `caregiver.ts`).
5. **Close the `/login` password hole** (§2.3.4) — hash with bcrypt on register, compare on login. OAuth-only accounts have `password = null` and must reject password login with a "use Google" message.
6. **OAuth token re-validation.** The confirming `/oauth` call re-verifies the Google access token server-side (existing `userinfo` fetch) so the role can't be confirmed without a valid Google session.

---

## 7. Data Migration Plan

Because `patients.caregiverId` already holds live links, migrate forward without data loss:

1. **Add** `care_links` table, `patients.linkCode`, `patients.linkCodeIssuedAt`, and the `link_relationship` / `link_status` enums (Drizzle migration).
2. **Backfill** `care_links` from existing data: for every `patients` row with a non-null `caregiverId`, insert `care_link(patientId, managerId=caregiverId, relationship = <that user's role>, status='active')`.
3. **Backfill** `linkCode` for all existing patients (generate one per row).
4. **Switch reads** (`familyController`, caregiver routes, notification service) to `care_links`.
5. **Stop writing** `patients.caregiverId`; keep the column read-compatible for one release, then drop it in a later migration.

A one-off script (sibling to `artifacts/api-server/backfill-doses.ts`) handles steps 2–3.

---

## 8. Frontend Work (matches existing purple/Rx design language)

1. **`RoleSelectModal`** — animated bottom-sheet / centre modal reusing the brand gradient (`#7C3AED`→`#5B21B6`), the three role chips already styled in `register.tsx:220-233`, Reanimated spring entrance, haptics. Pre-highlights `suggestedRole`. Shown when `/oauth` returns `needsRoleSelection`.
2. **Optional code field** inside the modal for family/caregiver, plus a standalone **"Link a patient"** sheet on their dashboards.
3. **Patient "My code" card** — shows `linkCode`, copy button, QR, and "Reset code".
4. **Linked-managers list** on the patient profile with revoke (phase 2 with approval).
5. Wire `executeGoogleOAuth` (`login.tsx:272`) to handle the two-step response instead of sending `role` up-front.

---

## 9. Phased Rollout

| Phase | Scope | Outcome |
|---|---|---|
| **1 — Onboarding UX** | Two-step `/oauth`, `RoleSelectModal`, domain heuristic, fix `/login` password | New Google users explicitly choose a role; no OTP; password login secured |
| **2 — Codes & links** | `care_links`, `linkCode`, `/api/links`, dashboard reads via join, migration/backfill | Family + caregiver can both link to a patient by code; multi-patient dashboards |
| **3 — Consent & hygiene** | Pending-approval links, revoke UI, rate limiting, QR | Patient controls who is linked |

---

## 10. Open Questions

1. **Instant link vs patient approval** for phase 1 — ship instant (code = consent) and add approval in phase 3? (Recommended.)
2. **Can a Caregiver also be a Patient** (own profile + manages others)? Schema supports it; confirm the product intent.
3. **Code format** — `DB-XXXXXX` vs a numeric 8-digit (easier to read aloud)? Trade-off: entropy vs say-ability.
4. **License validation** — out of scope now; keep collecting `licenseNumber` for future manual review?
```
