/** @format */

import { Response } from "express";
import SelfAppraisal from "../../models/hrms/SelfAppraisal";
import { AuthRequest } from "../../middleware/auth";
import Appraisal from "../../models/hrms/Appraisal";
export const submitSelfAppraisal = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user.id;

    const appraisal = await SelfAppraisal.findOneAndUpdate(
      {
        appraisalId: req.body.appraisalId,
        employeeId,
      },
      { ...req.body, status: "SUBMITTED" },
      { upsert: true, new: true }
    );

    res.json(appraisal);
  } catch (err) {
    res.status(500).json({ message: "Submission failed" });
  }
};

export const getMySelfAppraisal = async (req: AuthRequest, res: Response) => {
  const employeeId = req.user.id;
  const appraisalId = req.params.appraisalId;

  const data = await SelfAppraisal.findOne({ appraisalId, employeeId });
  res.json(data);
};

export const getEmployeeAppraisals = async (
  req: AuthRequest,
  res: Response
) => {
  const employeeId = req.user.id;

  const appraisals = await Appraisal.find({
    status: "ACTIVE",
    $or: [
      // No specific employees selected ("All Employees") — visible to everyone
      { applicableFor: { $exists: false } },
      { applicableFor: { $size: 0 } },
      // Specific employees selected — visible only to those employees
      { applicableFor: employeeId },
    ],
  }).sort({ createdAt: -1 });

  const appraisalIds = appraisals.map((a) => a._id);

  const submissions = await SelfAppraisal.find({
    appraisalId: { $in: appraisalIds },
    employeeId,
  });

  const submissionMap = new Map(
    submissions.map((s) => [s.appraisalId.toString(), s])
  );

  const response = appraisals.map((a) => {
    const submission = submissionMap.get(a._id.toString());

    return {
      ...a.toObject(),
      isSubmitted: !!submission,
      submittedAt: submission?.createdAt || null,
      selfAppraisalId: submission?._id || null,
    };
  });

  res.json(response);
};
