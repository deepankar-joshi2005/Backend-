import cron from "node-cron";
import ComplianceTask from "../models/ComplianceTask";
import Lead from "../models/Lead";
import { sendComplianceDeadlineReminder, sendCrmFollowUpReminder } from "../utils/notificationEvents";

// Scheduled (deadline/date-driven) notifications — Module Scope doc, Section 6.1:
//  - "Compliance deadline alerts to business client via WhatsApp/email — auto-sent
//     based on Compliance Tool due dates"
//  - "CRM follow-up reminders to leads/clients via WhatsApp/email — auto-sent
//     based on CRM follow-up task due dates"
//
// Runs hourly during the working day (IST) rather than once a day so that a
// task/follow-up created later in the day still gets its same-day reminder, and
// so a restart/sleep of the server never skips a whole day. Each reminder is
// claimed atomically in the DB before sending (remindersSent /
// followUpReminderSentFor), so re-runs — or several server instances — never
// send the same reminder twice.
//
// Env:
//   NOTIFICATION_JOBS_ENABLED   "false" to switch the scheduler off (default on)
//   NOTIFICATION_CRON           cron expression, IST (default "0 9-20 * * *")
//   COMPLIANCE_REMINDER_DAYS    days-before-due to remind on (default "7,3,1,0")

const TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" of a moment, as a calendar day in IST.
export function istDayKey(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// UTC instant at which an IST calendar day ("YYYY-MM-DD") starts.
function istDayStart(dayKey: string) {
  return new Date(new Date(`${dayKey}T00:00:00.000Z`).getTime() - IST_OFFSET_MS);
}

export function daysBetween(fromKey: string, toKey: string) {
  return Math.round((new Date(`${toKey}T00:00:00Z`).getTime() - new Date(`${fromKey}T00:00:00Z`).getTime()) / DAY_MS);
}

function reminderOffsets() {
  const raw = process.env.COMPLIANCE_REMINDER_DAYS || "7,3,1,0";
  const offsets = raw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v >= 0);
  return offsets.length ? Array.from(new Set(offsets)) : [7, 3, 1, 0];
}

const OVERDUE_ALERT_DAYS = -1; // staff-only alert the day after a missed due date

export async function runComplianceDeadlineReminders(now = new Date()) {
  const todayKey = istDayKey(now);
  const offsets = reminderOffsets();
  const maxOffset = Math.max(...offsets);

  const todayStart = istDayStart(todayKey).getTime();

  // From yesterday (overdue alert) up to the furthest reminder day.
  const tasks = await ComplianceTask.find({
    status: { $ne: "done" },
    dueDate: {
      $gte: new Date(todayStart + OVERDUE_ALERT_DAYS * DAY_MS),
      $lt: new Date(todayStart + (maxOffset + 1) * DAY_MS),
    },
  }).lean();

  let sent = 0;
  for (const task of tasks) {
    const dueKey = istDayKey(new Date(task.dueDate));
    const daysBefore = daysBetween(todayKey, dueKey);
    if (!offsets.includes(daysBefore) && daysBefore !== OVERDUE_ALERT_DAYS) continue;

    const key = `${dueKey}:${daysBefore}`;
    const claim = await ComplianceTask.updateOne(
      { _id: task._id, status: { $ne: "done" }, remindersSent: { $ne: key } },
      { $addToSet: { remindersSent: key } }
    );
    if (claim.modifiedCount !== 1) continue;

    try {
      await sendComplianceDeadlineReminder(task, daysBefore);
      sent += 1;
    } catch (err) {
      console.error(`Compliance reminder failed for task ${task._id}:`, err.message);
    }
  }
  return sent;
}

export async function runCrmFollowUpReminders(now = new Date()) {
  const todayKey = istDayKey(now);
  const start = istDayStart(todayKey);
  const end = new Date(start.getTime() + DAY_MS);

  const leads = await Lead.find({
    status: { $ne: "lost" },
    followUpDate: { $gte: start, $lt: end },
  }).lean();

  let sent = 0;
  for (const lead of leads) {
    const claim = await Lead.updateOne(
      { _id: lead._id, followUpDate: lead.followUpDate, followUpReminderSentFor: { $ne: lead.followUpDate } },
      { $set: { followUpReminderSentFor: lead.followUpDate } }
    );
    if (claim.modifiedCount !== 1) continue;

    try {
      await sendCrmFollowUpReminder(lead);
      sent += 1;
    } catch (err) {
      console.error(`CRM follow-up reminder failed for lead ${lead._id}:`, err.message);
    }
  }
  return sent;
}

let running = false;

export async function runNotificationJobsOnce() {
  if (running) return;
  running = true;
  try {
    const [compliance, followUps] = await Promise.all([runComplianceDeadlineReminders(), runCrmFollowUpReminders()]);
    if (compliance || followUps) {
      console.log(`🔔 Reminders sent — compliance: ${compliance}, CRM follow-ups: ${followUps}`);
    }
  } catch (err) {
    console.error("Notification jobs failed:", err.message);
  } finally {
    running = false;
  }
}

export function startNotificationJobs() {
  if ((process.env.NOTIFICATION_JOBS_ENABLED || "").toLowerCase() === "false") {
    console.log("🔕 Notification jobs disabled (NOTIFICATION_JOBS_ENABLED=false).");
    return;
  }

  const expression = process.env.NOTIFICATION_CRON || "0 9-20 * * *";
  cron.schedule(expression, runNotificationJobsOnce, { timezone: TIMEZONE, noOverlap: true });

  // Catch up shortly after boot (e.g. after a deploy or a sleeping free-tier
  // instance waking up) — only if we're inside the working-hours window.
  setTimeout(() => {
    const hourIst = new Date(Date.now() + IST_OFFSET_MS).getUTCHours();
    if (hourIst >= 9 && hourIst <= 20) runNotificationJobsOnce();
  }, 30_000);

  console.log(`🔔 Notification jobs scheduled (${expression}, ${TIMEZONE}).`);
}
