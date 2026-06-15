/**
 * PaymentScreen (client)
 *
 * Implements the Razorpay 3-step checkout flow in React Native:
 *
 *   1. User taps "Subscribe" on the Plans screen → navigated here with planId + billing
 *   2. This screen calls our API to create a Razorpay order (server-determined amount)
 *   3. The Razorpay checkout sheet is presented (handled by react-native-razorpay)
 *   4. On success, the payment credentials are sent to our /verify endpoint
 *   5. Success state → user sees confirmation + is redirected to home
 *
 * Security:
 *   • We never store the razorpay_signature or full payment details locally.
 *   • The idempotency key (UUID v4) prevents duplicate orders if the user
 *     navigates back and tries again.
 *   • Amount is always determined server-side, never from local state.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { gatewayApi, Plan } from '@/api';
import { usePlans } from '@/hooks';
import { Card, Button, Badge, FeatureRow } from '@/components';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { formatCurrency, formatDate } from '@/utils/format';
import { FEATURE_LABELS, QUERY_KEYS, APP_NAME } from '@/constants';

/** Generates a UUID v4 for idempotency keys. */
function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type PaymentStatus = 'idle' | 'creating-order' | 'checkout' | 'verifying' | 'success' | 'failed';

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { planId, billing } = useLocalSearchParams<{ planId: string; billing: 'monthly' | 'yearly' }>();

  const { data: plans } = usePlans();
  const plan = plans?.find((p: Plan) => p._id === planId);

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // Stable idempotency key for this checkout session.
  const [idempotencyKey] = useState(uuidV4);

  const amount = billing === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice;

  const handlePay = useCallback(async () => {
    if (!plan || !amount) return;
    setStatus('creating-order');
    setErrorMsg('');

    try {
      // ── Step 1: Create order on server ─────────────────────────────────
      const { data: order } = await gatewayApi.createOrder({
        planId: plan._id,
        billing,
        idempotencyKey,
      });

      setStatus('checkout');

      /**
       * ── Step 2: Razorpay checkout ────────────────────────────────────
       *
       * In a real React Native app you would import:
       *   import RazorpayCheckout from 'react-native-razorpay';
       *
       * and call:
       *   RazorpayCheckout.open(options)
       *
       * We simulate that here with an Alert for demo purposes because
       * the react-native-razorpay native module cannot run in Expo Go.
       * Replace this block with the real SDK call in a development build.
       */
      await simulateRazorpayCheckout(order, plan, async (paymentData) => {
        setStatus('verifying');

        // ── Step 3: Verify on server ──────────────────────────────────
        const { data: result } = await gatewayApi.verifyPayment({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
        });

        // Invalidate subscription + payment caches.
        await qc.invalidateQueries({ queryKey: QUERY_KEYS.MY_SUBSCRIPTION });
        await qc.invalidateQueries({ queryKey: QUERY_KEYS.MY_PAYMENTS });

        setStatus('success');
      });
    } catch (err: any) {
      setStatus('failed');
      const msg = err?.response?.data?.message ?? err?.message ?? 'Payment failed. Please try again.';
      setErrorMsg(msg);
    }
  }, [plan, amount, billing, idempotencyKey, qc]);

  if (!plan) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View style={[s.successContainer, { paddingTop: insets.top + spacing[8] }]}>
        <Text style={s.successEmoji}>🎉</Text>
        <Text style={s.successTitle}>Payment Successful!</Text>
        <Text style={s.successSub}>Your {plan.name} membership is now active.</Text>
        <Button label="Go to Dashboard" onPress={() => router.replace('/(client)/home')} style={{ marginTop: spacing[6] }} />
      </View>
    );
  }

  const isLoading = status === 'creating-order' || status === 'verifying' || status === 'checkout';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing[4], paddingBottom: spacing[10], paddingHorizontal: spacing[4] }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.title}>Confirm & Pay</Text>
      <Text style={s.sub}>Secure payment powered by Razorpay</Text>

      {/* Order summary */}
      <Card style={{ marginBottom: spacing[4] }}>
        <Text style={s.planName}>{plan.name}</Text>
        <Text style={s.planTagline}>{plan.tagline}</Text>

        <View style={s.priceRow}>
          <Text style={s.priceLabel}>{billing === 'monthly' ? 'Monthly' : 'Yearly'} plan</Text>
          <Text style={s.priceValue}>{formatCurrency(amount ?? 0)}</Text>
        </View>

        {billing === 'yearly' && (
          <View style={s.savingRow}>
            <Badge label={`Save ${Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}% vs monthly`} variant="success" />
          </View>
        )}

        <View style={s.divider} />
        <Text style={s.featuresTitle}>Included features</Text>
        {Object.keys(FEATURE_LABELS)
          .filter((k) => plan.features[k])
          .map((k) => <FeatureRow key={k} label={FEATURE_LABELS[k]} enabled />)}
      </Card>

      {/* Security badges */}
      <View style={s.securityRow}>
        {['🔒 SSL Encrypted', '🛡️ PCI DSS', '✓ No card data stored'].map((b) => (
          <View key={b} style={s.secBadge}>
            <Text style={s.secBadgeText}>{b}</Text>
          </View>
        ))}
      </View>

      {/* Error */}
      {status === 'failed' && errorMsg ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>⚠ {errorMsg}</Text>
        </View>
      ) : null}

      {/* Status label */}
      {isLoading && (
        <Text style={s.statusText}>
          {status === 'creating-order' ? 'Creating secure order…' :
           status === 'checkout' ? 'Waiting for payment…' :
           'Verifying payment…'}
        </Text>
      )}

      <Button
        label={isLoading ? '' : `Pay ${formatCurrency(amount ?? 0)}`}
        onPress={handlePay}
        loading={isLoading}
        disabled={isLoading}
        style={{ marginTop: spacing[4] }}
      />
      <Button
        label="Cancel"
        onPress={() => router.back()}
        variant="ghost"
        style={{ marginTop: spacing[2] }}
        disabled={isLoading}
      />

      <Text style={s.disclaimer}>
        By tapping Pay you agree to the {APP_NAME} Terms of Service. You will be billed{' '}
        {formatCurrency(amount ?? 0)} {billing === 'monthly' ? 'every month' : 'every year'}.
        Cancel any time from the Profile tab.
      </Text>
    </ScrollView>
  );
}

/**
 * Simulates the Razorpay checkout for Expo Go compatibility.
 *
 * In a production development build, replace this entire function with:
 *
 *   import RazorpayCheckout from 'react-native-razorpay';
 *
 *   const options = {
 *     description: `${plan.name} - ${billing}`,
 *     currency: order.currency,
 *     key: order.keyId,
 *     amount: order.amountPaise,
 *     order_id: order.orderId,
 *     name: APP_NAME,
 *     prefill: { email: user.email, contact: user.contact },
 *     theme: { color: '#CCFF50' },
 *   };
 *
 *   const data = await RazorpayCheckout.open(options);
 *   await onSuccess(data);
 */
async function simulateRazorpayCheckout(
  order: { orderId: string; amountPaise: number; currency: string; keyId: string },
  plan: { name: string },
  onSuccess: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => Promise<void>,
) {
  return new Promise<void>((resolve, reject) => {
    Alert.alert(
      'Razorpay Checkout (Simulated)',
      `Plan: ${plan.name}\nAmount: ₹${order.amountPaise / 100}\n\nIn a production build, the Razorpay payment sheet opens here.\n\nSimulate payment result:`,
      [
        {
          text: '✓ Payment Success',
          onPress: async () => {
            try {
              // In production, Razorpay SDK returns real credentials.
              // Here we pass dummy values to demonstrate the flow.
              await onSuccess({
                razorpay_order_id: order.orderId,
                razorpay_payment_id: `pay_DEMO_${order.orderId}-${order.amountPaise}`,
                razorpay_signature: 'DEMO_SIGNATURE_REPLACE_WITH_REAL_IN_PRODUCTION',
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        },
        {
          text: '✗ Payment Failed',
          style: 'destructive',
          onPress: () => reject(new Error('Payment was cancelled or failed')),
        },
      ],
    );
  });
}

const s = StyleSheet.create({
  title: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink },
  sub: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2, marginBottom: spacing[4] },
  planName: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.ink },
  planTagline: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.inkSecondary, marginTop: 2, marginBottom: spacing[4] },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  priceLabel: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkSecondary },
  priceValue: { fontFamily: 'Syne-Bold', fontSize: typography.size.xl, color: palette.accent },
  savingRow: { marginBottom: spacing[3] },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: spacing[3] },
  featuresTitle: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary, marginBottom: spacing[2] },
  securityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] },
  secBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: palette.surface2, borderWidth: 1, borderColor: palette.border },
  secBadgeText: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkSecondary },
  errorBox: { backgroundColor: palette.dangerSubtle, borderRadius: radius.md, padding: spacing[3], borderWidth: 1, borderColor: palette.danger, marginBottom: spacing[3] },
  errorText: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.danger },
  statusText: { fontFamily: typography.bodyMedium, fontSize: typography.size.sm, color: palette.inkSecondary, textAlign: 'center', marginVertical: spacing[2] },
  disclaimer: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted, textAlign: 'center', marginTop: spacing[4], lineHeight: 18 },
  successContainer: { flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  successEmoji: { fontSize: 80, marginBottom: spacing[4] },
  successTitle: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink, textAlign: 'center' },
  successSub: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkSecondary, textAlign: 'center', marginTop: spacing[2] },
});
