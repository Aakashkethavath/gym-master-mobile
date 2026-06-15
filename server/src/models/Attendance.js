import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Stored as a date at UTC midnight so we can dedupe per-day with a
    // compound unique index regardless of when the user checks in.
    date: { type: Date, required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

// One check-in per user per day.
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
