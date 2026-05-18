import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { forgotPassword } from '../../services/api/auth.service';

const ForgotPasswordScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await forgotPassword(trimmed);
      navigation.navigate('ResetPassword', { email: trimmed });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <Text variant="headlineLarge" style={styles.title}>Forgot password?</Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurface, opacity: 0.6 }]}>
              Enter your email and we'll send you a 6-digit reset code.
            </Text>
          </View>

          {error ? (
            <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
          ) : null}

          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="send"
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
              Send Reset Code
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              compact
              textColor={theme.colors.onSurface}
              style={styles.backLink}
            >
              Back to Sign In
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;

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
  backLink: { alignSelf: 'center', marginTop: 2 },
  errorText: { marginBottom: 4 },
});
