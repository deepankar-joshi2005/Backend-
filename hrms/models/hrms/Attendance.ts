/** @format */

import mongoose, { Schema, Document } from "mongoose";

export interface IBreak {
  start: Date;
  end?: Date;
  duration?: number; // seconds
}

export interface ILocation {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string; // human-readable, resolved once via reverse geocoding
}

export interface IPunchSession {
  punchIn: Date;
  punchOut?: Date;
  punchInLocation?: ILocation;
  punchOutLocation?: ILocation;
}

export interface IAttendance extends Document {
  user: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  // punchIn = first punch-in of the day (used for lateness); punchOut = most
  // recent punch-out, cleared while a session is currently open. Full
  // multi-session history (re-punch-in after a punch-out) lives in `sessions`.
  punchIn?: Date;
  punchOut?: Date;
  punchInLocation?: ILocation;
  punchOutLocation?: ILocation;
  sessions: IPunchSession[];
  breaks: IBreak[];
  totalBreakSeconds: number;
  totalWorkSeconds: number;
  status: "PRESENT" | "ABSENT";
  companyId: mongoose.Types.ObjectId;
  source: "PUNCH" | "REQUEST";
  sourceRequestId?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
}

const BreakSchema = new Schema<IBreak>(
  {
    start: { type: Date, required: true },
    end: { type: Date },
    duration: { type: Number, default: 0 },
  },
  { _id: false }
);

const LocationSchema = new Schema<ILocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number },
    address: { type: String },
  },
  { _id: false }
);

const PunchSessionSchema = new Schema<IPunchSession>(
  {
    punchIn: { type: Date, required: true },
    punchOut: { type: Date },
    punchInLocation: LocationSchema,
    punchOutLocation: LocationSchema,
  },
  { _id: false }
);

const AttendanceSchema = new Schema<IAttendance>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    punchIn: Date,
    punchOut: Date,
    punchInLocation: LocationSchema,
    punchOutLocation: LocationSchema,

    sessions: {
      type: [PunchSessionSchema],
      default: [],
    },

    breaks: {
      type: [BreakSchema],
      default: [],
    },

    totalBreakSeconds: {
      type: Number,
      default: 0,
    },

    totalWorkSeconds: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["PRESENT", "ABSENT"],
      default: "PRESENT",
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["PUNCH", "REQUEST"],
      default: "PUNCH",
    },
    sourceRequestId: {
      type: Schema.Types.ObjectId,
      ref: "AttendanceRequest",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
  },
  { timestamps: true }
);

AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendance>("Attendance", AttendanceSchema);
