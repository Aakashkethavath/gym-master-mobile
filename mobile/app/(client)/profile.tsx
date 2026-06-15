import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { useMyPayments, useTrainers, apiErrorMessage } from '@/hooks';
import { authApi, Trainer, Payment } from '@/api';
import { Card, Avatar, Badge, SectionHeader, Divider } from '@/components';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { formatCurrency, formatDate } from '@/utils/format';

export default function ClientProfile() {
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuth();
  const { data: payments, isLoading: paymentsLoading } = useMyPayments();
  const { data: trainers } = useTrainers();
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ name: user?.name ?? '', contact: user?.contact ?? '', city: user?.city ?? '' });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await authApi.updateMe({
        name: form.name.trim() || undefined,
        contact: form.contact.trim() || undefined,
        city: form.city.trim() || undefined,
      });
      setUser(data.user);
      setEditModal(false);
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

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
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.bg }}
        contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <Card style={{ marginBottom: spacing[5] }}>
          <View style={s.profileRow}>
            <Avatar name={user?.name ?? 'U'} size={60} />
            <View style={s.profileMeta}>
              <Text style={s.profileName}>{user?.name}</Text>
              <Text style={s.profileEmail}>{user?.email}</Text>
              {user?.city && <Text style={s.profileCity}>📍 {user.city}</Text>}
            </View>
            <TouchableOpacity style={s.editBtn} onPress={() => { setForm({ name: user?.name ?? '', contact: user?.contact ?? '', city: user?.city ?? '' }); setEditModal(true); }}>
              <Text style={s.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Trainers */}
        <SectionHeader title="Our Trainers" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[5] }}>
          {(trainers ?? []).map((t: Trainer) => (
            <Card key={t._id} style={{ width: 160, marginRight: spacing[3] }}>
              <Avatar name={t.name} size={40} />
              <Text style={s.trainerName} numberOfLines={1}>{t.name}</Text>
              <Text style={s.trainerSpec} numberOfLines={2}>{t.specialization}</Text>
              {t.experienceYears > 0 && (
                <Text style={s.trainerExp}>{t.experienceYears} yrs</Text>
              )}
            </Card>
          ))}
        </ScrollView>

        {/* Payment history */}
        <SectionHeader title="Payment History" />
        {paymentsLoading && <ActivityIndicator color={palette.accent} style={{ marginVertical: spacing[4] }} />}
        {!paymentsLoading && (payments?.items?.length ?? 0) === 0 && (
          <Text style={s.empty}>No payment history yet.</Text>
        )}
        {(payments?.items ?? []).map((p: Payment) => (
          <Card key={p._id} style={{ marginBottom: spacing[2] }}>
            <View style={s.payRow}>
              <View>
                <Text style={s.payMethod}>{p.method.toUpperCase()} payment</Text>
                <Text style={s.payDate}>{formatDate(p.createdAt)}</Text>
              </View>
              <Badge label={formatCurrency(p.amount)} variant="success" />
            </View>
          </Card>
        ))}

        <SectionHeader title="Feedback" style={{ marginTop: spacing[4] }} />
        <Card style={{ marginBottom: spacing[2] }}>
          <TouchableOpacity style={s.menuItem} onPress={() => router.push('/feedback' as any)}>
            <Text style={s.menuItemText}>💬 Leave Gym Feedback</Text>
            <Text style={s.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <Divider style={{ marginTop: spacing[4] }} />

        {/* Danger zone */}
        <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editModal} animationType="slide" presentationStyle="formSheet">
        <View style={{ flex: 1, backgroundColor: palette.bg, padding: spacing[5] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] }}>
            <Text style={{ fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink }}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Text style={{ color: palette.inkSecondary, fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Input label="Full Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Your name" />
          <Input label="Phone" value={form.contact} onChangeText={(v) => setForm((f) => ({ ...f, contact: v }))} keyboardType="phone-pad" placeholder="+91…" />
          <Input label="City" value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} placeholder="Mumbai" />
          <Button label="Save Changes" onPress={handleSave} loading={saving} style={{ marginTop: spacing[4] }} />
          <Button label="Cancel" onPress={() => setEditModal(false)} variant="ghost" style={{ marginTop: spacing[2] }} />
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  profileMeta: { flex: 1 },
  profileName: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink },
  profileEmail: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2 },
  profileCity: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2 },
  editBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.md, borderWidth: 1, borderColor: palette.border },
  editBtnText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary },
  trainerName: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink, marginTop: spacing[2] },
  trainerSpec: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.accent, marginTop: 2 },
  trainerExp: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payMethod: { fontFamily: typography.bodyMedium, fontSize: typography.size.base, color: palette.ink },
  payDate: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
  empty: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkMuted, textAlign: 'center', paddingVertical: spacing[4] },
  logoutBtn: {
    marginTop: spacing[4], paddingVertical: spacing[4], borderRadius: radius.lg,
    backgroundColor: palette.dangerSubtle, borderWidth: 1, borderColor: palette.danger, alignItems: 'center',
  },
  logoutText: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.danger },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  menuItemText: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.size.base,
    color: palette.ink,
  },
  menuItemArrow: {
    color: palette.inkSecondary,
    fontSize: 18,
  },
});
