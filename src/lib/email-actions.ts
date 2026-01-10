"use server"

import nodemailer from 'nodemailer';

// Initialize Nodemailer transporter lazily to prevent crashes if environment variables are missing
let transporterInstance: nodemailer.Transporter | null = null;

function getTransporter() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_PASS?.replace(/\s+/g, '');

  if (!transporterInstance && user && pass) {
    console.log(`Initializing transporter. User: ${user}, Pass length: ${pass.length}`);
    transporterInstance = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: user,
        pass: pass,
      },
    });
  }

  if (!transporterInstance) {
    const keys = Object.keys(process.env).filter(k => k.includes('GMAIL'));
    console.log("Debugging Environment Variables - Found GMAIL related keys:", keys);
  }

  return transporterInstance;
}

export async function sendApprovalEmail(email: string, firstName: string) {
  const transporter = getTransporter();

  if (!transporter) {
    const user = process.env.GMAIL_USER?.trim();
    const pass = process.env.GMAIL_PASS?.replace(/\s+/g, '');
    let errorMsg = "Email configuration missing: ";
    if (!user) errorMsg += "GMAIL_USER is NOT set. ";
    if (!pass) errorMsg += "GMAIL_PASS is NOT set. ";

    console.warn(errorMsg);
    return { success: false, error: errorMsg };
  }

  console.log(`Attempting to send Gmail approval email from ${process.env.GMAIL_USER} to: ${email}`);

  try {
    const mailOptions = {
      from: `"Care and Share" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your Care and Share Account has been Approved! 🎉',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h1 style="color: #0d9488; text-align: center;">Welcome to the Team, ${firstName}!</h1>
          <p>Hi ${firstName},</p>
          <p>We're thrilled to inform you that your registration with <strong>Care and Share</strong> has been approved by our administrators.</p>
          <p>You can now log in to your dashboard to start tracking your volunteer hours and participate in our upcoming programs.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://care-and-share.vercel.app/login" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Log In to Dashboard</a>
          </div>
          <p>If you have any questions or need assistance, feel free to reply to this email.</p>
          <p>Best regards,<br>The Care and Share Team</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">Serving the Community, One Sandwich at a Time.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Gmail sent successfully:", info.messageId);
    return { success: true, data: { id: info.messageId } };
  } catch (error: any) {
    console.error("Nodemailer Error:", error);
    return { success: false, error: error.message || "Failed to send email via Gmail" };
  }
}

export async function sendPendingEmail(email: string, firstName: string) {
  const transporter = getTransporter();

  if (!transporter) {
    const user = process.env.GMAIL_USER?.trim();
    const pass = process.env.GMAIL_PASS?.replace(/\s+/g, '');
    let errorMsg = "Email configuration missing: ";
    if (!user) errorMsg += "GMAIL_USER is NOT set. ";
    if (!pass) errorMsg += "GMAIL_PASS is NOT set. ";

    console.warn(errorMsg);
    return { success: false, error: errorMsg };
  }

  console.log(`Attempting to send Gmail pending email from ${process.env.GMAIL_USER} to: ${email}`);

  try {
    const mailOptions = {
      from: `"Care and Share" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Registration Received - Care and Share',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h1 style="color: #0d9488; text-align: center;">Registration Received</h1>
          <p>Hi ${firstName},</p>
          <p>Thank you for registering with <strong>Care and Share</strong>. We have received your request to join our team of volunteers.</p>
          <p>Your account is currently <strong>pending approval</strong>. Our administrators review all new registrations to ensure the safety and security of our community.</p>
          <p>You will receive another email once your account has been approved and activated.</p>
          <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #115e59; font-size: 14px;"><strong>Note:</strong> You won't be able to log in to the dashboard until your account is approved.</p>
          </div>
          <p>Thank you for your patience and your willingness to serve!</p>
          <p>Best regards,<br>The Care and Share Team</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">Serving the Community, One Sandwich at a Time.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Gmail (pending) sent successfully:", info.messageId);
    return { success: true, data: { id: info.messageId } };
  } catch (error: any) {
    console.error("Nodemailer Error:", error);
    return { success: false, error: error.message || "Failed to send email via Gmail" };
  }
}
