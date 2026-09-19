import SystemSettings from "../models/SystemSettings";

// Settings are a lazily-created singleton document — always read fresh from
// the DB (no in-process caching) so admin changes take effect immediately.
export async function getSystemSettings() {
  let settings = await SystemSettings.findOne();
  if (!settings) settings = await SystemSettings.create({});
  return settings;
}
