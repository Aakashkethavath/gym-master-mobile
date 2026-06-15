import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAllUsers, useAllSubscriptions } from '@/hooks';
import { Card, Avatar, Badge, EmptyState } from '@/components';
import { User, Subscription } from '@/api';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { formatDate } from '@/utils/format';

export default function AdminMembers() {
  const insets = useSafeAreaInsets();
  const { data: users, isLoading, refetch } = useAllUsers();
  const { data: subs } = useAllSubscriptions({ status: 'active' });
  const [query, setQuery] = useState('');

  const clients = (users ?? []).filter((u: User) => u.role === 'client');
  const activeSubIds = new Set((subs?.items ?? []).map((s: Subscription) => (s.user as any)?._id ?? s.user));

  const filtered = clients.filter((u: User) =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={palette.accent} />}
      ListHeaderComponent={
        <View>
          <Text style={s.title}>Members</Text>
          <Text style={s.sub}>{clients.length} registered clients</Text>
          <View style={s.searchRow}>
            <TextInput
              style={s.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or email…"
              placeholderTextColor={palette.inkMuted}
            />
          </View>
          {isLoading && <ActivityIndicator color={palette.accent} style={{ marginVertical: spacing[4] }} />}
          {!isLoading && filtered.length === 0 && <EmptyState emoji="👤" title="No members found" />}
        </View>
      }
      data={filtered}
      keyExtractor={(u) => u._id}
      ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
      renderItem={({ item }) => {
        const hasSub = activeSubIds.has(item._id);
        return (
          <Card>
            <View style={s.row}>
              <Avatar name={item.name} size={44} />
              <View style={s.meta}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.email}>{item.email}</Text>
                {item.city && <Text style={s.city}>{item.city}</Text>}
              </View>
              <View style={s.right}>
                <Badge label={hasSub ? 'Active' : 'Inactive'} variant={hasSub ? 'success' : 'default'} />
                <Text style={s.joinDate}>Joined {formatDate(item.createdAt)}</Text>
              </View>
            </View>
            <View style={s.statsRow}>
              <Stat label="Check-ins" value={item.totalCheckIns} />
              <Stat label="Streak" value={`🔥 ${item.currentStreak}`} />
              <Stat label="Best" value={item.longestStreak} />
            </View>
          </Card>
        );
      }}
    />
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={s.stat}>
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink },
  sub: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2, marginBottom: spacing[4] },
  searchRow: { marginBottom: spacing[4] },
  search: {
    backgroundColor: palette.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing[3],
    height: 44,
    fontFamily: typography.body,
    fontSize: typography.size.base,
    color: palette.ink,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  meta: { flex: 1 },
  name: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink },
  email: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2 },
  city: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
  joinDate: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted },
  statsRow: { flexDirection: 'row', marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: palette.border },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontFamily: 'Syne-Bold', fontSize: typography.size.lg, color: palette.ink },
  statLbl: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
});
