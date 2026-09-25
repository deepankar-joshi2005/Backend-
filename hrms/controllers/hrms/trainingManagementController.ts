/** @format */
import { Response } from "express";
import path from "path";
import fs from "fs";
import { AuthRequest } from "../../middleware/auth";
import TrainingModule from "../../models/hrms/TrainingModule";
import TrainingQuestion from "../../models/hrms/TrainingQuestion";
import TrainingProfile from "../../models/hrms/TrainingProfile";
import TrainingProgress from "../../models/hrms/TrainingProgress";
import TrainingTestAttempt from "../../models/hrms/TrainingTestAttempt";
import User from "../../models/User";
import { inferContentType, buildTrainingMediaUrl } from "../../utils/trainingUpload";

/* ================= SCOPE HELPERS ================= */
const isPlatformAdmin = (req: AuthRequest) => req.user.isSystemAdmin || req.user.role === "hrms-admin";

const resolveCompanyId = (req: AuthRequest) =>
  isPlatformAdmin(req) ? req.query.companyId || req.body.companyId || req.user.companyId : req.user.companyId;

const authorizedForCompany = (req: AuthRequest, companyId: any) =>
  isPlatformAdmin(req) || req.user.companyId?.toString() === companyId?.toString();

const parseWatchTimes = (raw: any): number[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/* ================= MODULES ================= */
export const createModule = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = resolveCompanyId(req);
    const { title, description, departmentId, category, sequenceOrder, testDurationMinutes, passPercentage } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const files = ((req.files as any[]) || []);
    const watchTimes = parseWatchTimes(req.body.minWatchTimes);
    const contents = files.map((file, i) => ({
      contentType: inferContentType(file.mimetype, file.originalname),
      mediaUrl: buildTrainingMediaUrl(file.filename),
      fileName: file.originalname,
      minWatchTime: Number(watchTimes[i]) || 0,
    }));

    const module = await TrainingModule.create({
      companyId,
      title,
      description: description || "",
      departmentId: departmentId || null,
      category: category || "Induction",
      sequenceOrder: Number(sequenceOrder) || 1,
      contents,
      testDurationMinutes: Math.max(1, Number(testDurationMinutes) || 20),
      passPercentage: Math.min(100, Math.max(1, Number(passPercentage) || 70)),
      createdBy: req.user._id,
    });
    res.status(201).json(module);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create module", error: error.message });
  }
};

export const getModules = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = resolveCompanyId(req);
    const filter: any = { companyId };
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    filter.isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : true;

    // Unpaginated (flat array) unless ?page= is supplied — some callers (question
    // bank tabs, trainee module pickers) need every matching module at once.
    if (req.query.page) {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const [data, total] = await Promise.all([
        TrainingModule.find(filter)
          .populate("departmentId", "name")
          .sort({ sequenceOrder: 1 })
          .skip((page - 1) * limit)
          .limit(limit),
        TrainingModule.countDocuments(filter),
      ]);
      return res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    }

    const modules = await TrainingModule.find(filter).populate("departmentId", "name").sort({ sequenceOrder: 1 });
    res.json(modules);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch modules", error: error.message });
  }
};

export const getModuleById = async (req: AuthRequest, res: Response) => {
  const module = await TrainingModule.findById(req.params.id).populate("departmentId", "name");
  if (!module) return res.status(404).json({ message: "Module not found" });
  if (!authorizedForCompany(req, module.companyId)) return res.status(403).json({ message: "Access denied" });
  res.json(module);
};

export const updateModule = async (req: AuthRequest, res: Response) => {
  try {
    const module = await TrainingModule.findById(req.params.id);
    if (!module) return res.status(404).json({ message: "Module not found" });
    if (!authorizedForCompany(req, module.companyId)) return res.status(403).json({ message: "Access denied" });

    const { title, description, departmentId, category, sequenceOrder, testDurationMinutes, passPercentage, isActive } = req.body;
    if (title !== undefined) module.title = title;
    if (description !== undefined) module.description = description;
    if (departmentId !== undefined) module.departmentId = (departmentId || null) as any;
    if (category !== undefined) module.category = category;
    if (sequenceOrder !== undefined) module.sequenceOrder = Number(sequenceOrder);
    if (testDurationMinutes !== undefined) module.testDurationMinutes = Math.max(1, Number(testDurationMinutes));
    if (passPercentage !== undefined) module.passPercentage = Math.min(100, Math.max(1, Number(passPercentage)));
    if (isActive !== undefined) module.isActive = isActive === true || isActive === "true";

    await module.save();
    res.json(module);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update module", error: error.message });
  }
};

export const deactivateModule = async (req: AuthRequest, res: Response) => {
  const module = await TrainingModule.findById(req.params.id);
  if (!module) return res.status(404).json({ message: "Module not found" });
  if (!authorizedForCompany(req, module.companyId)) return res.status(403).json({ message: "Access denied" });

  module.isActive = false;
  await module.save();
  res.json({ message: "Module deactivated" });
};

export const addMediaToModule = async (req: AuthRequest, res: Response) => {
  try {
    const module = await TrainingModule.findById(req.params.id);
    if (!module) return res.status(404).json({ message: "Module not found" });
    if (!authorizedForCompany(req, module.companyId)) return res.status(403).json({ message: "Access denied" });

    const files = (req.files as any[]) || [];
    if (!files.length) return res.status(400).json({ message: "No files uploaded" });
    const watchTimes = parseWatchTimes(req.body.minWatchTimes);

    files.forEach((file, i) => {
      module.contents.push({
        contentType: inferContentType(file.mimetype, file.originalname),
        mediaUrl: buildTrainingMediaUrl(file.filename),
        fileName: file.originalname,
        minWatchTime: Number(watchTimes[i]) || 0,
      } as any);
    });

    await module.save();
    res.json(module);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to add media", error: error.message });
  }
};

export const removeMediaFromModule = async (req: AuthRequest, res: Response) => {
  const { moduleId, contentId } = req.params;
  const module = await TrainingModule.findById(moduleId);
  if (!module) return res.status(404).json({ message: "Module not found" });
  if (!authorizedForCompany(req, module.companyId)) return res.status(403).json({ message: "Access denied" });

  const item: any = module.contents.find((c: any) => c._id?.toString() === contentId);
  if (item) {
    try {
      const filePath = path.join(process.cwd(), item.mediaUrl.replace(/^\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Failed to delete training media file:", err);
    }
  }
  module.contents = module.contents.filter((c: any) => c._id?.toString() !== contentId) as any;
  await module.save();
  res.json(module);
};

export const updateMediaWatchTime = async (req: AuthRequest, res: Response) => {
  const { moduleId, contentId } = req.params;
  const module = await TrainingModule.findById(moduleId);
  if (!module) return res.status(404).json({ message: "Module not found" });
  if (!authorizedForCompany(req, module.companyId)) return res.status(403).json({ message: "Access denied" });

  const item: any = module.contents.find((c: any) => c._id?.toString() === contentId);
  if (!item) return res.status(404).json({ message: "Content item not found" });
  item.minWatchTime = Number(req.body.minWatchTime) || 0;
  await module.save();
  res.json(module);
};

/* ================= QUESTION BANK ================= */
export const addQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;
    const module = await TrainingModule.findById(moduleId);
    if (!module) return res.status(404).json({ message: "Module not found" });
    if (!authorizedForCompany(req, module.companyId)) return res.status(403).json({ message: "Access denied" });

    const { questionText, options, correctOptionIndex } = req.body;
    if (!questionText || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: "Question text and at least 2 options are required" });
    }
    const idx = Number(correctOptionIndex);
    if (Number.isNaN(idx) || idx < 0 || idx >= options.length) {
      return res.status(400).json({ message: "A valid correct option must be selected" });
    }

    const question = new TrainingQuestion({
      companyId: module.companyId,
      module: module._id,
      questionText,
      options: options.map((text: string) => ({ text })),
      createdBy: req.user._id,
    });
    question.correctOptionId = (question.options[idx] as any)._id;
    await question.save();
    res.status(201).json(question);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to add question", error: error.message });
  }
};

export const getQuestions = async (req: AuthRequest, res: Response) => {
  const { moduleId } = req.params;
  const module = await TrainingModule.findById(moduleId);
  if (!module) return res.status(404).json({ message: "Module not found" });
  if (!authorizedForCompany(req, module.companyId)) return res.status(403).json({ message: "Access denied" });

  const questions = await TrainingQuestion.find({ module: moduleId }).sort({ createdAt: 1 });
  res.json(questions);
};

export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const question = await TrainingQuestion.findById(req.params.questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });
    if (!authorizedForCompany(req, question.companyId)) return res.status(403).json({ message: "Access denied" });

    const { questionText, options, correctOptionIndex } = req.body;
    if (questionText !== undefined) question.questionText = questionText;
    if (Array.isArray(options) && options.length >= 2) {
      question.options = options.map((o: any) => ({ text: typeof o === "string" ? o : o.text })) as any;
    }
    if (correctOptionIndex !== undefined) {
      const idx = Number(correctOptionIndex);
      if (Number.isNaN(idx) || idx < 0 || idx >= question.options.length) {
        return res.status(400).json({ message: "A valid correct option must be selected" });
      }
      question.correctOptionId = (question.options[idx] as any)._id;
    }
    await question.save();
    res.json(question);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update question", error: error.message });
  }
};

export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  const question = await TrainingQuestion.findById(req.params.questionId);
  if (!question) return res.status(404).json({ message: "Question not found" });
  if (!authorizedForCompany(req, question.companyId)) return res.status(403).json({ message: "Access denied" });

  await TrainingQuestion.findByIdAndDelete(req.params.questionId);
  res.json({ message: "Question deleted" });
};

/* ================= TRAINEES ================= */
export const getTrainees = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = resolveCompanyId(req);
    const filter: any = { companyId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;

    let profiles: any[] = await TrainingProfile.find(filter)
      .populate("user", "name email employeeId profilePicture role isTrainee")
      .populate("departmentId", "name")
      .sort({ createdAt: -1 });

    const search = ((req.query.search as string) || "").trim().toLowerCase();
    if (search) {
      profiles = profiles.filter(
        (p) => p.user?.name?.toLowerCase().includes(search) || p.user?.email?.toLowerCase().includes(search)
      );
    }
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch trainees", error: error.message });
  }
};

export const getTraineeDetails = async (req: AuthRequest, res: Response) => {
  const profile: any = await TrainingProfile.findById(req.params.id)
    .populate("user", "name email employeeId profilePicture role isTrainee")
    .populate("departmentId", "name")
    .populate("assignedModules", "title sequenceOrder testDurationMinutes passPercentage contents");
  if (!profile) return res.status(404).json({ message: "Trainee profile not found" });
  if (!authorizedForCompany(req, profile.companyId)) return res.status(403).json({ message: "Access denied" });

  const [progress, attempts] = await Promise.all([
    TrainingProgress.find({ user: profile.user._id }).populate("module", "title"),
    TrainingTestAttempt.find({ user: profile.user._id }).populate("module", "title").sort({ startedAt: -1 }),
  ]);

  res.json({ profile, progress, attempts });
};

export const updateTraineeModules = async (req: AuthRequest, res: Response) => {
  const profile = await TrainingProfile.findById(req.params.id);
  if (!profile) return res.status(404).json({ message: "Trainee profile not found" });
  if (!authorizedForCompany(req, profile.companyId)) return res.status(403).json({ message: "Access denied" });

  const { assignedModules } = req.body;
  if (!Array.isArray(assignedModules)) return res.status(400).json({ message: "assignedModules must be an array" });

  profile.assignedModules = assignedModules;
  await profile.save();
  res.json(profile);
};

export const completeOnboarding = async (req: AuthRequest, res: Response) => {
  const profile = await TrainingProfile.findById(req.params.id);
  if (!profile) return res.status(404).json({ message: "Trainee profile not found" });
  if (!authorizedForCompany(req, profile.companyId)) return res.status(403).json({ message: "Access denied" });

  profile.status = "Completed_Onboarding";
  await profile.save();
  await User.findByIdAndUpdate(profile.user, { isTrainee: false });
  res.json({ message: "Trainee onboarded — the training restriction has been lifted", profile });
};

export const resetTraineeAttempts = async (req: AuthRequest, res: Response) => {
  const profile = await TrainingProfile.findById(req.params.id);
  if (!profile) return res.status(404).json({ message: "Trainee profile not found" });
  if (!authorizedForCompany(req, profile.companyId)) return res.status(403).json({ message: "Access denied" });

  const { moduleId } = req.body;
  if (!moduleId) return res.status(400).json({ message: "moduleId is required" });

  await TrainingTestAttempt.deleteMany({ user: profile.user, module: moduleId });
  profile.isEligible = true;
  if (profile.status === "Failed" || profile.status === "Pending_2nd_Attempt") {
    profile.status = "In-Training";
  }
  await profile.save();
  res.json({ message: "Attempts reset — the trainee can retake this module's test", profile });
};
