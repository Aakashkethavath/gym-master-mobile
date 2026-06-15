import appJson from '../../app.json';
export const APP_NAME = appJson.expo.name;

export const QUERY_KEYS = {
  ME: ['auth', 'me'],
  PLANS: ['plans'],
  PLAN: (id: string) => ['plans', id],
  TRAINERS: ['trainers'],
  TRAINER: (id: string) => ['trainers', id],
  MY_SUBSCRIPTION: ['subscriptions', 'me'],
  SUBSCRIPTIONS: ['subscriptions'],
  MY_ATTENDANCE: ['attendance', 'me'],
  ATTENDANCE_STATS: ['attendance', 'stats'],
  MY_WORKOUTS: ['workouts', 'me'],
  MY_PAYMENTS: ['payments', 'me'],
  ALL_PAYMENTS: ['payments'],
  USERS: ['users'],
  FEEDBACK: ['feedback'],
};

export const BILLING_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export const WORKOUT_TYPES = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'other', label: 'Other' },
] as const;

export const FEATURE_LABELS: Record<string, string> = {
  waterStations: 'Water Stations',
  lockerRooms: 'Locker Rooms',
  wifi: 'Wi-Fi',
  cardioClasses: 'Cardio Classes',
  refreshments: 'Refreshments',
  groupClasses: 'Group Classes',
  personalTrainer: 'Personal Trainer',
  specialEvents: 'Special Events',
  cafe: 'Café & Lounge',
};
