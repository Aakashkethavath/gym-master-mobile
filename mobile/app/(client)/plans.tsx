import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { usePlans, useMySubscription, apiErrorMessage } from '@/hooks';
import { Card, Badge, FeatureRow, Button } from '@/components';
import { Plan } from '@/api';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { formatCurrency, formatDate } from '@/utils/format';
import { FEATURE_LABELS } from '@/constants';

type Billing = 'monthly' | 'yearly';

export default function ClientPlans() {
  const insets = useSafeAreaInsets();
  const { data: plans, isLoading: plansLoading, refetch } = usePlans();
  const { data: sub } = useMySubscription();
  const [billing, setBilling] = useState<Billing>('monthly');

  async function handleSubscribe(planId: string) {
    router.push({
      pathname: '/(client)/payment',
      params: { planId, billing },
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={plansLoading} onRefresh={refetch} tintColor={palette.accent} />}
    >
      <Text style={s.title}>Membership Plans</Text>
      <Text style={s.sub}>Choose the plan that fits your goals</Text>

      {/* Current sub banner */}
      {sub && (
        <Card style={{ marginBottom: spacing[5], backgroundColor: palette.accentSubtle, borderColor: palette.accentDark }}>
          <View style={s.bannerRow}>
            <View>
              <Text style={s.bannerLabel}>Current Plan</Text>
              <Text style={s.bannerPlan}>{sub.plan.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Badge label="Active" variant="success" />
              <Text style={s.bannerExpiry}>Expires {formatDate(sub.endDate)}</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Billing toggle */}
      <View style={s.toggle}>
        {(['monthly', 'yearly'] as Billing[]).map((b) => (
          <TouchableOpacity
            key={b}
            style={[s.toggleBtn, billing === b && s.toggleBtnActive]}
            onPress={() => setBilling(b)}
          >
            <Text style={[s.toggleText, billing === b && s.toggleTextActive]}>
              {b === 'monthly' ? 'Monthly' : 'Yearly'}
              {b === 'yearly' ? '  (Save ~17%)' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {plansLoading && <ActivityIndicator color={palette.accent} style={{ marginVertical: spacing[6] }} />}

      {(plans ?? []).map((plan: Plan, i: number) => {
        const isCurrentPlan = sub?.plan._id === plan._id && sub?.status === 'active';
        const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

        return (
          <Card
            key={plan._id}
            style={[s.planCard, i === 1 && s.planCardFeatured]}
          >
            {i === 1 && (
              <View style={s.popularBadge}>
                <Text style={s.popularBadgeText}>Most Popular</Text>
              </View>
            )}
            <View style={s.planHeader}>
              <View>
                <Text style={s.planName}>{plan.name}</Text>
                {plan.tagline && <Text style={s.planTagline}>{plan.tagline}</Text>}
              </View>
              <View style={s.priceBlock}>
                <Text style={s.price}>{formatCurrency(price)}</Text>
                <Text style={s.pricePeriod}>/{billing === 'monthly' ? 'mo' : 'yr'}</Text>
              </View>
            </View>

            {plan.description && <Text style={s.desc}>{plan.description}</Text>}

            <View style={s.features}>
              {Object.keys(FEATURE_LABELS).map((key) => (
                <FeatureRow key={key} label={FEATURE_LABELS[key]} enabled={!!plan.features[key]} />
              ))}
            </View>

            {isCurrentPlan ? (
              <View style={s.currentBtn}>
                <Text style={s.currentBtnText}>✓ Your Current Plan</Text>
              </View>
            ) : (
              <Button
                label={`Subscribe — ${formatCurrency(price)}`}
                onPress={() => handleSubscribe(plan._id)}
                variant={i === 1 ? 'primary' : 'secondary'}
                style={{ marginTop: spacing[4] }}
              />
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink },
  sub: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkSecondary, marginTop: 4, marginBottom: spacing[4] },
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerLabel: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkSecondary },
  bannerPlan: { fontFamily: 'Syne-Bold', fontSize: typography.size.lg, color: palette.accent },
  bannerExpiry: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkSecondary, marginTop: 4 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: palette.surface2,
    borderRadius: radius.full,
    padding: 3,
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: palette.border,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing[2], borderRadius: radius.full, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: palette.accent },
  toggleText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary },
  toggleTextActive: { color: palette.bg },
  planCard: { marginBottom: spacing[4], position: 'relative', overflow: 'hidden' },
  planCardFeatured: { borderColor: palette.accent, borderWidth: 1.5 },
  popularBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: palette.accent,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderBottomLeftRadius: radius.md,
    borderTopRightRadius: radius.lg,
  },
  popularBadgeText: { fontFamily: typography.bodySemibold, fontSize: typography.size.xs, color: palette.bg },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink },
  planTagline: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2 },
  priceBlock: { flexDirection: 'row', alignItems: 'flex-end' },
  price: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.accent },
  pricePeriod: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginBottom: 4, marginLeft: 2 },
  desc: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: spacing[2] },
  features: { marginTop: spacing[3], borderTopWidth: 1, borderTopColor: palette.border, paddingTop: spacing[3] },
  currentBtn: {
    marginTop: spacing[4], paddingVertical: spacing[3], borderRadius: radius.md,
    backgroundColor: palette.successSubtle, alignItems: 'center',
    borderWidth: 1, borderColor: palette.success,
  },
  currentBtnText: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.success },
});
