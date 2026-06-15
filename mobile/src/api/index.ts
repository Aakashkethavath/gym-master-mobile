import api from './client';

export interface User {
  _id: string; name: string; email: string; role: 'admin' | 'client';
  contact?: string; city?: string; avatar?: string;
  currentStreak: number; longestStreak: number; lastCheckIn: string | null;
  totalCheckIns: number; createdAt: string;
}
export interface Plan {
  _id: string; name: string; tagline?: string; description?: string;
  monthlyPrice: number; yearlyPrice: number; features: Record<string, boolean>;
  isActive: boolean; sortOrder: number;
}
export interface Trainer {
  _id: string; name: string; specialization: string; bio?: string;
  experienceYears: number; phone?: string; email?: string; avatar?: string; isActive: boolean;
}
export interface Subscription {
  _id: string; user: User | string; plan: Plan;
  billing: 'monthly' | 'yearly'; amount: number;
  startDate: string; endDate: string;
  status: 'active' | 'expired' | 'cancelled'; daysRemaining: number;
}
export interface Payment {
  _id: string; user: User | { name: string; email: string };
  subscription: { billing: string; startDate: string; endDate: string };
  amount: number; currency: string; method: string; status: string; createdAt: string;
}
export interface AttendanceRecord { _id: string; date: string; note?: string; }
export interface WorkoutExercise { name: string; sets: number; reps: number; weightKg: number; }
export interface Workout {
  _id: string; date: string; type: string; durationMinutes: number;
  caloriesBurned: number; exercises: WorkoutExercise[]; notes?: string; createdAt: string;
}
export interface Paginated<T> { items: T[]; total: number; page: number; limit: number; }
export interface Exercise {
  id: string; name: string; bodyPart: string; equipment: string;
  target: string; gifUrl: string; secondaryMuscles: string[]; instructions: string[];
}
export interface RazorpayOrderResponse {
  orderId: string; amountPaise: number; currency: string; keyId: string;
}

export interface Feedback {
  _id: string;
  user?: User | string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

// Auth
export const authApi = {
  register: (b: { name: string; email: string; password: string; contact?: string; city?: string }) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', b),
  login: (email: string, password: string) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', { email, password }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get<{ user: User }>('/auth/me'),
  updateMe: (b: Partial<Pick<User, 'name' | 'contact' | 'city' | 'avatar'>>) =>
    api.patch<{ user: User }>('/users/me', b),
};

// Plans
export const plansApi = {
  list: () => api.get<{ plans: Plan[] }>('/plans'),
  get: (id: string) => api.get<{ plan: Plan }>(`/plans/${id}`),
  create: (b: any) => api.post<{ plan: Plan }>('/plans', b),
  update: (id: string, b: Partial<Plan>) => api.patch<{ plan: Plan }>(`/plans/${id}`, b),
  delete: (id: string) => api.delete(`/plans/${id}`),
};

// Trainers
export const trainersApi = {
  list: () => api.get<{ trainers: Trainer[] }>('/trainers'),
  get: (id: string) => api.get<{ trainer: Trainer }>(`/trainers/${id}`),
  create: (b: any) => api.post<{ trainer: Trainer }>('/trainers', b),
  update: (id: string, b: Partial<Trainer>) => api.patch<{ trainer: Trainer }>(`/trainers/${id}`, b),
  delete: (id: string) => api.delete(`/trainers/${id}`),
};

// Subscriptions
export const subscriptionsApi = {
  subscribe: (b: { planId: string; billing: 'monthly' | 'yearly'; paymentMethod?: string }) =>
    api.post<{ subscription: Subscription; payment: Payment }>('/subscriptions', b),
  my: () => api.get<{ subscription: Subscription | null }>('/subscriptions/me'),
  list: (p?: { page?: number; status?: string; expiringInDays?: number }) =>
    api.get<{ items: any[]; total: number }>('/subscriptions', { params: p }),
};

// Razorpay gateway
export const gatewayApi = {
  createOrder: (b: { planId: string; billing: 'monthly' | 'yearly'; idempotencyKey?: string }) =>
    api.post<RazorpayOrderResponse>('/gateway/razorpay/order', b),
  verifyPayment: (b: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    api.post<{ subscription: Subscription; payment: Payment }>('/gateway/razorpay/verify', b),
};

// Attendance
export const attendanceApi = {
  checkIn: () => api.post<{ currentStreak: number; longestStreak: number; lastCheckIn: string; totalCheckIns: number }>('/attendance/check-in'),
  my: () => api.get<{ records: AttendanceRecord[]; currentStreak: number; longestStreak: number; lastCheckIn: string | null; totalCheckIns: number }>('/attendance/me'),
  stats: (days = 30) => api.get<{ daily: { _id: string; count: number }[]; leaderboard: User[]; totalToday: number; rangeDays: number }>('/attendance/stats', { params: { days } }),
};

// Workouts
export const workoutsApi = {
  create: (b: any) => api.post<{ workout: Workout }>('/workouts', b),
  my: (p?: { page?: number; limit?: number }) => api.get<Paginated<Workout>>('/workouts/me', { params: p }),
};

// Payments
export const paymentsApi = {
  my: (p?: { page?: number }) => api.get<Paginated<Payment>>('/payments/me', { params: p }),
  all: (p?: { page?: number }) => api.get<Paginated<Payment> & { totalRevenue: number; monthRevenue: number }>('/payments', { params: p }),
};

// Users (admin)
export const usersApi = {
  list: () => api.get<{ users: User[] }>('/users'),
  total: () => api.get<{ total: number }>('/users/stats/total'),
};

// Exercises — subscription-gated on the server
export const exercisesApi = {
  bodyPartList: () => api.get<{ data: string[] }>('/exercises/bodyPartList'),
  list: (p?: { limit?: number; offset?: number }) =>
    api.get<{ data: Exercise[]; limit: number; offset: number }>('/exercises', { params: p }),
  byBodyPart: (bodyPart: string, p?: { limit?: number; offset?: number }) =>
    api.get<{ data: Exercise[] }>(`/exercises/bodyPart/${encodeURIComponent(bodyPart)}`, { params: p }),
  byEquipment: (equipment: string, p?: { limit?: number; offset?: number }) =>
    api.get<{ data: Exercise[] }>(`/exercises/equipment/${encodeURIComponent(equipment)}`, { params: p }),
  search: (q: string, p?: { limit?: number; offset?: number }) =>
    api.get<{ data: Exercise[] }>('/exercises/search', { params: { q, ...p } }),
  get: (id: string) => api.get<{ data: Exercise }>(`/exercises/${id}`),
};

// Feedback
export const feedbackApi = {
  list: () => api.get<{ feedback: Feedback[] }>('/feedback'),
  create: (b: { name: string; rating: number; comment: string }) =>
    api.post<{ feedback: Feedback }>('/feedback', b),
};
