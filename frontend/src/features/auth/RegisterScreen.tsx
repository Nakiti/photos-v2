import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

const RegisterScreen = () => {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const navigation = useNavigation<any>();
  const { register, isRegistering } = useAuth();

  const onRegisterPress = async () => {
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await register({ name: trimmedName, email: trimmedEmail, handle: handle, password });
      // @ts-ignore: navigate to main app
      navigation.navigate('TabNavigator');
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text variant="headlineLarge" style={styles.title}>Create account</Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurface, opacity: 0.6 }]}>
              Join and start sharing
            </Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]} accessibilityRole="alert">{error}</Text>
            ) : null}
            <TextInput
              label="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              mode="flat"
              style={styles.input}
              underlineColor={theme.colors.outline}
              activeUnderlineColor={theme.colors.outline}
              selectionColor={theme.colors.onSurface}
              dense
              returnKeyType="next"
            />

            <TextInput
              label="Handle"
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              autoCorrect={false}
              mode="flat"
              style={styles.input}
              underlineColor={theme.colors.outline}
              activeUnderlineColor={theme.colors.outline}
              selectionColor={theme.colors.onSurface}
              dense
              returnKeyType="next"
            />

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              mode="flat"
              style={styles.input}
              underlineColor={theme.colors.outline}
              activeUnderlineColor={theme.colors.outline}
              selectionColor={theme.colors.onSurface}
              dense
              returnKeyType="next"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              mode="flat"
              style={styles.input}
              underlineColor={theme.colors.outline}
              activeUnderlineColor={theme.colors.outline}
              selectionColor={theme.colors.onSurface}
              dense
              returnKeyType="next"
            />

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              mode="flat"
              style={styles.input}
              underlineColor={theme.colors.outline}
              activeUnderlineColor={theme.colors.outline}
              selectionColor={theme.colors.onSurface}
              dense
              returnKeyType="go"
              onSubmitEditing={onRegisterPress}
            />

            <Button
              mode="contained"
              onPress={onRegisterPress}
              style={styles.submitButton}
              contentStyle={styles.submitContent}
              loading={isRegistering}
              disabled={isRegistering}
              buttonColor={theme.colors.onSurface}
              textColor={theme.colors.surface}
            >
              Create account
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              style={styles.secondaryAction}
              compact
              textColor={theme.colors.onSurface}
            >
              I already have an account
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 12,
  },
  headerContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    opacity: 0.7,
  },
  form: {
    gap: 6,
  },
  input: {
    backgroundColor: 'transparent',
  },
  errorText: {
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 8,
  },
  submitContent: {
    height: 48,
  },
  secondaryAction: {
    marginTop: 2,
    alignSelf: 'center',
  },
});


