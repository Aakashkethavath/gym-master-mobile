import React from 'react';
import { Payment } from '@/api';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useAllPayments } from '@/hooks';
import { Card, StatCard, SectionHeader, Badge, Avatar } from '@/components';
import { palette, spacing, typography } from '@/theme/tokens';
import { formatCurrency, formatDate } from '@/utils/format';

export default function AdminMore() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: payments, isLoading } = useAllPayments();

  function confirmLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        logout();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <Card style={{ marginBottom: spacing[5] }}>
        <View style={s.profileRow}>
          <Avatar name={user?.name ?? 'A'} size={52} />
          <View style={s.profileMeta}>
            <Text style={s.profileName}>{user?.name}</Text>
            <Text style={s.profileEmail}>{user?.email}</Text>
            <Badge label="Administrator" variant="info" style={{ marginTop: 4 }} />
          </View>
        </View>
      </Card>

      {/* Revenue summary */}
      <SectionHeader title="Revenue Summary" />
      {isLoading ? <ActivityIndicator color={palette.accent} style={{ marginVertical: spacing[4] }} /> : (
        <>
          <View style={s.row}>
            <StatCard label="Total Revenue" value={formatCurrency(payments?.totalRevenue ?? 0)} style={s.halfCard} />
            <StatCard label="This Month" value={formatCurrency(payments?.monthRevenue ?? 0)} accent style={s.halfCard} />
          </View>
          <StatCard label="Total Transactions" value={payments?.total ?? 0} style={{ marginTop: spacing[3] }} />

          {/* Recent payments */}
          <SectionHeader title="Recent Payments" style={{ marginTop: spacing[5] }} />
          {(payments?.items ?? []).slice(0, 10).map((p: Payment) => (
            <Card key={p._id} style={{ marginBottom: spacing[2] }}>
              <View style={s.payRow}>
                <View style={s.payMeta}>
                  <Text style={s.payUser}>{(p.user as any).name}</Text>
                  <Text style={s.payDate}>{formatDate(p.createdAt)} · {p.method.toUpperCase()}</Text>
                </View>
                <Text style={s.payAmount}>{formatCurrency(p.amount)}</Text>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Sign out */}
      <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  profileMeta: { flex: 1 },
  profileName: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink },
  profileEmail: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2 },
  row: { flexDirection: 'row', gap: spacing[3] },
  halfCard: { flex: 1 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payMeta: {},
  payUser: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink },
  payDate: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
  payAmount: { fontFamily: 'Syne-Bold', fontSize: typography.size.md, color: palette.accent },
  logoutBtn: {
    marginTop: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.dangerSubtle,
    backgroundColor: palette.dangerSubtle,
    alignItems: 'center',
  },
  logoutText: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.danger },
});
