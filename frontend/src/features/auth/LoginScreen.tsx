import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
      console.log("click")
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
    // no-op: presentational only
  };

  const onCreateAccount = () => {
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text variant="headlineLarge" style={styles.title}>Welcome back</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Sign in to continue</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
          style={styles.input}
        />

        {error ? (
          <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }] }>
            {error}
          </Text>
        ) : null}

        <Button mode="text" onPress={onForgotPassword} style={styles.forgotButton}>
          Forgot password?
        </Button>

        <Button mode="contained" onPress={onLoginPress} loading={isLoggingIn} disabled={isLoggingIn} style={styles.submitButton}>
          Sign In
        </Button>

        <Button mode="outlined" onPress={onCreateAccount} style={styles.createAccountButton}>
          Create Account
        </Button>
      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.7,
  },
  form: {
    gap: 12,
  },
  input: {
    // spacing handled by gap
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  submitButton: {
    marginTop: 8,
  },
  createAccountButton: {
    marginTop: 8,
  },
  errorText: {
    marginTop: -4,
  },
});


