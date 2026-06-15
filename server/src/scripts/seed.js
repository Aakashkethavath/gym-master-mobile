/**
 * Seeds the database with a default admin, a demo client, sample
 * membership plans, trainers, an active subscription for the demo
 * client, and ~25 days of attendance history so the streak charts
 * render meaningfully out of the box.
 *
 * Re-running is safe — it upserts on email / name and skips records
 * that already exist.
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Plan } from '../models/Plan.js';
import { Trainer } from '../models/Trainer.js';
import { Subscription } from '../models/Subscription.js';
import { Payment } from '../models/Payment.js';
import { Attendance } from '../models/Attendance.js';
import { logger } from '../utils/logger.js';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@gymmaster.app';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
const CLIENT_EMAIL = process.env.SEED_CLIENT_EMAIL || 'client@gymmaster.app';
const CLIENT_PASSWORD = process.env.SEED_CLIENT_PASSWORD || 'Client@12345';

const PLANS = [
  {
    name: 'Starter',
    tagline: 'Get moving',
    description: 'Everything you need to build the habit.',
    monthlyPrice: 999,
    yearlyPrice: 9_999,
    sortOrder: 1,
    features: { waterStations: true, lockerRooms: true, wifi: true },
  },
  {
    name: 'Pro',
    tagline: 'Train smarter',
    description: 'Cardio classes, refreshments, and group sessions included.',
    monthlyPrice: 1_799,
    yearlyPrice: 17_999,
    sortOrder: 2,
    features: {
      waterStations: true,
      lockerRooms: true,
      wifi: true,
      cardioClasses: true,
      refreshments: true,
      groupClasses: true,
    },
  },
  {
    name: 'Elite',
    tagline: 'Performance unlocked',
    description: 'Everything in Pro, plus a personal trainer and events.',
    monthlyPrice: 2_999,
    yearlyPrice: 29_999,
    sortOrder: 3,
    features: {
      waterStations: true,
      lockerRooms: true,
      wifi: true,
      cardioClasses: true,
      refreshments: true,
      groupClasses: true,
      personalTrainer: true,
      specialEvents: true,
      cafe: true,
    },
  },
];

const TRAINERS = [
  {
    name: 'Anjali Mehra',
    specialization: 'Strength & Conditioning',
    experienceYears: 8,
    bio: 'Powerlifting national medallist. Specialises in progressive overload programmes.',
    avatar: 'https://i.pravatar.cc/300?u=anjali',
  },
  {
    name: 'Rohan Iyer',
    specialization: 'HIIT & Functional',
    experienceYears: 6,
    bio: 'Designs fat-loss and athletic-conditioning circuits for all levels.',
    avatar: 'https://i.pravatar.cc/300?u=rohan',
  },
  {
    name: 'Priya Sharma',
    specialization: 'Yoga & Mobility',
    experienceYears: 10,
    bio: 'RYT-500 yoga teacher with a background in physiotherapy.',
    avatar: 'https://i.pravatar.cc/300?u=priya',
  },
  {
    name: 'Karan Singh',
    specialization: 'CrossFit',
    experienceYears: 5,
    bio: 'CF-L2 coach. Loves Olympic lifts and barbell complexes.',
    avatar: 'https://i.pravatar.cc/300?u=karan',
  },
];

async function upsertUser({ name, email, password, role, ...rest }) {
  let user = await User.findOne({ email });
  if (user) return user;
  user = await User.create({ name, email, password, role, ...rest });
  return user;
}

async function seed() {
  await connectDB();

  // Plans
  for (const data of PLANS) {
    await Plan.updateOne({ name: data.name }, { $setOnInsert: data }, { upsert: true });
  }
  const plans = await Plan.find().sort({ sortOrder: 1 });
  logger.info(`✓ ${plans.length} plans`);

  // Trainers
  for (const data of TRAINERS) {
    await Trainer.updateOne({ name: data.name }, { $setOnInsert: data }, { upsert: true });
  }
  const trainerCount = await Trainer.countDocuments();
  logger.info(`✓ ${trainerCount} trainers`);

  // Admin user
  await upsertUser({
    name: 'Gym Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    city: 'Mumbai',
    contact: '+919999999999',
  });
  logger.info(`✓ admin: ${ADMIN_EMAIL}`);

  // Demo client
  const client = await upsertUser({
    name: 'Demo Client',
    email: CLIENT_EMAIL,
    password: CLIENT_PASSWORD,
    role: 'client',
    city: 'Mumbai',
    contact: '+918888888888',
  });
  logger.info(`✓ client: ${CLIENT_EMAIL}`);

  // Active subscription for the demo client
  const hasSub = await Subscription.findOne({ user: client._id, status: 'active' });
  if (!hasSub) {
    const proPlan = plans.find((p) => p.name === 'Pro') || plans[0];
    const start = new Date();
    start.setDate(start.getDate() - 5);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const sub = await Subscription.create({
      user: client._id,
      plan: proPlan._id,
      billing: 'monthly',
      amount: proPlan.monthlyPrice,
      startDate: start,
      endDate: end,
      status: 'active',
    });
    await Payment.create({
      user: client._id,
      subscription: sub._id,
      amount: proPlan.monthlyPrice,
      method: 'card',
      status: 'succeeded',
    });
    logger.info(`✓ active subscription for demo client (${proPlan.name})`);
  }

  // ~25 days of attendance history, with a couple of skipped days to
  // make the streak realistic.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const skips = new Set([3, 11, 17]); // days ago that we skip
  let writtenDays = 0;
  for (let i = 28; i >= 0; i--) {
    if (skips.has(i)) continue;
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    await Attendance.updateOne(
      { user: client._id, date: d },
      { $setOnInsert: { user: client._id, date: d } },
      { upsert: true },
    );
    writtenDays++;
  }

  // Recompute streak fields for the demo client.
  const dates = await Attendance.find({ user: client._id }).sort({ date: -1 }).select('date');
  let current = 0;
  let longest = 0;
  let cursor = today;
  for (const r of dates) {
    const diff = Math.round((cursor - r.date) / 86_400_000);
    if (diff === 0 || diff === 1) {
      current++;
      cursor = r.date;
    } else break;
  }
  // Longest streak: walk all records.
  {
    let run = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = Math.round((dates[i - 1].date - dates[i].date) / 86_400_000);
      if (diff === 1) run++;
      else {
        longest = Math.max(longest, run);
        run = 1;
      }
    }
    longest = Math.max(longest, run, current);
  }
  client.currentStreak = current;
  client.longestStreak = longest;
  client.lastCheckIn = dates[0]?.date || null;
  client.totalCheckIns = dates.length;
  await client.save();
  logger.info(`✓ ${writtenDays} attendance days, streak=${current}, longest=${longest}`);

  logger.info('');
  logger.info('================ DEMO CREDENTIALS ================');
  logger.info(`  Admin:  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  logger.info(`  Client: ${CLIENT_EMAIL} / ${CLIENT_PASSWORD}`);
  logger.info('==================================================');

  await disconnectDB();
}

seed().catch(async (err) => {
  logger.error({ err }, 'Seed failed');
  await disconnectDB().catch(() => {});
  process.exit(1);
});
