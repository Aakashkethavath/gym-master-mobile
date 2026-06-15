import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useFeedback, useSubmitFeedback, apiErrorMessage } from '@/hooks';
import { Card, Screen, Badge, Divider, Button, Input } from '@/components';
import { palette, spacing, typography, radius, shadow } from '@/theme/tokens';
import { Feedback } from '@/api';
import { APP_NAME } from '@/constants';

const AVATAR_COLORS = [
  { bg: '#0E2040', color: '#60A5FA' }, // blue
  { bg: '#052912', color: '#4ADE80' }, // green
  { bg: '#2A1D00', color: '#FBB040' }, // amber
  { bg: '#2D0707', color: '#F87171' }, // red
  { bg: '#1E0A35', color: '#C084FC' }, // purple
];

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

type SortType = 'newest' | 'oldest' | 'highest' | 'lowest';

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  // Queries & Mutations
  const { data: feedbackList = [] as Feedback[], isLoading, error } = useFeedback();
  const submitMutation = useSubmitFeedback();

  // Filter & Sort State
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showSortModal, setShowSortModal] = useState(false);

  // Form State
  const [formVisible, setFormVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Helper: Get avatar color set based on name length
  function getAvatarColor(name: string) {
    const code = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLORS[code % AVATAR_COLORS.length];
  }

  // Helper: Get name initials
  function getInitials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0] || '')
      .join('')
      .toUpperCase();
  }

  // Helper: Format relative time
  function timeAgo(dateString: string) {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  }

  // Statistics calculation
  const stats = useMemo(() => {
    const total = feedbackList.length;
    if (total === 0) return { avg: 0, total: 0, fiveStarPct: 0, thisMonth: 0, counts: [0, 0, 0, 0, 0] };

    const sum = (feedbackList as Feedback[]).reduce((acc: number, f: Feedback) => acc + f.rating, 0);
    const avg = sum / total;
    
    const fiveStarCount = (feedbackList as Feedback[]).filter((f: Feedback) => f.rating === 5).length;
    const fiveStarPct = Math.round((fiveStarCount / total) * 100);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const thisMonth = (feedbackList as Feedback[]).filter((f: Feedback) => new Date(f.createdAt).getTime() >= startOfMonth.getTime()).length;

    const counts = [0, 0, 0, 0, 0];
    (feedbackList as Feedback[]).forEach((f: Feedback) => {
      if (f.rating >= 1 && f.rating <= 5) {
        counts[f.rating - 1]++;
      }
    });

    return { avg, total, fiveStarPct, thisMonth, counts };
  }, [feedbackList]);

  // Filtered & Sorted Feedback list
  const processedList = useMemo(() => {
    let list = [...feedbackList] as Feedback[];
    
    if (filterRating !== 'all') {
      list = list.filter((f: Feedback) => f.rating === filterRating);
    }

    switch (sortBy) {
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'highest':
        list.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'lowest':
        list.sort((a, b) => a.rating - b.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return list;
  }, [feedbackList, filterRating, sortBy]);

  // Open Form Dialog
  function openForm() {
    if (user) {
      setFormName(user.name);
    } else {
      setFormName('');
    }
    setFormRating(0);
    setFormComment('');
    setFormSuccess(false);
    setFormVisible(true);
  }

  // Handle Review Submission
  async function handleSubmit() {
    if (!formName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (formRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    if (formComment.trim().length < 2) {
      Alert.alert('Error', 'Please enter a comments/review.');
      return;
    }

    try {
      await submitMutation.mutateAsync({
        name: formName.trim(),
        rating: formRating,
        comment: formComment.trim(),
      });
      setFormSuccess(true);
    } catch (err) {
      Alert.alert('Submission Failed', apiErrorMessage(err));
    }
  }

  return (
    <View style={s.root}>
      {/* Header Bar */}
      <View style={[s.header, { paddingTop: insets.top + spacing[3] }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Member Feedback</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Text style={s.heroTitle}>Your <Text style={s.limeText}>feedback</Text> shapes our gym.</Text>
          <Text style={s.heroSubtitle}>Share your experience — every review helps us improve.</Text>
        </View>

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>AVERAGE RATING</Text>
            <Text style={s.statValue}>{stats.total > 0 ? stats.avg.toFixed(1) : '—'}</Text>
            <Text style={s.statSub}>★ out of 5 stars</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>TOTAL REVIEWS</Text>
            <Text style={s.statValue}>{stats.total}</Text>
            <Text style={s.statSub}>All time reviews</Text>
          </View>
        </View>
        
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>5-STAR RATE</Text>
            <Text style={s.statValue}>{stats.total > 0 ? `${stats.fiveStarPct}%` : '—'}</Text>
            <Text style={s.statSub}>Excellent score</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>THIS MONTH</Text>
            <Text style={s.statValue}>{stats.thisMonth}</Text>
            <Text style={s.statSub}>New submissions</Text>
          </View>
        </View>

        {/* Rating Breakdown */}
        <Card style={s.breakdownCard}>
          <Text style={s.cardTitle}>▦ Rating Breakdown</Text>
          <View style={s.bdMainRow}>
            <View style={s.bdAvgBox}>
              <Text style={s.bdAvgNum}>{stats.total > 0 ? stats.avg.toFixed(1) : '—'}</Text>
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Text
                    key={star}
                    style={[
                      s.starIcon,
                      { color: star <= Math.round(stats.avg) ? palette.warning : palette.surface3 }
                    ]}
                  >
                    ★
                  </Text>
                ))}
              </View>
              <Text style={s.bdAvgSub}>
                {stats.total} review{stats.total !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={s.bdBarsList}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = stats.counts[star - 1];
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <TouchableOpacity
                    key={star}
                    style={s.bdRow}
                    onPress={() => setFilterRating(star)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.bdStarLabel}>{star} ★</Text>
                    <View style={s.bdTrack}>
                      <View style={[s.bdFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={s.bdCountLabel}>{count}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Write a review button */}
        <Button
          label="✍ Write a Review"
          onPress={openForm}
          style={s.writeReviewBtn}
        />

        {/* Feed Header */}
        <View style={s.feedHeader}>
          <Text style={s.feedTitle}>⌁ Member Reviews</Text>
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>Live updates</Text>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterContainer}
        >
          <TouchableOpacity
            style={[s.chip, filterRating === 'all' && s.chipActive]}
            onPress={() => setFilterRating('all')}
          >
            <Text style={[s.chipText, filterRating === 'all' && s.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {[5, 4, 3, 2, 1].map(star => (
            <TouchableOpacity
              key={star}
              style={[s.chip, filterRating === star && s.chipActive]}
              onPress={() => setFilterRating(star)}
            >
              <Text style={[s.chipText, filterRating === star && s.chipTextActive]}>{star} ★</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort selector bar */}
        <View style={s.sortRow}>
          <Text style={s.sortCount}>
            Showing <Text style={s.whiteText}>{processedList.length}</Text> review{processedList.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity style={s.sortSelector} onPress={() => setShowSortModal(true)}>
            <Text style={s.sortSelectorText}>
              Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'highest' ? 'Highest Rating' : 'Lowest Rating'} ▾
            </Text>
          </TouchableOpacity>
        </View>

        <Divider />

        {/* Feed List */}
        {isLoading && (
          <ActivityIndicator size="large" color={palette.accent} style={{ marginVertical: spacing[8] }} />
        )}

        {!isLoading && processedList.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>◌</Text>
            <Text style={s.emptyTitle}>No reviews found</Text>
            <Text style={s.emptySub}>
              {filterRating === 'all'
                ? 'Be the first to share your experience!'
                : `Try selecting a different filter or submit a ${filterRating}-star review.`}
            </Text>
          </View>
        )}

        {!isLoading && processedList.map((item) => {
          const displayName = item.name || (item.user as any)?.name || 'Anonymous';
          const displayComment = item.comment || (item as any).message || '';
          const displayDate = item.createdAt || (item as any).date || new Date().toISOString();
          const colorSet = getAvatarColor(displayName);
          return (
            <Card key={item._id} style={s.reviewCard}>
              <View style={s.reviewHeader}>
                <View style={[s.avatar, { backgroundColor: colorSet.bg }]}>
                  <Text style={[s.avatarText, { color: colorSet.color }]}>
                    {getInitials(displayName)}
                  </Text>
                </View>
                <View style={s.reviewMeta}>
                  <Text style={s.reviewerName}>{displayName}</Text>
                  <Text style={s.reviewTime}>{timeAgo(displayDate)}</Text>
                </View>
                <Badge
                  label={
                    item.rating === 5 ? 'Excellent' :
                    item.rating === 4 ? 'Great' :
                    item.rating === 3 ? 'Good' :
                    item.rating === 2 ? 'Fair' : 'Poor'
                  }
                  variant={
                    item.rating >= 4 ? 'success' :
                    item.rating === 3 ? 'warning' : 'danger'
                  }
                />
              </View>

              <View style={s.reviewStarsDisplay}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Text
                    key={star}
                    style={[
                      s.miniStar,
                      { color: star <= item.rating ? palette.warning : palette.surface3 }
                    ]}
                  >
                    ★
                  </Text>
                ))}
              </View>

              <Text style={s.reviewBody}>{displayComment}</Text>
            </Card>
          );
        })}
      </ScrollView>

      {/* Write Feedback Modal */}
      <Modal visible={formVisible} animationType="slide" presentationStyle="formSheet">
        <View style={s.modalContainer}>
          {/* Modal Header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Share your experience</Text>
            <TouchableOpacity onPress={() => setFormVisible(false)} style={s.modalCloseBtn}>
              <Text style={s.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {!formSuccess ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: spacing[8] }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Star Rating selector widget */}
              <View style={s.formField}>
                <Text style={s.formLabel}>
                  Your rating <Text style={s.limeText}>*</Text>
                </Text>
                <View style={s.starSelectionWidget}>
                  <View style={s.starGroup}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity
                        key={star}
                        style={s.formStarBtn}
                        onPress={() => setFormRating(star)}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            s.formStarText,
                            { color: star <= formRating ? palette.warning : palette.surface3 }
                          ]}
                        >
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {formRating > 0 && (
                    <Text style={s.formRatingTextVal}>{RATING_LABELS[formRating]}</Text>
                  )}
                </View>
              </View>

              {/* Name Field */}
              <View style={s.formField}>
                <Text style={s.formLabel}>
                  Your name <Text style={s.limeText}>*</Text>
                </Text>
                <Input
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g. Priya Sharma"
                  editable={!user} // Locked and prefilled for logged in users
                  autoCapitalize="words"
                />
                {user && (
                  <Text style={s.formHint}>Logged in: your name is locked.</Text>
                )}
              </View>

              {/* Comment Field */}
              <View style={s.formField}>
                <Text style={s.formLabel}>
                  Your review <Text style={s.limeText}>*</Text>
                </Text>
                <View style={s.textareaContainer}>
                  <TextInput
                    style={s.textarea}
                    value={formComment}
                    onChangeText={setFormComment}
                    placeholder="What did you love? What could we improve?"
                    placeholderTextColor={palette.inkMuted}
                    multiline
                    numberOfLines={5}
                    maxLength={400}
                    textAlignVertical="top"
                  />
                  <Text style={[s.charCounter, formComment.length >= 350 && s.charCounterWarn]}>
                    {formComment.length} / 400
                  </Text>
                </View>
              </View>

              <Button
                label="Submit Review"
                onPress={handleSubmit}
                loading={submitMutation.isPending}
                style={{ marginTop: spacing[4] }}
              />
            </ScrollView>
          ) : (
            /* Success State */
            <View style={s.successState}>
              <View style={s.successRing}>
                <Text style={s.successCheckmark}>✓</Text>
              </View>
              <Text style={s.successTitle}>Review submitted!</Text>
              <Text style={s.successSubtitle}>
                Thank you — your feedback makes {APP_NAME} better for every member.
              </Text>
              
              {!user && (
                <Button
                  label="Submit another review"
                  onPress={() => {
                    setFormRating(0);
                    setFormComment('');
                    setFormSuccess(false);
                  }}
                  variant="ghost"
                  style={{ marginBottom: spacing[2], width: '80%' }}
                />
              )}
              <Button
                label="Close"
                onPress={() => setFormVisible(false)}
                style={{ width: '80%' }}
              />
            </View>
          )}
        </View>
      </Modal>

      {/* Sort Select Dialog */}
      <Modal visible={showSortModal} transparent animationType="fade">
        <TouchableOpacity
          style={s.sortOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={s.sortMenu}>
            <Text style={s.sortMenuTitle}>Sort reviews by</Text>
            {(
              [
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'highest', label: 'Highest rated' },
                { value: 'lowest', label: 'Lowest rated' },
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.sortOption, sortBy === opt.value && s.sortOptionActive]}
                onPress={() => {
                  setSortBy(opt.value);
                  setShowSortModal(false);
                }}
              >
                <Text style={[s.sortOptionText, sortBy === opt.value && s.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                {sortBy === opt.value && <Text style={s.limeText}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface,
  },
  backBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  backBtnText: { color: palette.accent, fontSize: typography.size.md, fontFamily: typography.bodyMedium },
  headerTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.base, color: palette.ink, letterSpacing: 1 },
  scrollView: { flex: 1 },
  hero: { marginVertical: spacing[5] },
  heroTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink, lineHeight: typography.size.xl * 1.2 },
  limeText: { color: palette.accent },
  heroSubtitle: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkSecondary, marginTop: 6 },
  
  statsGrid: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[3] },
  statCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[4],
    ...shadow.sm,
  },
  statLabel: { fontFamily: typography.bodySemibold, fontSize: 10, color: palette.inkMuted, letterSpacing: 1 },
  statValue: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink, marginVertical: 4 },
  statSub: { fontFamily: typography.body, fontSize: 10, color: palette.inkMuted },

  breakdownCard: { marginBottom: spacing[5], padding: spacing[4] },
  cardTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.base, color: palette.ink, marginBottom: spacing[4] },
  bdMainRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[5] },
  bdAvgBox: { alignItems: 'center', minWidth: 90 },
  bdAvgNum: { fontFamily: 'Syne-Bold', fontSize: 44, color: palette.ink, lineHeight: 48 },
  starsRow: { flexDirection: 'row', gap: 1, marginVertical: 4 },
  starIcon: { fontSize: 14 },
  bdAvgSub: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted },
  bdBarsList: { flex: 1, gap: 6 },
  bdRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  bdStarLabel: { fontFamily: typography.bodyMedium, fontSize: typography.size.xs, color: palette.inkSecondary, width: 28 },
  bdTrack: { flex: 1, height: 6, backgroundColor: palette.surface3, borderRadius: 3, overflow: 'hidden' },
  bdFill: { height: '100%', backgroundColor: palette.warning, borderRadius: 3 },
  bdCountLabel: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted, width: 20, textAlign: 'right' },

  writeReviewBtn: { marginVertical: spacing[2], backgroundColor: palette.surface2, borderColor: palette.border, borderWidth: 1 },

  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[6], marginBottom: spacing[3] },
  feedTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.md, color: palette.ink },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.successSubtle,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.success },
  liveText: { fontFamily: typography.bodyMedium, fontSize: 10, color: palette.success },

  filterContainer: { paddingVertical: spacing[2], marginBottom: spacing[3] },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.border,
    marginRight: spacing[2],
    backgroundColor: palette.transparent,
  },
  chipActive: {
    backgroundColor: palette.accentSubtle,
    borderColor: 'rgba(204, 255, 80, 0.3)',
  },
  chipText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary },
  chipTextActive: { color: palette.accent },

  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  sortCount: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkMuted },
  whiteText: { color: palette.ink },
  sortSelector: { paddingVertical: 4, paddingHorizontal: 6 },
  sortSelectorText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary },

  emptyState: { alignItems: 'center', paddingVertical: spacing[8] },
  emptyEmoji: { fontSize: 36, color: palette.inkMuted, marginBottom: spacing[2] },
  emptyTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.base, color: palette.ink, marginBottom: 4 },
  emptySub: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkMuted, textAlign: 'center', paddingHorizontal: spacing[6] },

  reviewCard: { marginBottom: spacing[3], padding: spacing[4] },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 13 },
  reviewMeta: { flex: 1 },
  reviewerName: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.ink },
  reviewTime: { fontFamily: typography.body, fontSize: 11, color: palette.inkMuted, marginTop: 2 },
  reviewStarsDisplay: { flexDirection: 'row', gap: 2, marginBottom: spacing[2] },
  miniStar: { fontSize: 13 },
  reviewBody: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkSecondary, lineHeight: typography.size.base * 1.5 },

  // Modal styling
  modalContainer: { flex: 1, backgroundColor: palette.bg, padding: spacing[5] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] },
  modalTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.lg, color: palette.ink },
  modalCloseBtn: { padding: 4 },
  modalCloseText: { color: palette.inkSecondary, fontSize: 20 },

  formField: { marginBottom: spacing[4] },
  formLabel: { fontFamily: typography.bodySemibold, fontSize: typography.size.sm, color: palette.inkSecondary, marginBottom: spacing[2] },
  starSelectionWidget: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], flexWrap: 'wrap' },
  starGroup: { flexDirection: 'row', gap: 4 },
  formStarBtn: { padding: 2 },
  formStarText: { fontSize: 32 },
  formRatingTextVal: { fontFamily: typography.bodySemibold, fontSize: typography.size.sm, color: palette.accent },
  formHint: { fontFamily: typography.body, fontSize: 11, color: palette.inkMuted, marginTop: 4 },
  
  textareaContainer: {
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  textarea: {
    fontFamily: typography.body,
    fontSize: typography.size.base,
    color: palette.white,
    minHeight: 110,
    padding: 0,
  },
  charCounter: { fontFamily: typography.body, fontSize: 10, color: palette.inkMuted, textAlign: 'right', marginTop: 4 },
  charCounterWarn: { color: palette.warning },

  // Success state layout
  successState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6] },
  successRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.successSubtle,
    borderWidth: 2,
    borderColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  successCheckmark: { color: palette.success, fontSize: 36, fontFamily: 'System', fontWeight: 'bold' },
  successTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink, marginBottom: spacing[2] },
  successSubtitle: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkSecondary, textAlign: 'center', lineHeight: typography.size.base * 1.5, marginBottom: spacing[6] },

  // Sort Modal Overlay
  sortOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sortMenu: { backgroundColor: palette.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing[5], paddingBottom: Platform.OS === 'ios' ? spacing[8] : spacing[6] },
  sortMenuTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size.md, color: palette.ink, marginBottom: spacing[4] },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: palette.border },
  sortOptionActive: { borderBottomColor: palette.borderStrong },
  sortOptionText: { fontFamily: typography.bodyMedium, fontSize: typography.size.base, color: palette.inkSecondary },
  sortOptionTextActive: { color: palette.accent },
});
