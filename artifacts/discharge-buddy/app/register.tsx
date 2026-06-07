import { Redirect } from 'expo-router';

// Registration has been unified into the login.tsx file via Google OAuth.
// We redirect any lingering navigation to /register straight to /login.
export default function RegisterRedirect() {
  return <Redirect href="/login" />;
}
