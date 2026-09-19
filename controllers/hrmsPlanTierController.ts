import HrmsPlanTier, { DEFAULT_HRMS_PLAN_TIERS } from "../models/HrmsPlanTier";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";

async function getOrSeedTiers() {
  let tiers = await HrmsPlanTier.find().sort({ order: 1 });
  if (tiers.length === 0) {
    tiers = await HrmsPlanTier.insertMany(DEFAULT_HRMS_PLAN_TIERS);
  }
  return tiers;
}

// Read by anyone authenticated — the CA Firm's "Add Business Client" plan
// picker, the Business Client's own HRMS Billing Dashboard, and Super
// Admin's pricing management all read the same catalog.
export const listPlanTiers = catchAsync(async (req, res) => {
  const tiers = await getOrSeedTiers();
  res.json({ success: true, data: tiers });
});

export const updatePlanTier = catchAsync(async (req, res) => {
  const { name, minEmployees, maxEmployees, price } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (minEmployees !== undefined) update.minEmployees = minEmployees;
  if (maxEmployees !== undefined) update.maxEmployees = maxEmployees;
  if (price !== undefined) update.price = price;

  const tier = await HrmsPlanTier.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!tier) throw new ApiError(404, "Plan tier not found");
  res.json({ success: true, data: tier, message: "Plan tier updated" });
});
