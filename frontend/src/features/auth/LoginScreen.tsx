import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';

const LoginScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoggingIn } = useAuth();

  const onLoginPress = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    try {
      await login({ email, password });
      // Navigate to root app stack
      // We are inside AuthStack; switch the parent RootStack to TabNavigator
      navigation.getParent()?.navigate('TabNavigator');
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || 'Login failed. Please try again.';
      setError(message);
    }
  };

  const onForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const onCreateAccount = () => {
    navigation.navigate('Register');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text variant="headlineLarge" style={styles.title}>Welcome back</Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurface, opacity: 0.6 }]}>
              Sign in to continue
            </Text>
          </View>

          {error ? (
            <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }] }>
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
              returnKeyType="next"
              mode="flat"
              style={styles.input}
              underlineColor={theme.colors.outline}
              activeUnderlineColor={theme.colors.outline}
              selectionColor={theme.colors.onSurface}
              dense
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
              returnKeyType="go"
              onSubmitEditing={onLoginPress}
              dense
            />

            <Button
              mode="text"
              onPress={onForgotPassword}
              style={styles.forgotButton}
              compact
              textColor={theme.colors.onSurface}
            >
              Forgot password?
            </Button>

            <Button
              mode="contained"
              onPress={onLoginPress}
              loading={isLoggingIn}
              disabled={isLoggingIn}
              style={styles.submitButton}
              contentStyle={styles.submitContent}
              buttonColor={theme.colors.onSurface}
              textColor={theme.colors.surface}
            >
              Sign In
            </Button>

            <Button
              mode="text"
              onPress={onCreateAccount}
              style={styles.createAccountButton}
              compact
              textColor={theme.colors.onSurface}
            >
              Create account
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

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
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  submitButton: {
    marginTop: 8,
  },
  submitContent: {
    height: 48,
  },
  createAccountButton: {
    marginTop: 2,
    alignSelf: 'center',
  },
  errorText: {
    marginBottom: 8,
  },
});


