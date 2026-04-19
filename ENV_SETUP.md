# Environment Setup Guide

This project requires environment variables to connect to the database, secure authentication, and communicate with the API.

## 🚀 Getting Started

To get your local environment ready, follow these steps:

### 1. Root Configuration
Copy the root example template and configure your database:
```bash
cp .env.example .env
```
Fill in your `DATABASE_URL` (e.g., `postgresql://user:password@localhost:5432/discharge_buddy`).

### 2. Backend Config (`api-server`)
```bash
cd artifacts/api-server
cp .env.example .env
```
Key variables:
- `JWT_SECRET`: Any random long string for session security.
- `GOOGLE_CLIENT_ID`: Obtain from Google Cloud Console for OAuth.
- `DATABASE_URL`: Typically same as the root one.

### 3. Mobile App Config (`discharge-buddy`)
```bash
cd artifacts/discharge-buddy
cp .env.example .env
```
- For **Simulator**: Use `http://localhost:3000`.
- For **Physical Device**: Use your computer's local network IP (e.g., `http://192.168.0.101:3000`).

---

## 🔐 Security Policy

- **NEVER** commit `.env` files to Git. 
- All sensitive variables are ignored via `.gitignore`.
- Always update `.env.example` if you add a new variable to the project.

---

## ⚙️ Variable Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret key for signing AUTH tokens | `super_secret_dev_jwt_key` |
| `PORT` | The port the backend listens on | `3000` |
| `EXPO_PUBLIC_API_URL` | The URL used by the mobile app to reach the backend | `http://localhost:3000` |
