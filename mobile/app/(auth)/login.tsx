import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { APP_NAME } from '@/constants';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Login failed. Check your credentials.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing[8], paddingBottom: insets.bottom + spacing[6] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / brand mark */}
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>{APP_NAME.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.appName}>{APP_NAME.toUpperCase()}</Text>
          <Text style={styles.tagline}>Your performance, tracked.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            error={errors.email}
            placeholder="you@example.com"
            autoComplete="off"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            secureToggle
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            error={errors.password}
            placeholder="••••••••"
            autoComplete="off"
          />

          <Button
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: spacing[2] }}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}> Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback Link for Guests */}
        <TouchableOpacity
          style={styles.feedbackBtn}
          onPress={() => router.push('/feedback' as any)}
        >
          <Text style={styles.feedbackBtnText}>💬 Member Feedback</Text>
        </TouchableOpacity>


      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  container: { paddingHorizontal: spacing[5] },
  brand: { alignItems: 'center', marginBottom: spacing[8] },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  logoText: { fontFamily: 'Syne-Bold', fontSize: 36, color: palette.bg },
  appName: {
    fontFamily: 'Syne-Bold',
    fontSize: typography.size.lg,
    color: palette.ink,
    letterSpacing: 3,
  },
  tagline: {
    fontFamily: typography.body,
    fontSize: typography.size.sm,
    color: palette.inkSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  title: {
    fontFamily: 'Syne-Bold',
    fontSize: typography.size.xl,
    color: palette.ink,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: typography.size.base,
    color: palette.inkSecondary,
    marginBottom: spacing[5],
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[2] },
  footerText: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkSecondary },
  footerLink: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.accent },
  feedbackBtn: {
    alignItems: 'center',
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
  },
  feedbackBtnText: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.size.base,
    color: palette.ink,
  },

});
