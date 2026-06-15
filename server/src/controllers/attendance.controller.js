import { Attendance } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Returns a date set to UTC midnight, so attendance records dedupe
 * cleanly across timezones.
 */
function startOfDayUTC(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function diffInDays(a, b) {
  return Math.round((startOfDayUTC(a) - startOfDayUTC(b)) / 86_400_000);
}

export const checkIn = asyncHandler(async (req, res) => {
  const today = startOfDayUTC();
  const user = req.user;

  // Insert today's attendance. The unique compound index on (user, date)
  // means a duplicate insert throws 11000, which we translate to 409.
  try {
    await Attendance.create({ user: user._id, date: today });
  } catch (err) {
    if (err.code === 11000) {
      throw ApiError.conflict('Already checked in today', 'ALREADY_CHECKED_IN');
    }
    throw err;
  }

  // Update streak on the user document. The rule is: if yesterday was
  // the last check-in we extend; if it was earlier we reset to 1.
  let newCurrent = 1;
  if (user.lastCheckIn) {
    const gap = diffInDays(today, user.lastCheckIn);
    if (gap === 1) newCurrent = (user.currentStreak || 0) + 1;
    else if (gap === 0) newCurrent = user.currentStreak || 1; // shouldn't happen due to unique index, defensive
  }

  user.currentStreak = newCurrent;
  user.longestStreak = Math.max(user.longestStreak || 0, newCurrent);
  user.lastCheckIn = today;
  user.totalCheckIns = (user.totalCheckIns || 0) + 1;
  await user.save();

  res.status(201).json({
    success: true,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastCheckIn: user.lastCheckIn,
    totalCheckIns: user.totalCheckIns,
  });
});

export const myAttendance = asyncHandler(async (req, res) => {
  const records = await Attendance.find({ user: req.user._id })
    .sort({ date: -1 })
    .limit(365)
    .select('date note');

  res.json({
    success: true,
    records,
    currentStreak: req.user.currentStreak,
    longestStreak: req.user.longestStreak,
    lastCheckIn: req.user.lastCheckIn,
    totalCheckIns: req.user.totalCheckIns,
  });
});

/**
 * Admin endpoint: returns daily counts for the past N days plus a
 * leaderboard of top attendees. Useful for the dashboard chart.
 */
export const attendanceStats = asyncHandler(async (req, res) => {
  const { days } = req.query;
  const since = startOfDayUTC();
  since.setUTCDate(since.getUTCDate() - days + 1);

  const [daily, leaderboard, totalToday] = await Promise.all([
    Attendance.aggregate([
      { $match: { date: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    User.find({ role: 'client' })
      .sort({ currentStreak: -1, totalCheckIns: -1 })
      .limit(10)
      .select('name avatar currentStreak longestStreak totalCheckIns'),
    Attendance.countDocuments({ date: startOfDayUTC() }),
  ]);

  res.json({
    success: true,
    daily,
    leaderboard,
    totalToday,
    rangeDays: days,
  });
});
