import BusinessClient from "../models/BusinessClient";
import ClientEmployee from "../models/ClientEmployee";
import ApiError from "../utils/ApiError";
import catchAsync from "../utils/catchAsync";
import { signEmployeeFormAccessToken, verifyEmployeeFormAccessToken } from "../utils/employeeFormToken";

async function loadClientByToken(token: string) {
  const client = await BusinessClient.findOne({ employeeFormToken: token, isActive: true });
  if (!client) throw new ApiError(404, "This link is invalid or no longer active");
  return client;
}

// Step 1: unauthenticated — just enough to brand the page before the
// Employee ID gate. Never returns anything beyond the company name.
export const getPublicBusinessClient = catchAsync(async (req, res) => {
  const client = await loadClientByToken(req.params.token);
  res.json({ success: true, data: { companyName: client.name } });
});

// Step 2: the employee identifies themselves by their own Employee ID
// (issued earlier via Excel import or added manually by staff) — this is the
// "password" for this link. Unknown IDs are rejected outright; there's no
// fallback to register as a brand-new employee from here.
export const identifyEmployee = catchAsync(async (req, res) => {
  const client = await loadClientByToken(req.params.token);
  const employeeCode = String(req.body.employeeCode || "").trim();

  const employee = await ClientEmployee.findOne({ businessClientId: client._id, employeeCode });
  if (!employee) throw new ApiError(404, "Employee ID not found — please check with your company and try again");

  res.json({
    success: true,
    data: {
      formToken: signEmployeeFormAccessToken(client._id.toString(), employee._id.toString()),
      name: employee.name,
    },
  });
});

// Step 3: the employee fills in/updates their own details — this UPDATES the
// existing ClientEmployee identified in step 2, it never creates a new one.
export const submitEmployeeForm = catchAsync(async (req, res) => {
  const client = await loadClientByToken(req.params.token);

  const formToken = req.headers["x-employee-form-token"];
  if (!formToken || typeof formToken !== "string") throw new ApiError(401, "Missing or expired form session");

  let payload;
  try {
    payload = verifyEmployeeFormAccessToken(formToken);
  } catch {
    throw new ApiError(401, "Your session has expired — please re-enter your Employee ID");
  }
  if (payload.businessClientId !== client._id.toString()) {
    throw new ApiError(403, "This form session does not match this company");
  }

  const {
    phone,
    designation,
    dateOfJoining,
    email,
    fatherOrHusbandName,
    dateOfBirth,
    gender,
    address,
    pan,
    bankAccountNumber,
    bankIfsc,
    bankName,
    accountHolderName,
    emergencyContactName,
    emergencyContactPhone,
  } = req.body;

  const employee = await ClientEmployee.findOneAndUpdate(
    { _id: payload.clientEmployeeId, businessClientId: client._id },
    {
      $set: {
        designation,
        dateOfJoining,
        phone,
        email,
        fatherOrHusbandName,
        dateOfBirth,
        gender,
        address,
        pan,
        bankAccountNumber,
        bankIfsc,
        bankName,
        accountHolderName,
        emergencyContactName,
        emergencyContactPhone,
        selfServiceSubmittedAt: new Date(),
      },
    },
    { new: true }
  );
  if (!employee) throw new ApiError(404, "Employee not found");

  res.status(200).json({
    success: true,
    data: { employeeCode: employee.employeeCode },
    message: `Your details have been submitted to ${client.name}.`,
  });
});
