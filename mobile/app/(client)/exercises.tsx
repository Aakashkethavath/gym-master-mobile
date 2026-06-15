import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Modal, ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { exercisesApi, Exercise } from '@/api';
import { Card, Badge, Button, EmptyState } from '@/components';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { APP_NAME } from '@/constants';
import { capitalize } from '@/utils/format';

// ─── Subscription-wall component ──────────────────────────────────────────

function SubscriptionWall({ code }: { code?: string }) {
  const isExpired = code === 'SUBSCRIPTION_EXPIRED';
  return (
    <View style={wall.container}>
      <Text style={wall.emoji}>{isExpired ? '⏰' : '🔒'}</Text>
      <Text style={wall.title}>
        {isExpired ? 'Membership Expired' : 'Members Only'}
      </Text>
      <Text style={wall.body}>
        {isExpired
          ? 'Your membership has expired. Renew to keep accessing the exercise library and all premium features.'
          : `The exercise library is available exclusively to ${APP_NAME} members. Subscribe to unlock 1,300+ exercises.`}
      </Text>
      <Button
        label={isExpired ? 'Renew Membership' : 'View Plans'}
        onPress={() => router.push('/(client)/plans')}
        style={{ marginTop: spacing[5] }}
      />
    </View>
  );
}

const wall = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  emoji: { fontSize: 64, marginBottom: spacing[4] },
  title: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink, textAlign: 'center' },
  body: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkSecondary, textAlign: 'center', marginTop: spacing[3], lineHeight: 22 },
});

// ─── Exercise detail modal ────────────────────────────────────────────────

function ExerciseDetail({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  return (
    <Modal visible animationType="slide" presentationStyle="formSheet">
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <View style={detail.header}>
          <Text style={detail.title} numberOfLines={2}>{capitalize(ex.name)}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: palette.inkSecondary, fontSize: 24 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing[4] }}>
          {ex.gifUrl ? (
            <Image
              source={{ uri: ex.gifUrl }}
              style={detail.gif}
              resizeMode="contain"
            />
          ) : (
            <View style={detail.gifPlaceholder}>
              <Text style={{ fontSize: 48 }}>🏋️</Text>
            </View>
          )}

          <View style={detail.badgeRow}>
            <Badge label={capitalize(ex.bodyPart)} variant="info" />
            <Badge label={capitalize(ex.target)} variant="success" />
            <Badge label={capitalize(ex.equipment)} variant="default" />
          </View>

          {ex.secondaryMuscles?.length > 0 && (
            <>
              <Text style={detail.sectionTitle}>Secondary Muscles</Text>
              <Text style={detail.muscles}>{ex.secondaryMuscles.map(capitalize).join(' · ')}</Text>
            </>
          )}

          {ex.instructions?.length > 0 && (
            <>
              <Text style={detail.sectionTitle}>Instructions</Text>
              {ex.instructions.map((step, i) => (
                <View key={i} style={detail.step}>
                  <View style={detail.stepNum}>
                    <Text style={detail.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={detail.stepText}>{step}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const detail = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing[5], paddingBottom: spacing[3] },
  title: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink, flex: 1, marginRight: spacing[3] },
  gif: { width: '100%', height: 240, borderRadius: radius.lg, backgroundColor: palette.surface2, marginBottom: spacing[4] },
  gifPlaceholder: { width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] },
  sectionTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.base, color: palette.ink, marginBottom: spacing[2], marginTop: spacing[2] },
  muscles: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginBottom: spacing[3] },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[3] },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText: { fontFamily: 'Syne-Bold', fontSize: typography.size.xs, color: palette.bg },
  stepText: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.ink, flex: 1, lineHeight: 22 },
});

// ─── Exercise card ─────────────────────────────────────────────────────────

function ExerciseCard({ ex, onPress }: { ex: Exercise; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={s.card}>
      <View style={s.cardRow}>
        {ex.gifUrl ? (
          <Image source={{ uri: ex.gifUrl }} style={s.thumb} resizeMode="cover" />
        ) : (
          <View style={s.thumbPlaceholder}><Text style={{ fontSize: 28 }}>💪</Text></View>
        )}
        <View style={s.cardMeta}>
          <Text style={s.exName} numberOfLines={2}>{capitalize(ex.name)}</Text>
          <View style={s.tagRow}>
            <Text style={s.tag}>{capitalize(ex.bodyPart)}</Text>
            <Text style={s.tagSep}>·</Text>
            <Text style={s.tag}>{capitalize(ex.equipment)}</Text>
          </View>
          <Badge label={capitalize(ex.target)} variant="success" style={{ marginTop: 6 }} />
        </View>
      </View>
    </Card>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────

const BODY_PARTS = [
  'All', 'Back', 'Cardio', 'Chest', 'Lower Arms', 'Lower Legs',
  'Neck', 'Shoulders', 'Upper Arms', 'Upper Legs', 'Waist',
];

export default function ClientExercises() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const isSearching = search.length >= 2;

  // Main exercise list query — switches between list / bodyPart / search
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['exercises', filter, search],
    queryFn: async () => {
      if (isSearching) {
        const r = await exercisesApi.search(search, { limit: 20 });
        return r.data.data;
      }
      if (filter === 'All') {
        const r = await exercisesApi.list({ limit: 20 });
        return r.data.data;
      }
      const r = await exercisesApi.byBodyPart(filter.toLowerCase(), { limit: 20 });
      return r.data.data;
    },
    retry: 1,
  });

  // Detect subscription errors from the server
  const axiosErr = error instanceof AxiosError ? error : null;
  const errCode = axiosErr?.response?.data?.code as string | undefined;
  const isSubscriptionError = errCode === 'SUBSCRIPTION_REQUIRED' || errCode === 'SUBSCRIPTION_EXPIRED';

  if (isSubscriptionError) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top }}>
        <Text style={[s.title, { paddingHorizontal: spacing[4], paddingTop: spacing[4] }]}>Exercises</Text>
        <SubscriptionWall code={errCode} />
      </View>
    );
  }

  const exercises = data ?? [];

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: palette.bg }}
        contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10] }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={palette.accent} />}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing[4] }}>
            <Text style={s.title}>Exercise Library</Text>
            <Text style={s.sub}>1,300+ exercises — members only</Text>

            {/* Search */}
            <View style={s.searchRow}>
              <TextInput
                style={s.search}
                value={searchInput}
                onChangeText={setSearchInput}
                onSubmitEditing={() => setSearch(searchInput.trim())}
                placeholder="Search exercises…"
                placeholderTextColor={palette.inkMuted}
                returnKeyType="search"
              />
              {searchInput.length > 0 && (
                <TouchableOpacity style={s.clearBtn} onPress={() => { setSearchInput(''); setSearch(''); }}>
                  <Text style={s.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Body-part filter chips */}
            {!isSearching && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
                {BODY_PARTS.map((bp) => (
                  <TouchableOpacity
                    key={bp}
                    style={[s.chip, filter === bp && s.chipActive]}
                    onPress={() => setFilter(bp)}
                  >
                    <Text style={[s.chipText, filter === bp && s.chipTextActive]}>{bp}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {isLoading && <ActivityIndicator color={palette.accent} style={{ marginVertical: spacing[6] }} />}
            {!isLoading && exercises.length === 0 && !error && (
              <EmptyState emoji="🔍" title="No exercises found" subtitle="Try a different search or filter" />
            )}
            {error && !isSubscriptionError && (
              <EmptyState emoji="⚠️" title="Could not load exercises" subtitle="Check your connection and try again" />
            )}
          </View>
        }
        data={exercises}
        keyExtractor={(ex) => ex.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing[4], marginBottom: spacing[2] }}>
            <ExerciseCard ex={item} onPress={() => setSelected(item)} />
          </View>
        )}
      />

      {selected && <ExerciseDetail ex={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink },
  sub: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2, marginBottom: spacing[4] },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] },
  search: {
    flex: 1, height: 44, backgroundColor: palette.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: palette.border, paddingHorizontal: spacing[3],
    fontFamily: typography.body, fontSize: typography.size.base, color: palette.ink,
  },
  clearBtn: { padding: spacing[2], marginLeft: spacing[2] },
  clearBtnText: { color: palette.inkSecondary, fontSize: 16 },
  chip: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.full, backgroundColor: palette.surface2,
    borderWidth: 1, borderColor: palette.border, marginRight: spacing[2],
  },
  chipActive: { backgroundColor: palette.accentSubtle, borderColor: palette.accent },
  chipText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary },
  chipTextActive: { color: palette.accent },
  card: { marginBottom: 0 },
  cardRow: { flexDirection: 'row', gap: spacing[3] },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: palette.surface2 },
  thumbPlaceholder: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  exName: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  tag: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkSecondary },
  tagSep: { color: palette.inkMuted, fontSize: typography.size.xs },
});
