import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/db';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell } from 'react-native-confirmation-code-field';

export default function MagicAuthScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email'); // Track current step
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const router = useRouter();
  const { sendMagicCode, signInWithMagicCode, loadingProfile, requiresUsernameSetup, checkIfUserHasUsername } = useAuth();
  const { user } = db.useAuth();
  const emailInputRef = useRef<TextInput>(null);
  const codeInputRef = useBlurOnFulfill({ value: code, cellCount: 6 });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  });

  // If user is already authenticated and we're not still loading the profile, redirect to the main app
  useEffect(() => {
    if (user && !loadingProfile) {
      // Check if user needs to set up their username
      if (requiresUsernameSetup) {
        router.replace('/profile');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [user, loadingProfile, requiresUsernameSetup, router]);

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
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your email address'
      });
      return;
    }

    setLoading(true);
    setCheckingUser(true);
    try {
      console.log('Sending magic code to:', email);
      await sendMagicCode(email);
      
      // Check if user already has a username for optimization
      const hasUsername = await checkIfUserHasUsername(email);
      console.log('User has username:', hasUsername);
      
      setStep('code');
      setCode(''); // Clear any previous code
    } catch (error: any) {
      console.error('Error sending magic code:', error);
      const errorMessage = error.body?.message || error.message || 'Failed to send magic code. Please check your email and try again.';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage
      });
    } finally {
      setLoading(false);
      setCheckingUser(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a 6-digit magic code'
      });
      return;
    }

    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Email is required'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying magic code for:', email, 'Code:', code);
      await signInWithMagicCode(email, code);
      
      // After successful sign in, check if user needs to set up username
      // This will be handled by the useEffect in the AuthProvider
    } catch (error: any) {
      console.error('Error verifying magic code:', error);
      setCode('');
      
      // Provide a generic error message
      const errorMessage = error.body?.message || error.message || 'Failed to verify code. Please check the code and try again.';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle code changes
  const handleCodeChange = (text: string) => {
    setCode(text);
  };

  const handleResendCode = async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your email address first'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Resending magic code to:', email);
      await sendMagicCode(email);
      setCode(''); // Clear the code field
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Magic code resent successfully'
      });
    } catch (error: any) {
      console.error('Error resending magic code:', error);
      const errorMessage = error.body?.message || error.message || 'Failed to resend magic code. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
  };

  // If we're checking if user has username, show loading
  if (checkingUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Checking account...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
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
              
              <CodeField
                ref={codeInputRef}
                {...props}
                value={code}
                onChangeText={setCode}
                cellCount={6}
                rootStyle={styles.codeFieldRoot}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                renderCell={({ index, symbol, isFocused }) => (
                  <Text
                    key={index}
                    style={[styles.cell, isFocused && styles.focusCell]}
                    onLayout={getCellOnLayoutHandler(index)}>
                    {symbol || (isFocused ? <Cursor /> : null)}
                  </Text>
                )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  root: { flex: 1, padding: 20 },
  titleConfirmation: { textAlign: 'center', fontSize: 30 },
  codeFieldRoot: { marginTop: 20, marginBottom: 20 },
  cell: {
    width: 40,
    height: 40,
    lineHeight: 38,
    fontSize: 24,
    borderWidth: 2,
    borderColor: '#00000030',
    textAlign: 'center',
    marginHorizontal: 5,
    borderRadius: 8,
  },
  focusCell: {
    borderColor: '#007AFF',
  },
});