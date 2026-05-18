import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { resetPassword } from '../../services/api/auth.service';

const ResetPasswordScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email: string = route.params?.email ?? '';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordRef = useRef<any>(null);
  const confirmRef = useRef<any>(null);

  const validate = (): string | null => {
    if (code.length !== 6) return 'Enter the 6-digit code from your email.';
    if (newPassword.length < 8) return 'Password must be at least 8 characters.';
    if (newPassword !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const onSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await resetPassword(code.trim(), newPassword);
      setSuccess(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: theme.colors.onSurface }]}>
            <Ionicons name="checkmark" size={32} color={theme.colors.surface} />
          </View>
          <Text variant="headlineSmall" style={styles.successTitle}>Password updated</Text>
          <Text variant="bodyMedium" style={[styles.successSubtitle, { color: theme.colors.onSurface, opacity: 0.6 }]}>
            Your password has been changed successfully.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Login')}
            style={styles.successButton}
            contentStyle={styles.submitContent}
            buttonColor={theme.colors.onSurface}
            textColor={theme.colors.surface}
          >
            Sign In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <Text variant="headlineLarge" style={styles.title}>Reset password</Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurface, opacity: 0.6 }]}>
              Enter the code sent to{' '}
              <Text variant="bodyMedium" style={{ fontWeight: '600', opacity: 1 }}>{email}</Text>
              {' '}and choose a new password.
            </Text>
          </View>

          {error ? (
            <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
          ) : null}

          <View style={styles.form}>
            <TextInput
              label="6-digit code"
              value={code}
              onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              mode="flat"
              style={styles.input}
              underlineColor={theme.colors.outline}
              activeUnderlineColor={theme.colors.outline}
              selectionColor={theme.colors.onSurface}
              dense
              maxLength={6}
            />

            <TextInput
              ref={passwordRef}
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              mode="flat"
              style={styles.input}
              underlineColor={theme.colors.outline}
              activeUnderlineColor={theme.colors.outline}
              selectionColor={theme.colors.onSurface}
              dense
            />

            <TextInput
              ref={confirmRef}
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              mode="flat"
              style={styles.input}
              underlineColor={theme.colors.outline}
              activeUnderlineColor={theme.colors.outline}
              selectionColor={theme.colors.onSurface}
              dense
            />

            <Button
              mode="contained"
              onPress={onSubmit}
              loading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
              contentStyle={styles.submitContent}
              buttonColor={theme.colors.onSurface}
              textColor={theme.colors.surface}
            >
              Reset Password
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('ForgotPassword')}
              compact
              textColor={theme.colors.onSurface}
              style={styles.resendLink}
            >
              Resend code
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    justifyContent: 'center',
    gap: 12,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  headerContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  title: { marginBottom: 6 },
  subtitle: { lineHeight: 22 },
  form: { gap: 6 },
  input: { backgroundColor: 'transparent' },
  submitButton: { marginTop: 8 },
  submitContent: { height: 48 },
  resendLink: { alignSelf: 'center', marginTop: 2 },
  errorText: { marginBottom: 4 },

  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  successSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  successButton: {
    width: '100%',
    marginTop: 8,
  },
});
