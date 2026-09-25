/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ISubmittedAnswer {
  questionId: mongoose.Types.ObjectId;
  selectedOptionId: mongoose.Types.ObjectId | null;
  isCorrect: boolean;
}

export interface ITrainingTestAttempt extends Document {
  companyId: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  module: mongoose.Types.ObjectId;
  attemptNumber: 1 | 2;
  scorePercentage: number | null;
  isPassed: boolean | null;
  randomizedQuestionIds: mongoose.Types.ObjectId[];
  testDurationSeconds: number;
  submittedAnswers: ISubmittedAnswer[];
  isTimeExpired: boolean;
  startedAt: Date;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const submittedAnswerSchema = new Schema<ISubmittedAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "TrainingQuestion" },
    selectedOptionId: { type: Schema.Types.ObjectId, default: null },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const trainingTestAttemptSchema = new Schema<ITrainingTestAttempt>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    module: { type: Schema.Types.ObjectId, ref: "TrainingModule", required: true, index: true },
    attemptNumber: { type: Number, enum: [1, 2], required: true },
    scorePercentage: { type: Number, default: null },
    isPassed: { type: Boolean, default: null },
    randomizedQuestionIds: [{ type: Schema.Types.ObjectId, ref: "TrainingQuestion" }],
    // Snapshotted from TrainingModule.testDurationMinutes*60 when the attempt
    // starts — a later change to the module's duration must not affect an
    // attempt already in flight.
    testDurationSeconds: { type: Number, default: 1200 },
    submittedAnswers: { type: [submittedAnswerSchema], default: [] },
    isTimeExpired: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "training_test_attempts" }
);

export default mongoose.model<ITrainingTestAttempt>("TrainingTestAttempt", trainingTestAttemptSchema);
