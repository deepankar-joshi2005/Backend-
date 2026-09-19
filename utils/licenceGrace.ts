// Per Multi-Tenancy & Licensing doc, Section 7 "Licence Expiry & Downgrade Rules":
// expiry itself doesn't lock a firm out — there's a 7-day grace period where full
// functionality continues and only a renewal banner shows. Read-only access kicks
// in only once the grace period has actually elapsed.
export const GRACE_PERIOD_DAYS = 7;

export function getGraceInfo(plan) {
  const now = new Date();
  const expiryDate = plan?.expiryDate ? new Date(plan.expiryDate) : null;
  const isPastExpiry = plan?.status === "expired" || (!!expiryDate && expiryDate < now);

  if (!isPastExpiry) {
    return { isPastExpiry: false, inGracePeriod: false, graceEndDate: null, isReadOnly: false };
  }
  if (!expiryDate) {
    // Marked expired with no expiry date on record — nothing to compute a grace
    // window from, so treat it as already past grace rather than granting one.
    return { isPastExpiry: true, inGracePeriod: false, graceEndDate: null, isReadOnly: true };
  }

  const graceEndDate = new Date(expiryDate.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const inGracePeriod = now <= graceEndDate;
  return { isPastExpiry: true, inGracePeriod, graceEndDate, isReadOnly: !inGracePeriod };
}
