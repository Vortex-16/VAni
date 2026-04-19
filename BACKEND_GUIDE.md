# 🛠️ Discharge-Buddy: Backend & Integration Guide

Welcome to the Discharge-Buddy backend documentation. This guide is designed to ensure a clean, scalable, and standardized architecture for our recovery companion platform.

---

## 🏗️ Architecture Overview

Our system follows a **Decoupled Monolith** pattern with a clear separation between the UI and the Data Engine.

### 🌐 System Map
`Mobile App (Expo)` ↔ `API Server (Express)` ↔ `Database (PostgreSQL via Drizzle)`

### 🔄 Standard Data Flow
To ensure stability, all new data features must follow this strict unidirectional flow:
1.  **Frontend**: Component calls a context method.
2.  **Frontend**: `ApiProvider` executes a `customFetch` to a specific route.
3.  **Backend**: `Route` parses the request.
4.  **Backend**: `Controller` validates input and handles the request/response lifecycle.
5.  **Backend**: `Service` executes business logic and interacts with the DB.
6.  **Database**: `Drizzle ORM` reads/writes data.

---

## 📁 Repository Structure

### ⬅️ Backend (`artifacts/api-server/src/`)
| Folder | Responsibility | Strict Rule |
| :--- | :--- | :--- |
| **`routes/`** | Define endpoints and link to controllers. | No business logic allowed here. |
| **`controllers/`** | Extract params, call services, send responses. | No direct DB queries. |
| **`services/`** | Core business logic, DB interactions. | Focus only on data and logic. |
| **`middlewares/`** | Auth, logging, and validation. | Must be reusable. |

### 💾 Database (`lib/db/src/`)
- **`schema/index.ts`**: The single source of truth for all tables.
- **`src/index.ts`**: Database connection and client export.

### ➡️ Frontend (`artifacts/discharge-buddy/`)
- **`context/`**: Central state management and API orchestration.
- **`context/ApiProvider.ts`**: The ONLY place where raw API calls should live.

---

## 🛠️ How to Add a New Feature (6-Step Roadmap)

Follow these steps exactly to add a new feature (e.g., "User Profile"):

### 1. Database Schema
Add the new table or column in:
`lib/db/src/schema/index.ts`
Run `pnpm db:push` to sync with your local DB.

### 2. Service Layer
Create a new service in:
`artifacts/api-server/src/services/profileService.ts`
Implement logic to fetch/update the user profile.

### 3. Controller Layer
Create a handler in:
`artifacts/api-server/src/controllers/profileController.ts`
Map the HTTP request to your service function.

### 4. Route Layer
Register the endpoint in:
`artifacts/api-server/src/routes/profile.ts`
Link it in the main `routes/index.ts`.

### 5. Frontend Provider
Add the method to the `IDataProvider` interface and implement it in:
`artifacts/discharge-buddy/context/ApiProvider.ts`
Use `customFetch` for the network call.

### 6. Frontend Context
Update `AppContext.tsx` to expose the new functionality to your React components.

---

## 🔐 Authentication Guidelines

- **Logic Location**: All authentication logic (JWT generation, Google OAuth) lives in `backend/src/routes/auth.ts`.
- **Interceptors**: The frontend uses `setAuthTokenGetter` in `AppContext.tsx` to automatically attach the JWT to every request stored in `AsyncStorage`.
- **Validation**: Use the `authenticateToken` middleware in backend routes to protect sensitive data.

---

## 🔄 Frontend ↔ Backend Sync Rules

### **Naming Standards**
- **JSON Keys**: Always use `camelCase` for responses.
- **DB Keys**: Always use `snake_case` for columns.
- **API URLs**: Prefixed with `/api/`, lowercase and kebab-case (e.g., `/api/user-settings`).

### **Response Format**
Every API response should ideally follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional feedback"
}
```

---

## 🧪 Testing Guidelines

1.  **Direct API Testing**: Use Postman or `curl` to test backend endpoints independently of the UI.
2.  **Mock Verification**: If you change the API, update `MockProvider.ts` in the frontend so the app doesn't crash in guest mode.
3.  **Sync Check**: Verify that your frontend `types.ts` matches the backend response structure.

---

## ⚠️ Common Mistakes to Avoid

> [!CAUTION]
> **NO DB QUERIES IN FRONTEND**: Never attempt to use Drizzle or direct SQL in the mobile app.
> **LOGIC IN ROUTES**: Do not write `db.select()...` directly inside a route file; move it to a service.
> **BROKEN MOCKS**: Forgetting to update `MockProvider.ts` after adding a new API method will cause development errors for other team members.
