export function credentialsWelcomeEmail({ platformName, firmName, recipientName, email, password, loginUrl }) {
  const subject = `Your ${platformName} login for ${firmName}`;
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #111827;">Welcome to ${platformName}</h2>
      <p>Hi ${recipientName},</p>
      <p>
        You've been added to <strong>${firmName}</strong> on ${platformName}. Use the credentials below to log in
        and get started.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px 14px; background: #f3f4f6; border-radius: 8px 8px 0 0; font-size: 13px; color: #6b7280;">Email</td>
        </tr>
        <tr>
          <td style="padding: 4px 14px 14px; background: #f3f4f6; font-weight: 600; font-size: 15px;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; background: #f3f4f6; font-size: 13px; color: #6b7280;">Password</td>
        </tr>
        <tr>
          <td style="padding: 4px 14px 14px; background: #f3f4f6; border-radius: 0 0 8px 8px; font-weight: 600; font-size: 15px; font-family: monospace;">${password}</td>
        </tr>
      </table>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${loginUrl}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">
          Log in to ${platformName}
        </a>
      </p>
      <p style="font-size: 13px; color: #6b7280;">
        For security, please change this password as soon as you log in. If you weren't expecting this email,
        you can ignore it.
      </p>
    </div>
  `;
  return { subject, html };
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shared layout for every event notification the engine (utils/notify.ts) sends
// by email — compliance deadlines, CRM follow-ups, report shares, etc. All
// dynamic values are escaped here; callers pass plain text.
export function notificationEmail({
  brandName,
  recipientName,
  heading,
  intro,
  details = [],
  ctaLabel,
  ctaUrl,
  footer,
}: {
  brandName: string;
  recipientName?: string | null;
  heading: string;
  intro: string;
  details?: [string, string][];
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}) {
  const rows = details
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 8px 14px; background: #f3f4f6; font-size: 13px; color: #6b7280; width: 40%;">${escapeHtml(label)}</td>
          <td style="padding: 8px 14px; background: #f3f4f6; font-size: 14px; font-weight: 600;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #1f2937;">
      <p style="font-size: 13px; color: #6b7280; margin: 0 0 4px;">${escapeHtml(brandName)}</p>
      <h2 style="color: #111827; margin: 0 0 16px;">${escapeHtml(heading)}</h2>
      ${recipientName ? `<p>Hi ${escapeHtml(recipientName)},</p>` : ""}
      <p>${escapeHtml(intro)}</p>
      ${rows ? `<table style="width: 100%; border-collapse: separate; border-spacing: 0 2px; margin: 16px 0;">${rows}</table>` : ""}
      ${
        ctaLabel && ctaUrl
          ? `<p style="text-align: center; margin: 24px 0;">
              <a href="${escapeHtml(ctaUrl)}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">${escapeHtml(ctaLabel)}</a>
            </p>`
          : ""
      }
      <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
        ${escapeHtml(footer || "This is an automated message — please do not reply to this email.")}
      </p>
    </div>
  `;
}
