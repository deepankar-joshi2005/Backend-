export function getPagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// Builds a Mongo range filter for `field` from ?startDate=&endDate= (yyyy-MM-dd,
// as sent by the frontend's DateRangeFilter). Returns {} when neither is set,
// so callers can always spread it into their filter object unconditionally.
export function getDateRangeFilter(query, field = "createdAt"): Record<string, any> {
  if (!query.startDate && !query.endDate) return {};
  const range: { $gte?: Date; $lte?: Date } = {};
  if (query.startDate) range.$gte = new Date(query.startDate);
  if (query.endDate) {
    const end = new Date(query.endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return { [field]: range };
}
