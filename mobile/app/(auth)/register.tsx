import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { palette, spacing, typography, radius } from '@/theme/tokens';
import { APP_NAME } from '@/constants';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', contact: '', city: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!PASSWORD_REGEX.test(form.password)) {
      e.password = 'Min 8 chars, one uppercase, one lowercase, one digit';
    }
    if (form.contact.trim() && (form.contact.trim().length < 7 || form.contact.trim().length > 20)) {
      e.contact = 'Phone must be between 7 and 20 characters';
    }
    if (form.city.trim() && (form.city.trim().length < 2 || form.city.trim().length > 60)) {
      e.city = 'City must be between 2 and 60 characters';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        contact: form.contact.trim() || undefined,
        city: form.city.trim() || undefined,
      });
    } catch (err: any) {
      let message = err?.response?.data?.message ?? 'Registration failed. Please try again.';
      if (err?.response?.data?.code === 'VALIDATION_ERROR' && Array.isArray(err?.response?.data?.details?.body)) {
        message = `${message}:\n${err.response.data.details.body.map((item: string) => `• ${item}`).join('\n')}`;
      }
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[6] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join {APP_NAME} and start tracking</Text>

        <View style={styles.card}>
          <Input label="Full Name *" value={form.name} onChangeText={(v) => update('name', v)} error={errors.name} placeholder="Jane Doe" returnKeyType="next" />
          <Input label="Email *" value={form.email} onChangeText={(v) => update('email', v)} error={errors.email} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" returnKeyType="next" />
          <Input label="Password *" value={form.password} onChangeText={(v) => update('password', v)} error={errors.password} secureTextEntry secureToggle placeholder="Min 8 chars, A-Z, 0-9" returnKeyType="next" />
          <Input label="Phone (optional)" value={form.contact} onChangeText={(v) => update('contact', v)} error={errors.contact} keyboardType="phone-pad" placeholder="+91 98765 43210" returnKeyType="next" />
          <Input label="City (optional)" value={form.city} onChangeText={(v) => update('city', v)} error={errors.city} placeholder="Mumbai" returnKeyType="done" onSubmitEditing={handleRegister} />

          <Button label="Create Account" onPress={handleRegister} loading={loading} style={{ marginTop: spacing[2] }} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}> Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  container: { paddingHorizontal: spacing[5] },
  back: { marginBottom: spacing[4] },
  backText: { fontFamily: typography.bodyMedium, fontSize: typography.size.base, color: palette.inkSecondary },
  title: { fontFamily: 'Syne-Bold', fontSize: typography.size['2xl'], color: palette.ink },
  subtitle: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkSecondary, marginTop: 4, marginBottom: spacing[5] },
  card: { backgroundColor: palette.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, padding: spacing[5], marginBottom: spacing[4] },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[2] },
  footerText: { fontFamily: typography.body, fontSize: typography.size.base, color: palette.inkSecondary },
  footerLink: { fontFamily: typography.bodySemibold, fontSize: typography.size.base, color: palette.accent },
});
