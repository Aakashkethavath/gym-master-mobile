import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useMySubscription, useMyAttendance, useCheckIn, apiErrorMessage } from '@/hooks';
import { Card, StatCard, Badge } from '@/components';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { formatDate, formatDaysRemaining } from '@/utils/format';

function StreakRing({ streak }: { streak: number }) {
  return (
    <View style={ring.outer}>
      <View style={ring.inner}>
        <Text style={ring.fire}>🔥</Text>
        <Text style={ring.value}>{streak}</Text>
        <Text style={ring.label}>day streak</Text>
      </View>
    </View>
  );
}
const ring = StyleSheet.create({
  outer: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 4, borderColor: palette.accent,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.accentSubtle,
  },
  inner: { alignItems: 'center' },
  fire: { fontSize: 28 },
  value: { fontFamily: 'Syne-Bold', fontSize: 36, color: palette.accent, lineHeight: 40 },
  label: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkSecondary },
});

export default function ClientHome() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: sub, isLoading: subLoading, refetch: rSub } = useMySubscription();
  const { data: att, isLoading: attLoading, refetch: rAtt } = useMyAttendance();
  const checkIn = useCheckIn();

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const isLoading = subLoading || attLoading;

  async function handleCheckIn() {
    try {
      await checkIn.mutateAsync();
      Alert.alert('Checked in! 💪', `Streak: ${(att?.currentStreak ?? 0) + 1} day(s)`);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'ALREADY_CHECKED_IN') {
        Alert.alert('Already here!', 'You\'ve already checked in today.');
      } else {
        Alert.alert('Error', apiErrorMessage(err));
      }
    }
  }

  const hasCheckedInToday = (() => {
    if (!att?.lastCheckIn) return false;
    const last = new Date(att.lastCheckIn);
    const today = new Date();
    return last.toDateString() === today.toDateString();
  })();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => Promise.all([rSub(), rAtt()])} tintColor={palette.accent} />}
    >
      {/* Greeting */}
      <Text style={s.greeting}>Good morning,</Text>
      <Text style={s.name}>{firstName} 👋</Text>

      {/* Streak ring + check-in */}
      <Card style={{ alignItems: 'center', paddingVertical: spacing[6], marginTop: spacing[5] }}>
        <StreakRing streak={att?.currentStreak ?? user?.currentStreak ?? 0} />
        <Text style={s.longestStreak}>
          Personal best: {att?.longestStreak ?? user?.longestStreak ?? 0} days
        </Text>
        <TouchableOpacity
          style={[s.checkInBtn, hasCheckedInToday && s.checkInBtnDone]}
          onPress={handleCheckIn}
          disabled={hasCheckedInToday || checkIn.isPending}
          activeOpacity={0.8}
        >
          {checkIn.isPending ? (
            <ActivityIndicator color={palette.bg} />
          ) : (
            <Text style={s.checkInBtnText}>
              {hasCheckedInToday ? '✓ Checked In Today' : 'Check In'}
            </Text>
          )}
        </TouchableOpacity>
      </Card>

      {/* Quick stats */}
      <View style={s.row}>
        <StatCard
          label="Total Visits"
          value={att?.totalCheckIns ?? user?.totalCheckIns ?? 0}
          style={s.halfCard}
        />
        <StatCard
          label="Best Streak"
          value={`${att?.longestStreak ?? 0} 🔥`}
          style={s.halfCard}
        />
      </View>

      {/* Active subscription */}
      <Text style={s.sectionTitle}>My Membership</Text>
      {subLoading && <ActivityIndicator color={palette.accent} style={{ marginVertical: spacing[4] }} />}
      {!subLoading && !sub && (
        <Card style={s.noSub}>
          <Text style={s.noSubEmoji}>💳</Text>
          <Text style={s.noSubTitle}>No active membership</Text>
          <Text style={s.noSubSub}>Go to Plans to subscribe</Text>
        </Card>
      )}
      {sub && (
        <Card>
          <View style={s.subHeader}>
            <Text style={s.subPlanName}>{sub.plan.name}</Text>
            <Badge label="Active" variant="success" />
          </View>
          <Text style={s.subBilling}>{sub.billing === 'monthly' ? 'Monthly' : 'Yearly'} plan</Text>
          <View style={s.subMeta}>
            <View style={s.subMetaItem}>
              <Text style={s.subMetaLabel}>Started</Text>
              <Text style={s.subMetaValue}>{formatDate(sub.startDate)}</Text>
            </View>
            <View style={s.subMetaItem}>
              <Text style={s.subMetaLabel}>Expires</Text>
              <Text style={s.subMetaValue}>{formatDate(sub.endDate)}</Text>
            </View>
          </View>
          <View style={[s.expiryBar, sub.daysRemaining <= 7 && s.expiryBarUrgent]}>
            <Text style={s.expiryText}>{formatDaysRemaining(sub.endDate)}</Text>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  greeting: { fontFamily: typography.body, fontSize: typography.size.md, color: palette.inkSecondary },
  name: { fontFamily: 'Syne-Bold', fontSize: typography.size['3xl'], color: palette.ink, marginTop: 2 },
  longestStreak: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: spacing[3] },
  checkInBtn: {
    marginTop: spacing[4], paddingVertical: spacing[4], paddingHorizontal: spacing[8],
    backgroundColor: palette.accent, borderRadius: radius.full,
    minWidth: 180, alignItems: 'center',
  },
  checkInBtnDone: { backgroundColor: palette.surface2, borderWidth: 1, borderColor: palette.border },
  checkInBtnText: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.bg },
  row: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  halfCard: { flex: 1 },
  sectionTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.lg, color: palette.ink, marginTop: spacing[5], marginBottom: spacing[3] },
  noSub: { alignItems: 'center', paddingVertical: spacing[6] },
  noSubEmoji: { fontSize: 40, marginBottom: spacing[2] },
  noSubTitle: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink },
  noSubSub: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 4 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  subPlanName: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink },
  subBilling: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginBottom: spacing[4] },
  subMeta: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: palette.border, paddingTop: spacing[3] },
  subMetaItem: { flex: 1 },
  subMetaLabel: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted },
  subMetaValue: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.ink, marginTop: 2 },
  expiryBar: {
    marginTop: spacing[3], padding: spacing[2], borderRadius: radius.md,
    backgroundColor: palette.accentSubtle, alignItems: 'center',
  },
  expiryBarUrgent: { backgroundColor: palette.dangerSubtle },
  expiryText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.accent },
});
