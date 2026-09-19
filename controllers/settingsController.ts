import catchAsync from "../utils/catchAsync";
import { getSystemSettings } from "../utils/getSystemSettings";
import { writeAuditLog } from "../utils/writeAuditLog";

export const getSettings = catchAsync(async (req, res) => {
  const settings = await getSystemSettings();
  res.json({ success: true, data: settings });
});

export const updateSettings = catchAsync(async (req, res) => {
  const settings = await getSystemSettings();
  Object.assign(settings, req.body, { updatedBy: req.user.id });
  await settings.save();

  await writeAuditLog(req, {
    action: "settings.updated",
    targetType: "SystemSettings",
    targetId: settings._id,
    metadata: req.body,
  });

  res.json({ success: true, data: settings, message: "Platform settings updated" });
});
