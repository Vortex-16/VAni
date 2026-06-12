import nodemailer from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@dischargebuddy.com";

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    logger.info({ host: SMTP_HOST, port: SMTP_PORT }, "SMTP email transporter initialized successfully");
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize SMTP email transporter");
  }
} else {
  logger.info("SMTP credentials not fully configured. Email verification codes will be logged to the console.");
}

export { transporter };

/**
 * Send email verification code.
 *
 * @param to - Recipient email address
 * @param code - 6-digit OTP code
 * @param name - Recipient name
 */
export async function sendVerificationEmail(to: string, code: string, name: string): Promise<boolean> {
  const subject = "Verify your email - VAni";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 8px;">
      <h2 style="color: #7C3AED; text-align: center;">Welcome to VAni!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with VAni. To complete your sign-up and secure your account, please verify your email address using the 6-digit code below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7C3AED; background-color: #F5F3FF; padding: 10px 20px; border-radius: 8px; border: 1px dashed #7C3AED;">
          ${code}
        </span>
      </div>
      <p style="color: #64748b; font-size: 14px;">This code will expire in 15 minutes. If you did not request this code, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">VAni Team</p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html: htmlContent,
      });
      logger.info({ to }, "Verification email sent successfully");
      return true;
    } catch (error) {
      logger.error({ err: error, to }, "Failed to send verification email via SMTP");
      // Fallback to console print on error
    }
  }

  // Formatting code to make it extremely visible in the console
  const separator = "=".repeat(60);
  console.log(`
${separator}
✉️  EMAIL VERIFICATION CODE FOR: ${to} (${name})
${separator}
👉 CODE: ${code}
👉 EXPIRES IN: 15 minutes
${separator}
  `);

  return true;
}
