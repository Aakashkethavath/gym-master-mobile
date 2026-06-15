import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyWorkouts, useLogWorkout, apiErrorMessage } from '@/hooks';
import { Card, Badge, Button, EmptyState } from '@/components';
import { Input } from '@/components/Input';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { formatDate, capitalize } from '@/utils/format';
import { WORKOUT_TYPES } from '@/constants';
import { WorkoutExercise } from '@/api';

interface ExerciseForm { name: string; sets: string; reps: string; weightKg: string }
const EMPTY_EX: ExerciseForm = { name: '', sets: '', reps: '', weightKg: '' };

interface WorkoutForm {
  type: string;
  durationMinutes: string;
  caloriesBurned: string;
  notes: string;
  exercises: ExerciseForm[];
}

const EMPTY_FORM: WorkoutForm = {
  type: 'strength', durationMinutes: '', caloriesBurned: '', notes: '', exercises: [],
};

const TYPE_BADGE: Record<string, string> = {
  strength: 'default', cardio: 'info', hiit: 'danger', yoga: 'success', crossfit: 'warning', other: 'default',
};

export default function ClientWorkouts() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = useMyWorkouts();
  const logMut = useLogWorkout();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<WorkoutForm>(EMPTY_FORM);

  function addExercise() {
    setForm((f) => ({ ...f, exercises: [...f.exercises, { ...EMPTY_EX }] }));
  }
  function updateExercise(i: number, key: keyof ExerciseForm, val: string) {
    setForm((f) => {
      const ex = [...f.exercises];
      ex[i] = { ...ex[i], [key]: val };
      return { ...f, exercises: ex };
    });
  }
  function removeExercise(i: number) {
    setForm((f) => ({ ...f, exercises: f.exercises.filter((_, idx) => idx !== i) }));
  }

  async function handleSave() {
    try {
      await logMut.mutateAsync({
        type: form.type as any,
        durationMinutes: Number(form.durationMinutes) || 0,
        caloriesBurned: Number(form.caloriesBurned) || 0,
        notes: form.notes.trim() || undefined,
        exercises: form.exercises
          .filter((e) => e.name.trim())
          .map((e) => ({
            name: e.name.trim(),
            sets: Number(e.sets) || 0,
            reps: Number(e.reps) || 0,
            weightKg: Number(e.weightKg) || 0,
          })),
      } as any);
      setModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      Alert.alert('Error', apiErrorMessage(err));
    }
  }

  const workouts = data?.items ?? [];

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: palette.bg }}
        contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
        ListHeaderComponent={
          <View>
            <View style={s.headerRow}>
              <View>
                <Text style={s.title}>Workouts</Text>
                <Text style={s.sub}>{data?.total ?? 0} sessions logged</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={() => { setForm(EMPTY_FORM); setModal(true); }}>
                <Text style={s.addBtnText}>+ Log</Text>
              </TouchableOpacity>
            </View>
            {!isLoading && workouts.length === 0 && (
              <EmptyState emoji="💪" title="No workouts yet" subtitle="Log your first session" />
            )}
          </View>
        }
        data={workouts}
        keyExtractor={(w) => w._id}
        ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={s.wRow}>
              <View style={s.wMeta}>
                <Text style={s.wType}>{capitalize(item.type)}</Text>
                <Text style={s.wDate}>{formatDate(item.date)}</Text>
              </View>
              <Badge label={item.type} variant={(TYPE_BADGE[item.type] ?? 'default') as any} />
            </View>
            <View style={s.wStats}>
              {item.durationMinutes > 0 && <Chip label={`${item.durationMinutes} min`} />}
              {item.caloriesBurned > 0 && <Chip label={`${item.caloriesBurned} kcal`} />}
              {item.exercises.length > 0 && <Chip label={`${item.exercises.length} exercises`} />}
            </View>
            {item.exercises.length > 0 && (
              <View style={s.exList}>
                {item.exercises.slice(0, 3).map((e: WorkoutExercise, i: number) => (
                  <Text key={i} style={s.exItem}>· {e.name} {e.sets}×{e.reps}{e.weightKg ? ` @ ${e.weightKg}kg` : ''}</Text>
                ))}
                {item.exercises.length > 3 && (
                  <Text style={s.exMore}>+{item.exercises.length - 3} more</Text>
                )}
              </View>
            )}
            {item.notes && <Text style={s.notes} numberOfLines={2}>{item.notes}</Text>}
          </Card>
        )}
      />

      <Modal visible={modal} animationType="slide" presentationStyle="formSheet">
        <View style={{ flex: 1, backgroundColor: palette.bg, padding: spacing[5] }}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Log Workout</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={{ color: palette.inkSecondary, fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type picker */}
            <Text style={s.fieldLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[4] }}>
              {WORKOUT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[s.typePill, form.type === t.value && s.typePillActive]}
                  onPress={() => setForm((f) => ({ ...f, type: t.value }))}
                >
                  <Text style={[s.typePillText, form.type === t.value && s.typePillTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Input label="Duration (min)" value={form.durationMinutes} onChangeText={(v) => setForm((f) => ({ ...f, durationMinutes: v }))} keyboardType="numeric" placeholder="45" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Calories (kcal)" value={form.caloriesBurned} onChangeText={(v) => setForm((f) => ({ ...f, caloriesBurned: v }))} keyboardType="numeric" placeholder="300" />
              </View>
            </View>

            {/* Exercises */}
            <View style={s.exHeader}>
              <Text style={s.fieldLabel}>Exercises ({form.exercises.length})</Text>
              <TouchableOpacity onPress={addExercise}><Text style={s.addExBtn}>+ Add</Text></TouchableOpacity>
            </View>
            {form.exercises.map((ex, i) => (
              <Card key={i} style={{ marginBottom: spacing[2] }}>
                <Input label="Exercise name" value={ex.name} onChangeText={(v) => updateExercise(i, 'name', v)} placeholder="Bench Press" containerStyle={{ marginBottom: spacing[2] }} />
                <View style={s.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Input label="Sets" value={ex.sets} onChangeText={(v) => updateExercise(i, 'sets', v)} keyboardType="numeric" placeholder="3" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Reps" value={ex.reps} onChangeText={(v) => updateExercise(i, 'reps', v)} keyboardType="numeric" placeholder="10" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="kg" value={ex.weightKg} onChangeText={(v) => updateExercise(i, 'weightKg', v)} keyboardType="numeric" placeholder="60" />
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeExercise(i)}>
                  <Text style={{ color: palette.danger, fontSize: typography.size.sm }}>Remove</Text>
                </TouchableOpacity>
              </Card>
            ))}

            <Input label="Notes (optional)" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="How it went…" multiline numberOfLines={3} />

            <Button label="Save Workout" onPress={handleSave} loading={logMut.isPending} style={{ marginTop: spacing[3] }} />
            <Button label="Cancel" onPress={() => setModal(false)} variant="ghost" style={{ marginTop: spacing[2] }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={{ backgroundColor: palette.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, marginRight: 6, borderWidth: 1, borderColor: palette.border }}>
      <Text style={{ fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkSecondary }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  title: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink },
  sub: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2 },
  addBtn: { backgroundColor: palette.accent, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.md },
  addBtnText: { fontFamily: typography.bodySemibold, fontSize: typography.size.sm, color: palette.bg },
  wRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wMeta: {},
  wType: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink },
  wDate: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
  wStats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing[2] },
  exList: { marginTop: spacing[2], borderTopWidth: 1, borderTopColor: palette.border, paddingTop: spacing[2] },
  exItem: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginBottom: 2 },
  exMore: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted },
  notes: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: spacing[2], fontStyle: 'italic' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  modalTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink },
  fieldLabel: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary, marginBottom: spacing[2] },
  typePill: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full, backgroundColor: palette.surface2, marginRight: spacing[2], borderWidth: 1, borderColor: palette.border },
  typePillActive: { backgroundColor: palette.accentSubtle, borderColor: palette.accent },
  typePillText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary },
  typePillTextActive: { color: palette.accent },
  twoCol: { flexDirection: 'row', gap: spacing[3] },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  addExBtn: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.accent },
});
