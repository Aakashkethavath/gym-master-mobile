import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuth } from '@/context/AuthContext';
import {
  plansApi, trainersApi, subscriptionsApi, attendanceApi,
  workoutsApi, paymentsApi, usersApi, feedbackApi,
} from '@/api';
import { QUERY_KEYS } from '@/constants';

// ─── Error helper ─────────────────────────────────────────────────────────
export function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.message ?? err.message;
  }
  return 'Something went wrong. Please try again.';
}

// ─── Plans ────────────────────────────────────────────────────────────────
export function usePlans() {
  return useQuery({
    queryKey: QUERY_KEYS.PLANS,
    queryFn: async () => {
      const { data } = await plansApi.list();
      return data.plans;
    },
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof plansApi.create>[0]) => plansApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PLANS }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof plansApi.update>[1] }) =>
      plansApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PLANS }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plansApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PLANS }),
  });
}

// ─── Trainers ─────────────────────────────────────────────────────────────
export function useTrainers() {
  return useQuery({
    queryKey: QUERY_KEYS.TRAINERS,
    queryFn: async () => {
      const { data } = await trainersApi.list();
      return data.trainers;
    },
  });
}

export function useCreateTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof trainersApi.create>[0]) => trainersApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.TRAINERS }),
  });
}

export function useUpdateTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof trainersApi.update>[1] }) =>
      trainersApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.TRAINERS }),
  });
}

export function useDeleteTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => trainersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.TRAINERS }),
  });
}

// ─── Subscription ─────────────────────────────────────────────────────────
export function useMySubscription() {
  return useQuery({
    queryKey: QUERY_KEYS.MY_SUBSCRIPTION,
    queryFn: async () => {
      const { data } = await subscriptionsApi.my();
      return data.subscription;
    },
  });
}

export function useAllSubscriptions(params?: Parameters<typeof subscriptionsApi.list>[0]) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SUBSCRIPTIONS, params],
    queryFn: async () => {
      const { data } = await subscriptionsApi.list(params);
      return data;
    },
  });
}

export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof subscriptionsApi.subscribe>[0]) =>
      subscriptionsApi.subscribe(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MY_SUBSCRIPTION });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTIONS });
    },
  });
}

// ─── Attendance ───────────────────────────────────────────────────────────
export function useMyAttendance() {
  return useQuery({
    queryKey: QUERY_KEYS.MY_ATTENDANCE,
    queryFn: async () => {
      const { data } = await attendanceApi.my();
      return data;
    },
  });
}

export function useAttendanceStats(days = 30) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ATTENDANCE_STATS, days],
    queryFn: async () => {
      const { data } = await attendanceApi.stats(days);
      return data;
    },
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: () => attendanceApi.checkIn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MY_ATTENDANCE });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ATTENDANCE_STATS });
      refreshUser();
    },
  });
}

// ─── Workouts ─────────────────────────────────────────────────────────────
export function useMyWorkouts(page = 1) {
  return useQuery({
    queryKey: [...QUERY_KEYS.MY_WORKOUTS, page],
    queryFn: async () => {
      const { data } = await workoutsApi.my({ page, limit: 20 });
      return data;
    },
  });
}

export function useLogWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof workoutsApi.create>[0]) => workoutsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.MY_WORKOUTS }),
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────
export function useMyPayments() {
  return useQuery({
    queryKey: QUERY_KEYS.MY_PAYMENTS,
    queryFn: async () => {
      const { data } = await paymentsApi.my();
      return data;
    },
  });
}

export function useAllPayments() {
  return useQuery({
    queryKey: QUERY_KEYS.ALL_PAYMENTS,
    queryFn: async () => {
      const { data } = await paymentsApi.all();
      return data;
    },
  });
}

// ─── Users ────────────────────────────────────────────────────────────────
export function useAllUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.USERS,
    queryFn: async () => {
      const { data } = await usersApi.list();
      return data.users;
    },
  });
}

// ─── Feedback ─────────────────────────────────────────────────────────────
export function useFeedback() {
  return useQuery({
    queryKey: QUERY_KEYS.FEEDBACK,
    queryFn: async () => {
      const { data } = await feedbackApi.list();
      return data.feedback;
    },
  });
}

export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; rating: number; comment: string }) =>
      feedbackApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.FEEDBACK });
    },
  });
}
