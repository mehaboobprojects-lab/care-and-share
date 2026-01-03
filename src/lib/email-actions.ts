"use server"

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail(email: string, firstName: string) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set. Skipping email notification.");
        return { success: false, error: "API Key missing" };
    }

    try {
        const { data, error } = await resend.emails.send({
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
        });

        if (error) {
            console.error("Failed to send email:", error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Email sending error:", error);
        return { success: false, error };
    }
}
