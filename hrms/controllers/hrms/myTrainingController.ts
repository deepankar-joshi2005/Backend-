/** @format */
import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import TrainingModule from "../../models/hrms/TrainingModule";
import TrainingQuestion from "../../models/hrms/TrainingQuestion";
import TrainingProfile from "../../models/hrms/TrainingProfile";
import TrainingProgress from "../../models/hrms/TrainingProgress";
import TrainingTestAttempt from "../../models/hrms/TrainingTestAttempt";

const MAX_ATTEMPTS = 2;
const TEST_QUESTION_LIMIT = 10;
const MIN_QUESTIONS_REQUIRED = 4;
const GRACE_SECONDS = 60;

async function getSortedAssignedModules(profile: any) {
  return TrainingModule.find({ _id: { $in: profile.assignedModules } }).sort({ sequenceOrder: 1 });
}

async function hasPassedAttempt(userId: any, moduleId: any) {
  const passed = await TrainingTestAttempt.findOne({ user: userId, module: moduleId, isPassed: true });
  return !!passed;
}

/* ================= DASHBOARD ================= */
export const getMyDashboard = async (req: AuthRequest, res: Response) => {
  const profile = await TrainingProfile.findOne({ user: req.user._id });
  if (!profile) return res.json({ profile: null, modules: [] });

  const modules = await getSortedAssignedModules(profile);
  const result = [];
  let previousPassed = true; // first module is always unlocked

  for (const module of modules) {
    const [progress, attempts] = await Promise.all([
      TrainingProgress.findOne({ user: req.user._id, module: module._id }),
      TrainingTestAttempt.find({ user: req.user._id, module: module._id }).sort({ attemptNumber: 1 }),
    ]);
    const isPassed = attempts.some((a) => a.isPassed);
    result.push({
      module,
      progress: progress || null,
      attemptsUsed: attempts.length,
      isPassed,
      isLockedBySequence: !previousPassed,
    });
    previousPassed = isPassed;
  }

  res.json({ profile, modules: result });
};

/* ================= MODULE PLAYER ================= */
export const getModuleLearningView = async (req: AuthRequest, res: Response) => {
  const { moduleId } = req.params;
  const profile = await TrainingProfile.findOne({ user: req.user._id });
  if (!profile || !profile.assignedModules.some((m) => m.toString() === moduleId)) {
    return res.status(403).json({ message: "This module is not assigned to you" });
  }

  const modules = await getSortedAssignedModules(profile);
  const idx = modules.findIndex((m) => (m._id as any).toString() === moduleId);
  if (idx === -1) return res.status(404).json({ message: "Module not found" });

  if (idx > 0) {
    const prevPassed = await hasPassedAttempt(req.user._id, modules[idx - 1]._id);
    if (!prevPassed) {
      return res.status(403).json({ message: "Complete the previous module first", code: "SEQUENCE_LOCKED" });
    }
  }

  const module = modules[idx];
  let progress = await TrainingProgress.findOne({ user: req.user._id, module: module._id });
  if (!progress) {
    progress = await TrainingProgress.create({
      companyId: module.companyId,
      user: req.user._id,
      module: module._id,
      status: "In-Progress",
    });
  }

  res.json({ module, progress });
};

export const markContentCompleted = async (req: AuthRequest, res: Response) => {
  const { moduleId, contentId } = req.body;
  if (!moduleId || !contentId) return res.status(400).json({ message: "moduleId and contentId are required" });

  const module = await TrainingModule.findById(moduleId);
  if (!module) return res.status(404).json({ message: "Module not found" });

  let progress = await TrainingProgress.findOne({ user: req.user._id, module: moduleId });
  if (!progress) {
    progress = await TrainingProgress.create({
      companyId: module.companyId,
      user: req.user._id,
      module: moduleId,
      status: "In-Progress",
    });
  }

  const alreadyMarked = progress.completedContentIds.some((id) => id.toString() === contentId);
  if (!alreadyMarked) progress.completedContentIds.push(contentId as any);

  const allDone = module.contents.every((c: any) =>
    progress!.completedContentIds.some((id) => id.toString() === c._id.toString())
  );
  if (allDone) {
    progress.status = "Completed";
    progress.isTestUnlocked = true;
  } else if (progress.status === "Pending") {
    progress.status = "In-Progress";
  }

  await progress.save();
  res.json(progress);
};

/* ================= TEST ================= */
export const getModuleTestInfo = async (req: AuthRequest, res: Response) => {
  const module = await TrainingModule.findById(req.params.moduleId);
  if (!module) return res.status(404).json({ message: "Module not found" });
  res.json({ testDurationMinutes: module.testDurationMinutes, passPercentage: module.passPercentage });
};

export const startTest = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;
    const module = await TrainingModule.findById(moduleId);
    if (!module) return res.status(404).json({ message: "Module not found" });

    const progress = await TrainingProgress.findOne({ user: req.user._id, module: moduleId });
    if (!progress || !progress.isTestUnlocked) {
      return res.status(400).json({ message: "Complete all module content before starting the test" });
    }

    const profile = await TrainingProfile.findOne({ user: req.user._id });
    if (!profile || !profile.isEligible) {
      return res.status(403).json({ message: "You are not eligible to attempt this test" });
    }

    const previousAttempts = await TrainingTestAttempt.find({ user: req.user._id, module: moduleId });
    if (previousAttempts.some((a) => a.isPassed)) {
      return res.status(400).json({ message: "You have already passed this module" });
    }
    if (previousAttempts.length >= MAX_ATTEMPTS) {
      return res.status(403).json({ message: "You have used both attempts for this module" });
    }

    const questions = await TrainingQuestion.find({ module: moduleId });
    if (questions.length < MIN_QUESTIONS_REQUIRED) {
      return res.status(400).json({ message: "This module's question bank is not ready yet — please contact HR" });
    }

    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(TEST_QUESTION_LIMIT, shuffled.length));
    const durationSeconds = Math.max(60, module.testDurationMinutes * 60);

    const attempt = await TrainingTestAttempt.create({
      companyId: module.companyId,
      user: req.user._id,
      module: moduleId,
      attemptNumber: previousAttempts.length + 1,
      randomizedQuestionIds: selected.map((q) => q._id),
      testDurationSeconds: durationSeconds,
      startedAt: new Date(),
    });

    const sanitized = selected.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options.map((o: any) => ({ _id: o._id, text: o.text })),
    }));

    res.json({ testAttemptId: attempt._id, durationSeconds, questions: sanitized });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to start test", error: error.message });
  }
};

export const submitTest = async (req: AuthRequest, res: Response) => {
  try {
    const { testAttemptId, answers } = req.body;
    const attempt = await TrainingTestAttempt.findById(testAttemptId);
    if (!attempt) return res.status(400).json({ message: "Test attempt not found" });
    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "This test attempt does not belong to you" });
    }
    if (attempt.finishedAt) return res.status(400).json({ message: "This test has already been submitted" });

    const module = await TrainingModule.findById(attempt.module);
    if (!module) return res.status(404).json({ message: "Module not found" });

    const timeTakenMs = Date.now() - new Date(attempt.startedAt).getTime();
    const isTimeExpired = timeTakenMs > attempt.testDurationSeconds * 1000 + GRACE_SECONDS * 1000;

    const questions = await TrainingQuestion.find({ _id: { $in: attempt.randomizedQuestionIds } });
    const questionMap = new Map(questions.map((q) => [(q._id as any).toString(), q]));

    let correctCount = 0;
    const submittedAnswers = (Array.isArray(answers) ? answers : []).map((a: any) => {
      const question = questionMap.get(String(a.questionId));
      const isCorrect =
        !isTimeExpired && !!question && String(question.correctOptionId) === String(a.selectedOptionId);
      if (isCorrect) correctCount++;
      return { questionId: a.questionId, selectedOptionId: a.selectedOptionId || null, isCorrect };
    });

    const totalQuestions = attempt.randomizedQuestionIds.length || 1;
    const scorePercentage = isTimeExpired ? 0 : Math.round((correctCount / totalQuestions) * 100);
    const isPassed = scorePercentage >= module.passPercentage;

    attempt.submittedAnswers = submittedAnswers as any;
    attempt.scorePercentage = scorePercentage;
    attempt.isPassed = isPassed;
    attempt.isTimeExpired = isTimeExpired;
    attempt.finishedAt = new Date();
    await attempt.save();

    const profile = await TrainingProfile.findOne({ user: req.user._id });
    if (profile) {
      if (isPassed) {
        const passedModuleIds = new Set(
          (await TrainingTestAttempt.find({ user: req.user._id, isPassed: true })).map((a) => a.module.toString())
        );
        passedModuleIds.add((module._id as any).toString());
        const allPassed = profile.assignedModules.every((m) => passedModuleIds.has(m.toString()));
        profile.status = allPassed ? "Passed" : "In-Training";
      } else if (attempt.attemptNumber >= MAX_ATTEMPTS) {
        profile.status = "Failed";
        profile.isEligible = false;
      } else {
        profile.status = "Pending_2nd_Attempt";
      }
      await profile.save();
    }

    const reviewData = questions.map((q) => {
      const submitted = submittedAnswers.find((a: any) => String(a.questionId) === String(q._id));
      return {
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        correctOptionId: q.correctOptionId,
        selectedOptionId: submitted?.selectedOptionId || null,
        isCorrect: submitted?.isCorrect || false,
      };
    });

    res.json({ scorePercentage, isPassed, isTimeExpired, reviewData });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to submit test", error: error.message });
  }
};
