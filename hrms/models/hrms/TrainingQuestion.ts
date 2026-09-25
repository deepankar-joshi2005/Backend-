/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface ITrainingOption {
  _id: mongoose.Types.ObjectId;
  text: string;
}

export interface ITrainingQuestion extends Document {
  companyId: mongoose.Types.ObjectId;
  module: mongoose.Types.ObjectId;
  questionText: string;
  options: ITrainingOption[];
  correctOptionId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const trainingOptionSchema = new Schema<ITrainingOption>(
  {
    text: { type: String, required: true },
  },
  { _id: true }
);

const trainingQuestionSchema = new Schema<ITrainingQuestion>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    module: { type: Schema.Types.ObjectId, ref: "TrainingModule", required: true, index: true },
    questionText: { type: String, required: true },
    options: {
      type: [trainingOptionSchema],
      validate: {
        validator: (opts: ITrainingOption[]) => opts.length >= 2,
        message: "A question needs at least 2 options",
      },
    },
    correctOptionId: { type: Schema.Types.ObjectId, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "training_questions" }
);

export default mongoose.model<ITrainingQuestion>("TrainingQuestion", trainingQuestionSchema);
