# AUTH_UX_REFACTOR.md - VAni Auth UX Refactor (Phase 1)

This document serves as the architectural blueprint and refactoring plan to overhaul the authentication and onboarding experience.

## User Review Required

> [!WARNING]
> **Email Domain Validation Requirement**
> The requirements specify that Caregiver and Doctor accounts must use an email ending with `@doc.in`. I will implement this validation on the frontend and the backend to strictly enforce it.

> [!IMPORTANT]
> **GlareHover Component Integration**
> We will add the provided `<GlareHover />` open-source component to enhance the modern, glassmorphic aesthetic on the Auth screens (e.g., surrounding the Google Sign In button).

## Open Questions

> [!CAUTION]
> 1. Since we are removing the email/password sign-in entirely from the primary flow, should we remove the `email/password` registration options from the API as well, or keep them for legacy users/admin use?
> 2. Currently, the "Sign Up" flow expects the user to authenticate via Google first and then select their role. Do we want to persist any extra role-specific data (e.g. Hospital, Specialization) immediately after the Google Auth modal, or during a secondary onboarding step inside the app?

---

## 1. Existing Flow Analysis
Currently, the `login.tsx` and `register.tsx` screens expose multiple options: Role Selection (Patient, Family, Caregiver), Email/Password fields, Google Sign-In, and Guest/Demo login options. This creates cognitive overload. The user must decide their role *before* creating an account, which complicates the OAuth flow.

## 2. Current Screen Inventory
- `app/login.tsx`: Primary login, email/pwd form, role selection chips, Google OAuth.
- `app/register.tsx`: Primary registration, email/pwd form, conditional fields based on selected role.
- `components/RoleSelectModal.tsx`: Existing OAuth modal for first-time Google sign-ups.

## 3. Proposed Navigation Flow
- **Splash/Initial Screen:** Two main buttons: "Sign In" and "Sign Up".
- **Sign In Flow:** 
  - User taps "Sign In" -> Shows "Continue with Google" -> Backend resolves role from token -> Navigates to respective Dashboard (`/caregiver/dashboard`, `/(tabs)`, etc.). No role selection.
- **Sign Up Flow:**
  - User taps "Sign Up" -> Shows "Continue with Google" -> Backend registers user.
  - Triggers the `RoleSelectModal`.
  - User selects Role (Patient, Family, Caregiver, Doctor).
  - App collects necessary role-specific metadata.
  - Completes onboarding.

## 4. Proposed Screen Hierarchy
1. `app/auth/index.tsx` (or refactored `login.tsx`): The minimal "Sign In / Sign Up" entry screen.
2. `app/auth/role-onboarding.tsx` (new): A dedicated screen/modal for new signups to provide role-specific data after OAuth succeeds.

## 5. UI Redesign Plan
- **Aesthetic:** Premium, glassmorphic, soft shadows, purple + white.
- **Components:** Integrate `GlareHover` from React Bits for interactive hover effects on web (and wrap the Google button in it). Use `expo-blur` and `Moti` (or `Reanimated`) for fluid entry animations.
- **Simplification:** Remove the form fields and secondary buttons on the initial screen.

## 6. Validation Changes
- **Frontend Validation:** If user selects "Caregiver" or "Doctor", check that the Google-authenticated email ends with `@doc.in`. If not, show an elegant error message and block progression.
- **Backend Validation:** Update `api-server/src/routes/auth.ts` `POST /oauth` and `POST /register` to throw a `400 Bad Request` if the role is caregiver/doctor and email doesn't end with `@doc.in`.

## 7. Role Onboarding Flow
- **Patient:** Collect Phone Number (Name is from Google).
- **Family:** Collect Phone Number, Relationship Preference, Emergency Contact.
- **Caregiver:** Collect Phone Number, Hospital/Org, Designation.
- **Doctor:** Collect Phone Number, Hospital, Department, Registration Number, Specialization.

## 8. Backend Impact Analysis
- **`auth.ts`:** Needs minor updates to handle the new `doctor` role and strictly enforce the `@doc.in` email requirement for Caregivers/Doctors during OAuth role-confirmation.
- **Registration Endpoints:** Needs to accept new metadata fields (Hospital, Specialization, etc.) in the OAuth confirmation step.

## 9. Database Impact Analysis
- `lib/db/src/schema/index.ts`: Add `doctor` to `userRoleEnum`.
- Ensure we have fields or JSON columns in `users` or `patients`/`caregivers` tables to store the new onboarding metadata (e.g. Specialization, Registration Number).

## 10. Files Requiring Modification
- `app/login.tsx` (Convert to the minimal Sign In/Up entry)
- `app/register.tsx` (Deprecate or refactor into the role-onboarding step)
- `components/RoleSelectModal.tsx` (Add Doctor, add Caregiver/Doctor `@doc.in` checks)
- `components/GlareHover.tsx` (New - add the open source component)
- `lib/db/src/schema/index.ts` (Add doctor role)
- `artifacts/api-server/src/routes/auth.ts` (Add domain validation & doctor handling)

## 11. Files That Must Remain Untouched
- Core JWT utility logic.
- Drizzle ORM configuration.
- Any other API endpoints outside of auth.
- Existing Session Context providers (`AppContext.tsx`), except for minor UI state logic.

## 12. Testing Checklist
- [ ] Verify "Sign In" with existing Patient account redirects to `/(tabs)`.
- [ ] Verify "Sign In" with existing Caregiver account redirects to `/caregiver/dashboard`.
- [ ] Verify "Sign Up" triggers Google Auth, then shows Role Modal.
- [ ] Verify Caregiver/Doctor Sign Up fails elegantly if email is not `@doc.in`.
- [ ] Verify Patient Sign Up completes with minimal fields.
- [ ] Verify the `GlareHover` component renders correctly.

## 13. Regression Prevention Checklist
- [ ] Ensure existing tokens are not invalidated.
- [ ] Do not remove the `password` field from the DB schema (preserves existing accounts).
- [ ] Test the fallback for mobile (Expo Go) vs Web OAuth to ensure `maybeCompleteAuthSession()` is unaffected.
