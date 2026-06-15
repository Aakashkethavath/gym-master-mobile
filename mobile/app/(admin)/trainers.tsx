import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTrainers, useCreateTrainer, useUpdateTrainer, useDeleteTrainer } from '@/hooks';
import { Card, Avatar, Badge, Button, EmptyState } from '@/components';
import { Input } from '@/components/Input';
import { Trainer } from '@/api';
import { palette, spacing, typography, radius } from '@/theme/tokens';

type FormState = Omit<Trainer, '_id' | 'isActive'>;
const EMPTY: FormState = { name: '', specialization: '', bio: '', experienceYears: 0, phone: '', email: '', avatar: '' };

export default function AdminTrainers() {
  const insets = useSafeAreaInsets();
  const { data: trainers, isLoading, refetch } = useTrainers();
  const createMut = useCreateTrainer();
  const updateMut = useUpdateTrainer();
  const deleteMut = useDeleteTrainer();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setModalVisible(true);
  }

  function openEdit(t: Trainer) {
    setEditing(t);
    setForm({ name: t.name, specialization: t.specialization, bio: t.bio ?? '', experienceYears: t.experienceYears, phone: t.phone ?? '', email: t.email ?? '', avatar: t.avatar ?? '' });
    setErrors({});
    setModalVisible(true);
  }

  function update(key: keyof FormState, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.specialization.trim()) e.specialization = 'Specialization is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const payload = { ...form, experienceYears: Number(form.experienceYears) };
    if (editing) {
      await updateMut.mutateAsync({ id: editing._id, body: payload });
    } else {
      await createMut.mutateAsync(payload as any);
    }
    setModalVisible(false);
  }

  function handleDelete(t: Trainer) {
    Alert.alert('Delete Trainer', `Remove ${t.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteMut.mutate(t._id),
      },
    ]);
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: palette.bg }}
        contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={palette.accent} />}
        ListHeaderComponent={
          <View>
            <View style={s.headerRow}>
              <View>
                <Text style={s.title}>Trainers</Text>
                <Text style={s.sub}>{trainers?.length ?? 0} on staff</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={openCreate}>
                <Text style={s.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {!isLoading && (trainers?.length ?? 0) === 0 && <EmptyState emoji="🏋️" title="No trainers yet" subtitle="Add your first trainer" />}
          </View>
        }
        data={trainers ?? []}
        keyExtractor={(t) => t._id}
        ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={s.row}>
              <Avatar name={item.name} size={48} />
              <View style={s.meta}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.spec}>{item.specialization}</Text>
                {item.experienceYears > 0 && (
                  <Text style={s.exp}>{item.experienceYears} yrs experience</Text>
                )}
              </View>
              <View style={s.actions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={s.editBtn}>
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={s.delBtn}>
                  <Text style={s.delBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
            {item.bio && <Text style={s.bio} numberOfLines={2}>{item.bio}</Text>}
          </Card>
        )}
      />

      {/* Add / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="formSheet">
        <View style={{ flex: 1, backgroundColor: palette.bg, padding: spacing[5] }}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{editing ? 'Edit Trainer' : 'New Trainer'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: palette.inkSecondary, fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Input label="Name *" value={form.name} onChangeText={(v) => update('name', v)} error={errors.name} placeholder="Anjali Mehra" />
            <Input label="Specialization *" value={form.specialization} onChangeText={(v) => update('specialization', v)} error={errors.specialization} placeholder="Strength & Conditioning" />
            <Input label="Experience (years)" value={String(form.experienceYears)} onChangeText={(v) => update('experienceYears', v)} keyboardType="numeric" placeholder="0" />
            <Input label="Bio" value={form.bio} onChangeText={(v) => update('bio', v)} placeholder="Short biography…" multiline numberOfLines={3} />
            <Input label="Phone" value={form.phone} onChangeText={(v) => update('phone', v)} keyboardType="phone-pad" placeholder="+91…" />
            <Input label="Email" value={form.email} onChangeText={(v) => update('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="trainer@gym.com" />
            <Input label="Avatar URL" value={form.avatar} onChangeText={(v) => update('avatar', v)} placeholder="https://…" />
            <Button label={editing ? 'Save Changes' : 'Add Trainer'} onPress={handleSave} loading={isSaving} style={{ marginTop: spacing[4] }} />
            <Button label="Cancel" onPress={() => setModalVisible(false)} variant="ghost" style={{ marginTop: spacing[2] }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  title: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink },
  sub: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2 },
  addBtn: { backgroundColor: palette.accent, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.md },
  addBtnText: { fontFamily: typography.bodySemibold, fontSize: typography.size.sm, color: palette.bg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  meta: { flex: 1 },
  name: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink },
  spec: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.accent, marginTop: 2 },
  exp: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
  bio: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: spacing[3] },
  actions: { gap: spacing[2] },
  editBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.sm, borderWidth: 1, borderColor: palette.border },
  editBtnText: { fontFamily: typography.bodyMedium, fontSize: typography.size.xs, color: palette.inkSecondary },
  delBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.sm, backgroundColor: palette.dangerSubtle },
  delBtnText: { fontFamily: typography.bodyMedium, fontSize: typography.size.xs, color: palette.danger },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] },
  modalTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink },
});
