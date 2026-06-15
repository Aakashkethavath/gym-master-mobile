import React from 'react';
import {
  View, Text, StyleSheet, ViewStyle, TextStyle,
  ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, spacing, shadow, typography } from '@/theme/tokens';
import { initials } from '@/utils/format';

// ─── Card ─────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
}
export function Card({ children, style, onPress, padding = spacing[4] }: CardProps) {
  const inner = (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

// ─── StatCard ─────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}
export function StatCard({ label, value, sub, accent, style }: StatCardProps) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent, style]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────
interface AvatarProps { name: string; size?: number; uri?: string; style?: StyleProp<ViewStyle> }
export function Avatar({ name, size = 40, uri, style }: AvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';
interface BadgeProps { label: string; variant?: BadgeVariant; style?: StyleProp<ViewStyle> }
export function Badge({ label, variant = 'default', style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[`badge_${variant}`], style]}>
      <Text style={[styles.badgeText, styles[`badgeText_${variant}`]]}>{label}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  keyboardAware?: boolean;
}
export function Screen({ children, scroll = true, style, keyboardAware }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[styles.screen, { paddingBottom: insets.bottom + spacing[4] }, style]}>
      {children}
    </View>
  );
  const wrapped = scroll ? (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  ) : content;

  if (keyboardAware) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {wrapped}
      </KeyboardAvoidingView>
    );
  }
  return <View style={styles.flex}>{wrapped}</View>;
}

// ─── SectionHeader ────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}
export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

// ─── EmptyState ───────────────────────────────────────────────────────────
interface EmptyStateProps { emoji?: string; title: string; subtitle?: string; style?: StyleProp<ViewStyle> }
export function EmptyState({ emoji = '🏋️', title, subtitle, style }: EmptyStateProps) {
  return (
    <View style={[styles.empty, style]}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
    </View>
  );
}

// ─── FeatureRow ───────────────────────────────────────────────────────────
export function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Text style={{ color: enabled ? palette.success : palette.inkMuted, marginRight: 8, fontSize: 14 }}>
        {enabled ? '✓' : '✗'}
      </Text>
      <Text style={[styles.featureLabel, !enabled && styles.featureLabelOff]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  screen: { flex: 1, paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing[4],
    ...shadow.sm,
  },
  statCardAccent: { backgroundColor: palette.accent, borderColor: palette.accentDark },
  statValue: {
    fontFamily: 'Syne-Bold',
    fontSize: typography.size['2xl'],
    color: palette.ink,
    lineHeight: typography.size['2xl'] * 1.1,
  },
  statValueAccent: { color: palette.bg },
  statLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.size.sm,
    color: palette.inkSecondary,
    marginTop: 4,
  },
  statLabelAccent: { color: palette.bg },
  statSub: { fontFamily: typography.body, fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },

  avatar: {
    backgroundColor: palette.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  avatarText: { fontFamily: 'Syne-Bold', color: palette.accent },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badge_success: { backgroundColor: palette.successSubtle },
  badge_warning: { backgroundColor: palette.warningSubtle },
  badge_danger: { backgroundColor: palette.dangerSubtle },
  badge_info: { backgroundColor: '#0E1F35' },
  badge_default: { backgroundColor: palette.surface2 },
  badgeText: { fontFamily: typography.bodyMedium, fontSize: typography.size.xs },
  badgeText_success: { color: palette.success },
  badgeText_warning: { color: palette.warning },
  badgeText_danger: { color: palette.danger },
  badgeText_info: { color: palette.info },
  badgeText_default: { color: palette.inkSecondary },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: typography.size.md,
    color: palette.ink,
  },
  sectionAction: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.size.sm,
    color: palette.accent,
  },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: spacing[3] },
  empty: { alignItems: 'center', paddingVertical: spacing[10] },
  emptyEmoji: { fontSize: 48, marginBottom: spacing[4] },
  emptyTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: typography.size.lg,
    color: palette.ink,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: typography.body,
    fontSize: typography.size.base,
    color: palette.inkSecondary,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  featureLabel: { fontFamily: typography.body, fontSize: typography.size.sm, color: palette.ink },
  featureLabelOff: { color: palette.inkMuted },
});

export { Button } from './Button';
export { Input } from './Input';

