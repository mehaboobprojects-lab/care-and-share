"use server"

import { Resend } from 'resend';

// Initialize Resend lazily to prevent crashes if the API key is missing during module evaluation
let resendInstance: Resend | null = null;

function getResend() {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export async function sendApprovalEmail(email: string, firstName: string) {
  const resend = getResend();

  if (!resend) {
    console.warn("RESEND_API_KEY is not set in environment variables. Email will not be sent.");
    return { success: false, error: "API Key missing" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  console.log("RESEND_API_KEY found, length:", apiKey?.length || 0);

  console.log(`Attempting to send approval email to: ${email}`);

  try {
    const payload = {
      from: 'Care and Share <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Care and Share Account has been Approved! 🎉',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h1 style="color: #0d9488; text-align: center;">Welcome to the Team, ${firstName}!</h1>
          <p>Hi ${firstName},</p>
          <p>We're thrilled to inform you that your registration with <strong>Care and Share</strong> has been approved by our administrators.</p>
          <p>You can now log in to your dashboard to start tracking your volunteer hours and participate in our upcoming programs.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://care-and-share-one.vercel.app/login" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Log In to Dashboard</a>
          </div>
          <p>If you have any questions or need assistance, feel free to reply to this email.</p>
          <p>Best regards,<br>The Care and Share Team</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">Serving the Community, One Sandwich at a Time.</p>
        </div>
      `,
    };

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error("Resend Error:", JSON.stringify(error, null, 2));
      return { success: false, error };
    }

    console.log("Email sent successfully:", data?.id);
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected Email Error:", error);
    return { success: false, error };
  }
}
