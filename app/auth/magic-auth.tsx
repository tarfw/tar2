import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/db';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MagicAuthScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email'); // Track current step
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { sendMagicCode, signInWithMagicCode, loadingProfile } = useAuth();
  const { user } = db.useAuth();
  const emailInputRef = useRef<TextInput>(null);
  const codeInputRef = useRef<TextInput>(null);
  const isAutoSubmitting = useRef(false);

  // If user is already authenticated and we're not still loading the profile, redirect to the main app
  useEffect(() => {
    if (user && !loadingProfile) {
      router.replace('/(tabs)');
    }
  }, [user, loadingProfile, router]);

  // Focus on appropriate input when step changes
  useEffect(() => {
    // Delay to ensure UI is fully rendered
    const timer = setTimeout(() => {
      if (step === 'email' && emailInputRef.current) {
        emailInputRef.current?.focus();
      } else if (step === 'code' && codeInputRef.current) {
        codeInputRef.current?.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [step]);

  const handleSendMagicCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending magic code to:', email);
      await sendMagicCode(email);
      setStep('code');
      setCode(''); // Clear any previous code
      isAutoSubmitting.current = false; // Reset auto-submit flag
    } catch (error: any) {
      console.error('Error sending magic code:', error);
      const errorMessage = error.body?.message || error.message || 'Failed to send magic code. Please check your email and try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) {
      Alert.alert('Error', 'Please enter the magic code');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Error', 'Magic code must be 6 digits');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying magic code for:', email, 'Code:', code);
      await signInWithMagicCode(email, code);
      // Navigation will be handled by InstantDB's SignedIn/SignedOut components
      // But we also have the useEffect above as a backup
    } catch (error: any) {
      console.error('Error verifying magic code:', error);
      setCode('');
      
      // Provide a more user-friendly error message for the specific error we're seeing
      let errorMessage = error.body?.message || error.message || 'Failed to verify code. Please check the code and try again.';
      
      if (errorMessage.includes('Record not found: app-user-magic-code')) {
        errorMessage = 'Invalid magic code or the code has expired. Please request a new code.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      isAutoSubmitting.current = false; // Reset auto-submit flag
    }
  };

  // Handle code changes and auto-submit when we have 6 digits
  const handleCodeChange = (text: string) => {
    setCode(text);
    
    // Auto-submit when we have 6 digits and haven't already auto-submitted
    if (text.length === 6 && !isAutoSubmitting.current) {
      isAutoSubmitting.current = true; // Set flag to prevent multiple auto-submissions
      // Use setTimeout to ensure state is updated before submitting
      setTimeout(() => {
        handleVerifyCode();
      }, 100);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    setLoading(true);
    try {
      console.log('Resending magic code to:', email);
      await sendMagicCode(email);
      setCode(''); // Clear the code field
      Alert.alert('Success', 'Magic code resent successfully');
    } catch (error: any) {
      console.error('Error resending magic code:', error);
      const errorMessage = error.body?.message || error.message || 'Failed to resend magic code. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    isAutoSubmitting.current = false; // Reset auto-submit flag
  };

  // If user is already authenticated and profile is loaded, show redirecting message
  if (user && !loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Redirecting...</Text>
      </SafeAreaView>
    );
  }
  
  // If we're still loading the profile but the user is authenticated, show loading indicator
  if (user && loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {step === 'email' ? (
            // Email input step
            <>
              <Text style={styles.title}>Sign In</Text>
              <Text style={styles.subtitle}>Enter your email to receive a magic code</Text>
              
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                textContentType="emailAddress" // iOS only - helps with autofill
                autoComplete="email" // Android only - helps with autofill
                returnKeyType="next"
                onSubmitEditing={handleSendMagicCode}
              />
              
              <TouchableOpacity 
                style={[styles.button, loading && styles.disabledButton]} 
                onPress={handleSendMagicCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Magic Code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            // Code verification step
            <>
              <Text style={styles.title}>Verify Magic Code</Text>
              <Text style={styles.subtitle}>Enter the code sent to {email}</Text>
              
              <TextInput
                ref={codeInputRef}
                style={styles.input}
                placeholder="Magic Code"
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoFocus
                textContentType="oneTimeCode" // iOS only - helps with SMS code autofill
                maxLength={6} // Magic codes are typically 6 digits
                returnKeyType="done"
                onSubmitEditing={handleVerifyCode}
              />
              
              <TouchableOpacity 
                style={[styles.button, loading && styles.disabledButton]} 
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify Code</Text>
                )}
              </TouchableOpacity>
              
              <View style={styles.resendContainer}>
                <Text>Didn&apos;t receive the code? </Text>
                <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                  <Text style={styles.resendText}>Resend</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.secondaryButton, loading && styles.disabledButton]} 
                onPress={handleBackToEmail}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Back to Email</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16, // Better readability
  },
  button: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderColor: '#007AFF',
    borderWidth: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resendText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});