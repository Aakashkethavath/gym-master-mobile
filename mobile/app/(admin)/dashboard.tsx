import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useAllPayments, useAttendanceStats,
  useAllSubscriptions, useAllUsers,
} from '@/hooks';
import { User } from '@/api';
import {
  Card, StatCard, SectionHeader, Badge, Avatar, Divider,
} from '@/components';
import { palette, spacing, typography } from '@/theme/tokens';
import { APP_NAME } from '@/constants';
import { formatCurrency, formatDate, formatDaysRemaining } from '@/utils/format';

function MiniBar({ data }: { data: { _id: string; count: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const last14 = data.slice(-14);
  return (
    <View style={bar.row}>
      {last14.map((d) => (
        <View key={d._id} style={bar.col}>
          <View style={[bar.fill, { height: Math.max(4, (d.count / max) * 48) }]} />
          <Text style={bar.label}>{d._id.slice(8)}</Text>
        </View>
      ))}
    </View>
  );
}
const bar = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingTop: 8 },
  col: { flex: 1, alignItems: 'center' },
  fill: { width: '100%', backgroundColor: palette.accent, borderRadius: 2 },
  label: { fontSize: 8, color: palette.inkMuted, marginTop: 3, fontFamily: typography.body },
});

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { data: payments, isLoading: paymentsLoading, refetch: rp } = useAllPayments();
  const { data: stats, isLoading: statsLoading, refetch: rs } = useAttendanceStats(30);
  const { data: expiring, isLoading: expLoading, refetch: re } = useAllSubscriptions({ expiringInDays: 7 });
  const { data: users } = useAllUsers();

  const isLoading = paymentsLoading || statsLoading || expLoading;
  const refresh = () => Promise.all([rp(), rs(), re()]);

  const totalMembers = users?.filter((u: User) => u.role === 'client').length ?? 0;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={palette.accent} />}
      ListHeaderComponent={
        <>
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>Admin Dashboard</Text>
              <Text style={s.sub}>{APP_NAME} overview</Text>
            </View>
            <View style={s.dot} />
          </View>

          {/* KPI row */}
          <View style={s.row}>
            <StatCard label="Members" value={totalMembers} style={s.halfCard} />
            <StatCard
              label="Today's Check-ins"
              value={stats?.totalToday ?? '—'}
              accent
              style={s.halfCard}
            />
          </View>
          <View style={[s.row, { marginTop: spacing[3] }]}>
            <StatCard
              label="Total Revenue"
              value={payments ? formatCurrency(payments.totalRevenue) : '—'}
              style={s.halfCard}
            />
            <StatCard
              label="This Month"
              value={payments ? formatCurrency(payments.monthRevenue) : '—'}
              style={s.halfCard}
            />
          </View>

          {/* Attendance chart */}
          <Card style={{ marginTop: spacing[4] }}>
            <SectionHeader title="Attendance (30 days)" />
            {statsLoading ? (
              <ActivityIndicator color={palette.accent} style={{ marginVertical: 24 }} />
            ) : (
              <MiniBar data={stats?.daily ?? []} />
            )}
          </Card>

          {/* Leaderboard */}
          {(stats?.leaderboard?.length ?? 0) > 0 && (
            <>
              <SectionHeader title="Streak Leaderboard" style={{ marginTop: spacing[5] }} />
              {stats!.leaderboard.slice(0, 5).map((u: User, i: number) => (
                <Card key={u._id} style={{ marginBottom: spacing[2] }}>
                  <View style={s.leaderRow}>
                    <Text style={s.leaderRank}>#{i + 1}</Text>
                    <Avatar name={u.name} size={36} />
                    <View style={s.leaderMeta}>
                      <Text style={s.leaderName}>{u.name}</Text>
                      <Text style={s.leaderSub}>{u.totalCheckIns} total visits</Text>
                    </View>
                    <Text style={s.streak}>🔥 {u.currentStreak}</Text>
                  </View>
                </Card>
              ))}
            </>
          )}

          {/* Expiring subs */}
          <SectionHeader
            title={`Expiring in 7 days (${expiring?.total ?? 0})`}
            style={{ marginTop: spacing[5] }}
          />
          {expLoading && <ActivityIndicator color={palette.accent} />}
          {!expLoading && (expiring?.items?.length ?? 0) === 0 && (
            <Text style={s.empty}>No subscriptions expiring soon.</Text>
          )}
        </>
      }
      data={expiring?.items ?? []}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing[2] }}>
          <View style={s.subRow}>
            <Avatar name={(item.user as any).name ?? 'U'} size={36} />
            <View style={s.subMeta}>
              <Text style={s.subName}>{(item.user as any).name}</Text>
              <Text style={s.subPlan}>{item.plan.name} · {item.billing}</Text>
            </View>
            <Badge
              label={formatDaysRemaining(item.endDate)}
              variant={item.daysRemaining <= 3 ? 'danger' : 'warning'}
            />
          </View>
        </Card>
      )}
    />
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[5] },
  greeting: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink },
  sub: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.accent },
  row: { flexDirection: 'row', gap: spacing[3] },
  halfCard: { flex: 1 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  leaderRank: { fontFamily: 'Syne-Bold', fontSize: typography.size.md, color: palette.inkMuted, width: 24 },
  leaderMeta: { flex: 1 },
  leaderName: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink },
  leaderSub: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary },
  streak: { fontFamily: 'Syne-Bold', fontSize: typography.size.base, color: palette.accent },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  subMeta: { flex: 1 },
  subName: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink },
  subPlan: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary },
  empty: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkMuted, textAlign: 'center', paddingVertical: spacing[4] },
});
