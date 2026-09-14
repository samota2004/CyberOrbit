import nodemailer from "nodemailer";

const smtpPort = Number(
  process.env.SMTP_PORT || 587
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function validateSmtpConfig() {
  const requiredVariables = [
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM"
  ];

  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing SMTP configuration: ${missingVariables.join(", ")}`
    );
  }
}

export async function sendOtpEmail({
  to,
  name,
  otp,
  expiryMinutes = 5
}) {
  validateSmtpConfig();

  await transporter.sendMail({
    from: `"CyberOrbit Security" <${process.env.SMTP_FROM}>`,
    to,
    subject: "CyberOrbit Login Verification Code",

    text: `Hello ${name || "Admin"},

Your CyberOrbit verification code is: ${otp}

This code will expire in ${expiryMinutes} minutes.

If you did not request this code, please ignore this email.

CyberOrbit Security Team`,

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>CyberOrbit Login Verification</h2>

        <p>Hello ${name || "Admin"},</p>

        <p>Your verification code is:</p>

        <h1 style="letter-spacing: 8px;">
          ${otp}
        </h1>

        <p>
          This code will expire in
          <strong>${expiryMinutes} minutes</strong>.
        </p>

        <p>
          If you did not request this code, please ignore this email.
        </p>

        <hr />

        <small>CyberOrbit Security Team</small>
      </div>
    `
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetToken
}) {
  validateSmtpConfig();

  const appUrl =
    process.env.APP_URL ||
    "http://localhost:5173";

  const resetLink =
    `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await transporter.sendMail({
    from: `"CyberOrbit Security" <${process.env.SMTP_FROM}>`,
    to,
    subject: "CyberOrbit Password Reset",

    text: `Hello ${name || "Admin"},

A password reset was requested for your CyberOrbit account.

Reset your password using this link:
${resetLink}

This link will expire in 15 minutes.

If you did not request this, please ignore this email.

CyberOrbit Security Team`,

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>CyberOrbit Password Reset</h2>

        <p>Hello ${name || "Admin"},</p>

        <p>
          A password reset was requested for your CyberOrbit account.
        </p>

        <p>
          <a
            href="${resetLink}"
            style="
              background: #c9a44c;
              color: #111;
              padding: 12px 20px;
              text-decoration: none;
              display: inline-block;
              border-radius: 4px;
            "
          >
            Reset Password
          </a>
        </p>

        <p>
          This link will expire in
          <strong>15 minutes</strong>.
        </p>

        <p>
          If you did not request this, please ignore this email.
        </p>

        <hr />

        <small>CyberOrbit Security Team</small>
      </div>
    `
  });
}