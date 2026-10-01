# Notifications — In-app, Email & WhatsApp

How automated notifications work, which document requirement each one comes
from, and how to switch WhatsApp on.

## Switching WhatsApp on (no code change needed)

1. In Meta Business Manager, create a WhatsApp Business account and an app with
   the WhatsApp product, and add your business phone number.
2. Create a **System User** and generate a permanent access token with the
   `whatsapp_business_messaging` permission.
3. Create and submit the message template(s) below, and wait for Meta to approve them.
4. Put the values in the backend `.env` (see `.env.example`):
   ```
   WHATSAPP_ACCESS_TOKEN=...
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_TEMPLATE_GENERIC=<approved generic template name>
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=<any random string>
   WHATSAPP_APP_SECRET=<Meta app secret>
   ```
5. Restart the backend. Every event in the table below now also goes out on WhatsApp.
6. Optional: in Meta App → WhatsApp → Configuration, set the webhook:
   - Callback URL: `https://<backend-domain>/api/v1/whatsapp/webhook`
   - Verify token: the value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Subscribe to the `messages` field.

   With the webhook set up, each message's delivery status is recorded. Anyone
   who replies **STOP** is opted out of WhatsApp automatically, and replying
   **START** opts them back in.

Until step 4 is done, WhatsApp is skipped silently. In-app notifications and
email keep working as before.

## Templates

Business-initiated WhatsApp messages must use a template that Meta has approved.

### Minimum: one generic template (category **Utility**)

Name it, for example, `account_update`, and set `WHATSAPP_TEMPLATE_GENERIC=account_update`.

```
Hello {{1}},

{{2}}

— {{3}}
```
| Variable | Contains |
|---|---|
| `{{1}}` | Recipient's name |
| `{{2}}` | The event message, e.g. *Your leave from 01 Oct 2026 to 03 Oct 2026 has been approved.* |
| `{{3}}` | Sender: the CA firm name, or for HRMS the business client's company name |

### Optional: one template per event

These give better approval odds and nicer wording. Set
`WHATSAPP_TEMPLATE_<EVENT>=<template name>`. The body variables must be in exactly this order:

| Env key suffix | Body variables `{{1}}…` | Suggested body |
|---|---|---|
| `COMPLIANCE_DEADLINE_REMINDER` | name, task, due date, due-in, firm | Hello {{1}}, this is a reminder that *{{2}}* is due {{4}} ({{3}}). Please share any pending documents with {{5}}. |
| `COMPLIANCE_TASK_COMPLETED` | name, task, firm | Hello {{1}}, your compliance task *{{2}}* has been completed by {{3}}. |
| `CRM_FOLLOWUP_REMINDER` | name, follow-up type, date, firm | Hello {{1}}, {{4}} has a {{2}} scheduled with you on {{3}}. |
| `CRM_CLIENT_CONVERTED` | name, firm | Hello {{1}}, thank you for choosing {{2}}. We will keep you updated on your compliance deadlines here. |
| `FINANCE_REPORT_SHARED` | name, firm, summary — **plus a DOCUMENT header** | Hello {{1}}, {{2}} has shared your personal finance report. {{3}} |
| `BUSINESS_CLIENT_INVITE` | name, company, firm, login email, login URL | Hello {{1}}, {{3}} has set up {{2}} on our platform. Log in at {{5}} with {{4}}; your password has been emailed to you. |
| `USER_ACCOUNT_CREATED` | name, organisation, login email, login URL | Hello {{1}}, your account for {{2}} is ready. Log in at {{4}} with {{3}}; your password has been emailed to you. |
| `HRMS_LEAVE_STATUS` | name, status, from date, to date, company | Hello {{1}}, your leave from {{3}} to {{4}} has been {{2}}. — {{5}} |
| `HRMS_LEAVE_APPLIED` | approver name, employee, from date, to date, company | Hello {{1}}, {{2}} has applied for leave from {{3}} to {{4}}. Please review it in HRMS. — {{5}} |
| `HRMS_ATTENDANCE_REQUEST_STATUS` | name, status, company | Hello {{1}}, your attendance request has been {{2}}. — {{3}} |
| `HRMS_SHIFT_ASSIGNED` | name, shift, date, company | Hello {{1}}, your shift on {{3}} is {{2}}. — {{4}} |
| `HRMS_PAYSLIP_GENERATED` | name, month, company | Hello {{1}}, your payslip for {{2}} is ready in HRMS. — {{3}} |
| `HRMS_RESIGNATION_STATUS` | name, status, company | Hello {{1}}, your resignation request has been {{2}}. — {{3}} |
| `HRMS_LETTER_ISSUED` | name, letter type, company | Hello {{1}}, a new {{2}} has been issued to you. Please check your email or HRMS. — {{3}} |
| `HRMS_REQUEST_STATUS` | name, request type, status, company | Hello {{1}}, your {{2}} request has been {{3}}. — {{4}} |

If an event has no template of its own, it falls back to the generic template.
Setting an event's key to `off` disables WhatsApp for that event only.

## Every notification, and where it comes from

Channels: **A** = in-app bell, **E** = email, **W** = WhatsApp.

### CA practice modules

| Event | Trigger | Recipient → channels | Requirement |
|---|---|---|---|
| Compliance deadline reminder | Scheduler: 7, 3 and 1 days before the due date, and on the due date (`COMPLIANCE_REMINDER_DAYS`) | Client (CRM lead) → E + W; client's portal admin → A; assigned staff → A + E | Module Scope §6.1 "Compliance deadline alerts to business client via WhatsApp/email"; §4 "Deadline reminders" |
| Compliance task overdue | Scheduler: the day after the due date, if the task is still open | Assigned staff → A + E | Module Scope §4 / §6.1 |
| Compliance task assigned | Task created, or reassigned to someone else | Assignee → A + E | §6.1 (new record) |
| Compliance task completed | Status changes to Done | Client → E + W; client's portal admin → A | §6.1 (status change) |
| CRM follow-up reminder | Scheduler: on the follow-up date | Lead/client → E + W; assigned staff → A + E | Module Scope §6.1 "CRM follow-up reminders to leads/clients via WhatsApp/email"; §3 |
| Lead assigned | Lead created for, or reassigned to, someone else | Assignee → A + E | §6.1 (new record); Role Matrix §4.2 |
| Lead converted to client | Status changes to Converted | Client → E + W (welcome) | §6.1 (status change); §3 client conversion |
| Finance report shared | "Send Report" button (Personal Finance Tracker, which replaced the Loan Calculator) | Client → E (PDF attached) + W (summary + PDF) | Module Scope §6.1 "Loan Calculator result sharing via WhatsApp"; §5 export/share PDF |
| CA firm admin account created | Super Admin onboards a firm | Firm admin → E (credentials) + W (no password) | Multi-Tenancy §4.1 |
| Self-serve firm signup | `/signup` | Firm admin → E + W (welcome) | User added |
| Staff account created | Firm admin adds staff | Staff → E (credentials) + W | User added |
| Business client admin invite | Business client onboarded, or upgraded to HRMS | Client admin → E (credentials) + W | Multi-Tenancy §4.2 "invites the Business Client Admin via email/WhatsApp" |

### HRMS (each business client's own employees)

All HRMS emails carry the **business client's company name** (`Company.name`),
not a fixed product name.

| Event | Trigger | Recipient → channels | Requirement |
|---|---|---|---|
| Leave approved / rejected | Admin or manager decides on a leave request | Employee → A + E + W | Module Scope §6.1 "HRMS leave status alerts to employee via WhatsApp/email" |
| New leave request | Employee applies for leave | Reporting manager, otherwise company admins/HR → A + E + W | Module Scope §2 leave workflow |
| Attendance request approved / rejected | Admin decides | Employee → A + E + W | §2 Attendance Requests; §6.1 |
| Shift assigned / updated | Single assignment, bulk assignment, or edit | Employee → A + E + W | §2 Shift Roster; §6.1 |
| Payslip generated | Payslip generation | Employee → A + E + W | §2 Payslip generation |
| Resignation approved / rejected | HR decides | Employee → A + E + W | §6.1 |
| Letter issued | HR sends a letter | Employee → E (PDF, always sent) + A + W | §2 documents |
| Travel / expense / leave encashment / overtime / profile update approved or rejected | Manager, HR or Finance decides | Employee → A + E + W | §2 Team Approvals, Payment Requests; §6.1 |
| Request paid | Finance marks an expense, travel or encashment request as paid | Employee → A + E + W | §2 Payment Requests (Finance) |
| Employee account created | Add User, or bulk upload | Employee → E (credentials) + A + W | User added |

## Rules applied to every notification

- **Opt-out per channel** (Module Scope §6.1). Each user sets this from the gear
  icon in the bell, in both CA and HRMS. Each lead or client has Email and
  WhatsApp checkboxes in the CRM lead form. Replying STOP on WhatsApp opts the
  number out platform-wide. Login credentials are always sent by email.
- **Licence lapse** (Multi-Tenancy §7). Once a CA firm is past its 7-day grace
  period, or is suspended, its automated email and WhatsApp notifications pause.
  HRMS notifications keep going, because business clients keep their HRMS access.
- **Quota** (Multi-Tenancy §5/§6). Every WhatsApp message is logged in
  `notificationlogs` against the paying CA firm (HRMS messages count against the
  parent CA firm).
  - Monthly included quotas per tier are set in Super Admin → Settings. They can
    be overridden per firm with `plan.whatsappQuota` through
    `PUT /api/v1/ca-firms/:id/subscription`.
  - Usage beyond the quota is not blocked. It is counted as overage at the
    configured per-message rate.
  - Super Admin → Settings shows usage per firm. A firm admin sees their own
    usage on the Subscription page.
  - The business client or employee is never billed.
- **Never blocking.** All delivery happens in the background. An email or
  WhatsApp failure never fails the action that triggered it; the failure is
  recorded in `notificationlogs`.
