import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    tagline: { type: String, trim: true },
    description: { type: String, trim: true },
    monthlyPrice: { type: Number, required: true, min: 0 },
    yearlyPrice: { type: Number, required: true, min: 0 },

    // feature flags so the mobile app can render comparison tables
    // dynamically without coupling to specific copy
    features: {
      waterStations: { type: Boolean, default: true },
      lockerRooms: { type: Boolean, default: true },
      wifi: { type: Boolean, default: true },
      cardioClasses: { type: Boolean, default: false },
      refreshments: { type: Boolean, default: false },
      groupClasses: { type: Boolean, default: false },
      personalTrainer: { type: Boolean, default: false },
      specialEvents: { type: Boolean, default: false },
      cafe: { type: Boolean, default: false },
    },

    // controls visibility in the public catalogue
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Plan = mongoose.model('Plan', planSchema);
