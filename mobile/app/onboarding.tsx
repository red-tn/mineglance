import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Linking, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function OnboardingScreen() {
  const router = useRouter();
  const { login, register, resendKey } = useAuthStore();

  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleEmailContinue = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    // Check if user exists
    const result = await login(email.trim());

    if (result.success) {
      // Logged in successfully (shouldn't happen without password)
      router.replace('/(tabs)');
    } else if (result.requiresPassword) {
      // Existing user needs password
      setIsNewUser(false);
      setStep('password');
      setMessage('Enter your password to sign in.');
    } else if (result.error?.includes('not found') || result.exists === false) {
      // New user - show password field for signup
      setIsNewUser(true);
      setStep('password');
      setMessage('Create a password for your new account.');
    } else {
      setError(result.error || 'Something went wrong');
    }

    setIsLoading(false);
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    if (isNewUser) {
      // Register new user with password
      const result = await register(email.trim(), password.trim());
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Registration failed');
      }
    } else {
      // Login existing user with password
      const result = await login(email.trim(), password.trim());
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Invalid password');
      }
    }

    setIsLoading(false);
  };


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>MG</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome to MineGlance</Text>
          <Text style={styles.subtitle}>
            Sign in to sync your wallets across devices
          </Text>

          {step === 'email' ? (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleEmailContinue}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.primaryButtonText}>Continue</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.note}>
                Free account - 2 wallets.{' '}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://mineglance.com/#pricing')}
                >
                  Upgrade to Pro
                </Text>
                {' '}for unlimited.
              </Text>
            </View>
          ) : step === 'password' ? (
            <View style={styles.form}>
              {message ? (
                <Text style={styles.infoText}>{message}</Text>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder={isNewUser ? "Create a password" : "Enter your password"}
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handlePasswordSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isNewUser ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => { setStep('email'); setPassword(''); setError(''); setMessage(''); }}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => Linking.openURL('https://www.mineglance.com/reset-password')}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Don't have Pro?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => Linking.openURL('https://www.mineglance.com/#pricing')}
          >
            <Text style={styles.upgradeButtonText}>Get Pro - $59/year</Text>
          </TouchableOpacity>

          <Text style={styles.upgradeNote}>
            Unlimited wallets, mobile app, cloud sync
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 2,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  form: {
    width: '100%',
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: '#fff',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.8)',
  },
  note: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  link: {
    color: '#fbbf24',
    textDecorationLine: 'underline',
  },
  infoText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  forgotLink: {
    fontSize: fontSize.sm,
    color: '#fbbf24',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorContainer: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: borderRadius.sm,
    width: '100%',
  },
  errorText: {
    fontSize: fontSize.sm,
    color: '#fca5a5',
    textAlign: 'center',
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: spacing.xl + 20,
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dividerText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    paddingHorizontal: spacing.md,
  },
  upgradeButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fbbf24',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  upgradeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fbbf24',
  },
  upgradeNote: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
