import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dns from "dns";

// This environment's IPv6 route to Gmail is unreachable and stalls SMTP
// connections until they time out. Prefer IPv4 so failures (or successes)
// resolve quickly instead of hanging.
dns.setDefaultResultOrder("ipv4first");
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: Number(process.env.SMTP_PORT || 587),
//   secure: false,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });
export enum CommonEmailType {
  RESIGNATION_APPROVED = "RESIGNATION_APPROVED",
  RESIGNATION_REJECTED = "RESIGNATION_REJECTED", // ✅ ADD THIS
  CLEARANCE_COMPLETED = "CLEARANCE_COMPLETED",
  SHIFT_ASSIGNED = "SHIFT_ASSIGNED",
  ATTENDANCE_REQUEST = "ATTENDANCE_REQUEST",
  LEAVE_APPROVED = "LEAVE_APPROVED",
  LEAVE_REJECTED = "LEAVE_REJECTED",
  PAYSLIP_GENERATED = "PAYSLIP_GENERATED",
  GENERAL_NOTIFICATION = "GENERAL_NOTIFICATION",
}

interface CommonEmailPayload {
  type: CommonEmailType;
  to: string;
  name: string;
  data?: any;
}

export async function sendCommonEmail(payload: CommonEmailPayload) {
  const { subject, html } = getCommonTemplate(payload);

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: payload.to,
    subject,
    html,
  });
}

function getCommonTemplate({
  type,
  name,
  data,
}: {
  type: CommonEmailType;
  name: string;
  data?: any;
}) {
  switch (type) {
    case CommonEmailType.RESIGNATION_APPROVED:
      return {
        subject: "Resignation Approved — ThinkPro LMS",
        html: wrapper(`
          <p>Hi <b>${name}</b>,</p>
          <p>Your resignation request has been <b>approved</b>.</p>
          <p>Please complete the clearance process.</p>
        `),
      };

    case CommonEmailType.CLEARANCE_COMPLETED:
      return {
        subject: "Final Clearance Completed",
        html: wrapper(`
          <p>Hi <b>${name}</b>,</p>
          <p>Your final clearance has been completed successfully.</p>
          <p>We wish you all the best for your future 🙌</p>
        `),
      };

    case CommonEmailType.SHIFT_ASSIGNED:
      const isUpdated = data?.updated === true;

      return {
        subject: isUpdated ? "Shift Updated" : "New Shift Assigned",
        html: wrapper(`
      <p>Hi <b>${name}</b>,</p>

      <p>
        Your shift has been 
        <b>${isUpdated ? "updated" : "assigned"}</b>.
      </p>

      <p>
        <b>Shift:</b> ${data?.shift}<br/>
        <b>Date:</b> ${data?.date}
      </p>
    `),
      };

    case CommonEmailType.ATTENDANCE_REQUEST:
      const isApproved = data?.status === "APPROVED";

      return {
        subject: isApproved
          ? "Attendance Request Approved"
          : "Attendance Request Rejected",

        html: wrapper(`
      <p>Hi <b>${name}</b>,</p>

      <p>
        Your attendance request has been
        <b>${isApproved ? " approved" : " rejected"}</b>.
      </p>

      ${data?.adminRemark ? `<p><b>Remark:</b> ${data.adminRemark}</p>` : ""}
    `),
      };

    case CommonEmailType.LEAVE_APPROVED:
      return {
        subject: "Leave Approved",
        html: wrapper(`
          <p>Hi <b>${name}</b>,</p>
          <p>Your leave request has been approved.</p>
        `),
      };

    case CommonEmailType.LEAVE_REJECTED:
      return {
        subject: "Leave Rejected",
        html: wrapper(`
          <p>Hi <b>${name}</b>,</p>
          <p>Your leave request has been rejected.</p>
        `),
      };

    case CommonEmailType.PAYSLIP_GENERATED:
      return {
        subject: "Payslip Generated",
        html: wrapper(`
      <p>Hi <b>${name}</b>,</p>
      <p>Your payslip for <b>${data?.month}</b> has been generated.</p>

      <p>
        👉 <a href="${data?.downloadUrl}" target="_blank">
          Download Payslip
        </a>
      </p>

      <p>Thanks,<br/>HR Team</p>
    `),
      };

    case CommonEmailType.GENERAL_NOTIFICATION:
      return {
        subject: data?.subject || "Notification — ThinkPro LMS",
        html: wrapper(`
          <p>Hi <b>${name}</b>,</p>
          <p>${data?.message}</p>
        `),
      };
    case CommonEmailType.RESIGNATION_REJECTED:
      return {
        subject: "Resignation Rejected — ThinkPro LMS",
        html: wrapper(`
      <p>Hi <b>${name}</b>,</p>
      <p>Your resignation request has been <b>rejected</b>.</p>
      <p>If you have any questions, please contact HR.</p>
    `),
      };

    default:
      throw new Error("Invalid email type");
  }
}
function wrapper(content: string) {
  return `
    <div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
      <h2 style="color:#0066ff">ThinkPro LMS</h2>
      ${content}
      <hr/>
      <p style="font-size:12px;color:#777">
        This is an automated email. Please do not reply.
      </p>
    </div>
  `;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"HRMS" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};
export async function sendSetupEmail({
  to,
  name,
  token,
  role = "Administrator",
}: {
  to: string;
  name: string;
  token: string;
  role?: string;
}) {
  const link = `${process.env.APP_BASE_URL}/setup/${token}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .content { background-color: white; padding: 20px; border-radius: 5px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background-color: #0066ff; 
          color: #ffffff !important; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 15px;
          font-weight: bold;
          font-size: 16px;
          border: 2px solid #0052cc;
        }
        .button:hover {
          background-color: #0052cc;
        }
        .footer { margin-top: 20px; font-size: 12px; color: #666666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; color: #0066ff;">ThinkPro LMS ${role} Invitation</h2>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>You have been invited to join the ThinkPro LMS as a ${role}. We're excited to have you on board!</p>
          <p>To get started, please set up your password and activate your account by clicking the button below:</p>
          <a href="${link}" style="color: #ffffff; text-decoration: none;">
            <div class="button">Set Up Account</div>
          </a>
          <p style="margin-top: 20px; font-size: 13px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="font-size: 13px; color: #666666;">${link}</p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>If you did not expect this invitation, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: `ThinkPro LMS — ${role} Invitation`,
    html,
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  newPassword,
}: {
  to: string;
  name: string;
  newPassword: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .content { background-color: white; padding: 20px; border-radius: 5px; }
        .password-box { 
          background-color: #f8f9fa; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0;
          border-left: 4px solid #0066ff;
          font-family: monospace;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          color: #0066ff;
        }
        .warning { 
          background-color: #fff3cd; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0;
          border-left: 4px solid #ffc107;
          color: #856404;
        }
        .footer { margin-top: 20px; font-size: 12px; color: #666666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; color: #0066ff;">ThinkPro LMS — Password Reset Notification</h2>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your password has been reset by a SuperAdmin. Please use the following new password to log in:</p>
          <div class="password-box">
            ${newPassword}
          </div>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> For your security, please change this password immediately after logging in.
          </div>
          <p>You can log in at: <a href="${process.env.APP_BASE_URL || 'https://thinkpro.com'}/login">${process.env.APP_BASE_URL || 'https://thinkpro.com'}/login</a></p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>If you did not request this password reset, please contact your administrator immediately.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: `ThinkPro LMS — Password Reset Notification`,
    html,
  });
}

export async function sendForgotPasswordEmail({
  to,
  name,
  token,
}: {
  to: string;
  name: string;
  token: string;
}) {
  const link = `${process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .content { background-color: white; padding: 20px; border-radius: 5px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background-color: #0066ff; 
          color: #ffffff !important; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 15px;
          font-weight: bold;
          font-size: 16px;
          border: 2px solid #0052cc;
        }
        .button:hover {
          background-color: #0052cc;
        }
        .warning { 
          background-color: #fff3cd; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0;
          border-left: 4px solid #ffc107;
          color: #856404;
        }
        .footer { margin-top: 20px; font-size: 12px; color: #666666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; color: #0066ff;">ThinkPro LMS — Password Reset Request</h2>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>We received a request to reset your password for your ThinkPro LMS account.</p>
          <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
          <a href="${link}" style="color: #ffffff; text-decoration: none;">
            <div class="button">Reset Password</div>
          </a>
          <p style="margin-top: 20px; font-size: 13px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="font-size: 13px; color: #666666; word-break: break-all;">${link}</p>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you did not request this password reset, please ignore this email. Your password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>This link will expire in 1 hour for security reasons.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: `ThinkPro LMS — Password Reset Request`,
    html,
  });
}

//Email and Password Email
export async function sendUserCredentialsEmail({
  to,
  name,
  password,
  role,
  employeeId,
}: {
  to: string;
  name: string;
  password: string;
  role: string;
  employeeId:string;
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto">
      <h2>Welcome to ThinkPro LMS 🎉</h2>

      <p>Hi <strong>${name}</strong>,</p>

      <p>Your account has been created with the role <b>${role}</b>.</p>

      <div style="background:#f8f9fa;padding:15px;border-radius:6px">
        <p><b>Email:</b> ${to}</p>
        <p><b>Password:</b> ${password}</p>
        <p><b>Employee Id:</b> ${employeeId}</p>
      </div>

      <p>Please login and change your password after first login.</p>

      <p>
        Login here:
        <a href="${process.env.APP_BASE_URL}/login">
          ${process.env.APP_BASE_URL}/login
        </a>
      </p>

      <br/>
      <p>— ThinkPro LMS Team</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: "Your ThinkPro LMS Account Credentials",
    html,
  });
}
export async function sendLetterEmail({
  to,
  name,
  letterType,
  message,
  filePath,
  originalName,
}: {
  to: string;
  name: string;
  letterType: string;
  message?: string;
  filePath: string;
  originalName: string;
}) {
  const absolutePath = path.join(process.cwd(), filePath);

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background:#f5f6fa; padding:20px">
      <div style="max-width:600px;margin:auto;background:#fff;padding:20px;border-radius:8px">
        
        <h2 style="color:#0066ff;margin-bottom:10px">
          ThinkPro LMS — ${letterType}
        </h2>

        <p>Hi <strong>${name}</strong>,</p>

        <p>
          A new <strong>${letterType}</strong> has been issued to you.
          Please find the attached PDF letter in this email.
        </p>

        ${
          message
            ? `<div style="background:#f8f9fa;padding:12px;border-left:4px solid #0066ff;margin:15px 0">
                <strong>Message from HR:</strong><br/>
                ${message}
              </div>`
            : ""
        }

        <p>
          You can download the attached letter and keep it for your records.
        </p>

        <p style="margin-top:30px">
          Regards,<br/>
          <strong>ThinkPro LMS Team</strong>
        </p>

        <p style="font-size:12px;color:#777;margin-top:20px">
          This is an automated email. Please do not reply.
        </p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: `ThinkPro LMS — ${letterType}`,
    html,
    attachments: [
      {
        filename: originalName || "Letter.pdf",
        content: fs.createReadStream(absolutePath),
        contentType: "application/pdf",
      },
    ],
  });
}
