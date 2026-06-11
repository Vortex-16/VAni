# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains DischargeBuddy — a post-hospital-discharge mobile assistant app.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) with Expo Router

## DischargeBuddy Mobile App

Located at `artifacts/discharge-buddy/`. A comprehensive post-hospital-discharge assistant.

### Features
- **Onboarding**: 3-slide onboarding with illustrations
- **Role-Based Access**: Patient and Caregiver roles with different experiences
- **Home Dashboard**: Adherence ring, today's doses, risk banner, quick actions
- **Medicine Schedule**: Time-slotted view (Morning/Afternoon/Evening/Night), dose marking
- **Prescription Scanner**: Camera/gallery upload, OCR simulation, medicine extraction
- **Symptom Logger**: Common symptom chips with danger detection, severity scale, risk assessment
- **Follow-up Calendar**: Track doctor visits and tests with urgency indicators
- **Emergency Screen**: One-tap SOS alert, danger signs list, emergency contacts
- **AI Chat Assistant**: Health Q&A with contextual responses
- **Caregiver Dashboard**: Patient monitoring, adherence tracking, activity timeline

### Architecture
- State: React Context (AppContext) + AsyncStorage for persistence
- Colors: Teal/sky theme in `constants/colors.ts` with full dark mode support
- Navigation: Expo Router file-based routing with tab layout
- Icons: @expo/vector-icons (Feather)
- Storage: AsyncStorage (local persistence, no backend needed)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/discharge-buddy run dev` — run Expo app

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
