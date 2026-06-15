import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert, ScrollView, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan } from '@/hooks';
import { Card, Button, FeatureRow, EmptyState } from '@/components';
import { Input } from '@/components/Input';
import { Plan } from '@/api';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { formatCurrency } from '@/utils/format';
import { FEATURE_LABELS } from '@/constants';

const FEATURE_KEYS = Object.keys(FEATURE_LABELS) as (keyof Plan['features'])[];

type FormFeatures = Record<string, boolean>;
interface FormState {
  name: string;
  tagline: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: FormFeatures;
}

const EMPTY: FormState = {
  name: '', tagline: '', description: '',
  monthlyPrice: '', yearlyPrice: '',
  features: Object.fromEntries(FEATURE_KEYS.map((k) => [k, false])),
};

export default function AdminPlans() {
  const insets = useSafeAreaInsets();
  const { data: plans, isLoading, refetch } = usePlans();
  const createMut = useCreatePlan();
  const updateMut = useUpdatePlan();
  const deleteMut = useDeletePlan();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setModalVisible(true);
  }

  function openEdit(p: Plan) {
    setEditing(p);
    setForm({
      name: p.name,
      tagline: p.tagline ?? '',
      description: p.description ?? '',
      monthlyPrice: String(p.monthlyPrice),
      yearlyPrice: String(p.yearlyPrice),
      features: { ...Object.fromEntries(FEATURE_KEYS.map((k) => [k, false])), ...p.features },
    });
    setErrors({});
    setModalVisible(true);
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.monthlyPrice || isNaN(Number(form.monthlyPrice))) e.monthlyPrice = 'Enter a valid price';
    if (!form.yearlyPrice || isNaN(Number(form.yearlyPrice))) e.yearlyPrice = 'Enter a valid price';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      monthlyPrice: Number(form.monthlyPrice),
      yearlyPrice: Number(form.yearlyPrice),
      features: form.features,
    };
    if (editing) {
      await updateMut.mutateAsync({ id: editing._id, body: payload });
    } else {
      await createMut.mutateAsync(payload as any);
    }
    setModalVisible(false);
  }

  function confirmDelete(p: Plan) {
    Alert.alert('Delete Plan', `Delete "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(p._id) },
    ]);
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: palette.bg }}
        contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
        ListHeaderComponent={
          <View>
            <View style={s.headerRow}>
              <View>
                <Text style={s.title}>Plans</Text>
                <Text style={s.sub}>{plans?.length ?? 0} membership plans</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={openCreate}>
                <Text style={s.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {!isLoading && (plans?.length ?? 0) === 0 && <EmptyState emoji="💳" title="No plans yet" />}
          </View>
        }
        data={plans ?? []}
        keyExtractor={(p) => p._id}
        ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={s.row}>
              <View style={s.meta}>
                <Text style={s.planName}>{item.name}</Text>
                {item.tagline && <Text style={s.tagline}>{item.tagline}</Text>}
              </View>
              <View style={s.priceCol}>
                <Text style={s.price}>{formatCurrency(item.monthlyPrice)}<Text style={s.priceSub}>/mo</Text></Text>
                <Text style={s.priceSub2}>{formatCurrency(item.yearlyPrice)}/yr</Text>
              </View>
            </View>
            <View style={s.featGrid}>
              {FEATURE_KEYS.filter((k) => item.features[k]).slice(0, 4).map((k) => (
                <View key={k} style={s.featBadge}>
                  <Text style={s.featBadgeText}>{FEATURE_LABELS[k]}</Text>
                </View>
              ))}
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.delBtn} onPress={() => confirmDelete(item)}>
                <Text style={s.delBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="formSheet">
        <View style={{ flex: 1, backgroundColor: palette.bg, padding: spacing[5] }}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{editing ? 'Edit Plan' : 'New Plan'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: palette.inkSecondary, fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Input label="Plan Name *" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} error={errors.name} placeholder="Pro" />
            <Input label="Tagline" value={form.tagline} onChangeText={(v) => setForm((f) => ({ ...f, tagline: v }))} placeholder="Train smarter" />
            <Input label="Description" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Full details…" multiline numberOfLines={3} />
            <View style={s.priceRow}>
              <View style={{ flex: 1 }}>
                <Input label="Monthly Price (₹) *" value={form.monthlyPrice} onChangeText={(v) => setForm((f) => ({ ...f, monthlyPrice: v }))} error={errors.monthlyPrice} keyboardType="numeric" placeholder="1799" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Yearly Price (₹) *" value={form.yearlyPrice} onChangeText={(v) => setForm((f) => ({ ...f, yearlyPrice: v }))} error={errors.yearlyPrice} keyboardType="numeric" placeholder="17999" />
              </View>
            </View>
            <Text style={s.featuresTitle}>Features</Text>
            {FEATURE_KEYS.map((key) => (
              <View key={key} style={s.switchRow}>
                <Text style={s.switchLabel}>{FEATURE_LABELS[key]}</Text>
                <Switch
                  value={!!form.features[key]}
                  onValueChange={(v) => setForm((f) => ({ ...f, features: { ...f.features, [key]: v } }))}
                  trackColor={{ true: palette.accent, false: palette.surface3 }}
                  thumbColor={palette.white}
                />
              </View>
            ))}
            <Button label={editing ? 'Save Changes' : 'Create Plan'} onPress={handleSave} loading={isSaving} style={{ marginTop: spacing[5] }} />
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  meta: { flex: 1 },
  planName: { fontFamily: 'Syne-Bold', fontSize: typography.size.lg, color: palette.ink },
  tagline: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { fontFamily: 'Syne-Bold', fontSize: typography.size.lg, color: palette.accent },
  priceSub: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkSecondary },
  priceSub2: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted },
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing[3] },
  featBadge: { backgroundColor: palette.accentSubtle, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  featBadgeText: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.accent },
  actions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] },
  editBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.md, borderWidth: 1, borderColor: palette.border },
  editBtnText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary },
  delBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.md, backgroundColor: palette.dangerSubtle },
  delBtnText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.danger },
  priceRow: { flexDirection: 'row', gap: spacing[3] },
  featuresTitle: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink, marginBottom: spacing[2] },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: palette.border },
  switchLabel: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.ink },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] },
  modalTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink },
});
