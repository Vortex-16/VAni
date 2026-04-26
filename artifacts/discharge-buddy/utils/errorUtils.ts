/**
 * Formats technical or raw backend errors into user-friendly messages.
 * Prevents showing raw SQL queries or HTTP status codes to users.
 */
export function getFriendlyErrorMessage(error: any, context: 'scan' | 'import' | 'auth' | 'general' = 'general'): string {
  if (!error) return "Something went wrong. Please try again.";

  const message = typeof error === 'string' ? error : (error.message || "");
  
  // 1. Database/Technical Errors (e.g., from your screenshot)
  if (message.includes("500") || message.includes("Failed query") || message.includes("params:")) {
    switch (context) {
      case 'scan': return "Our server is having trouble reading this QR. Please try again in a moment.";
      case 'import': return "We couldn't import this recovery plan. Please check your connection and try again.";
      case 'auth': return "Our authentication service is temporarily unavailable. Please try again later.";
      default: return "Our server encountered a temporary issue. Please try again shortly.";
    }
  }

  // 2. Auth Errors
  if (context === 'auth') {
    if (message.includes("invalid") || message.includes("unauthorized") || message.includes("credentials")) {
      return "Invalid email or password. Please try again.";
    }
    if (message.includes("exists")) {
      return "An account with this email already exists.";
    }
  }

  // 3. Scan/Import Specifics
  if (context === 'import' && message.includes("already been imported")) {
    return "This plan has already been added to your account.";
  }
  
  if (context === 'scan' && message.includes("Invalid QR")) {
    return "This doesn't look like a valid Discharge Buddy QR code.";
  }

  // 4. Cleanup raw "Error:" prefix if still present
  return message.replace(/^Error:\s*/i, "").trim() || "An unexpected error occurred.";
}
