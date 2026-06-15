import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sets: { type: Number, min: 0, default: 0 },
    reps: { type: Number, min: 0, default: 0 },
    weightKg: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const workoutSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, default: Date.now },
    type: {
      type: String,
      enum: ['strength', 'cardio', 'hiit', 'yoga', 'crossfit', 'other'],
      default: 'strength',
    },
    durationMinutes: { type: Number, min: 0, default: 0 },
    caloriesBurned: { type: Number, min: 0, default: 0 },
    exercises: { type: [exerciseSchema], default: [] },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Workout = mongoose.model('Workout', workoutSchema);
