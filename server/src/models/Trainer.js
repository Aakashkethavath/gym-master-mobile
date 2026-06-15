import mongoose from 'mongoose';

const trainerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    bio: { type: String, trim: true },
    experienceYears: { type: Number, min: 0, default: 0 },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    avatar: { type: String }, // URL or data URI
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Trainer = mongoose.model('Trainer', trainerSchema);
