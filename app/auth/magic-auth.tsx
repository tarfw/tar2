import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../lib/db';
import { SafeAreaView } from 'react-native-safe-area-context';

import { storeTenantAppId, getTenantAppId } from '../../lib/secureStorage';

export default function MagicAuthScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendMagicCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      // First, check if user already has a profile in the main app
      // We'll query the profile by email to find their profile information
      const profileQuery = await db.queryOnce({
        profile: {
          $: {
            where: {
              email: email
            }
          }
        }
      });
      
      const profile = profileQuery.data.profile[0] || null;
      
      if (profile && profile.instantapp) {
        // User exists with a tenant app, store or update the tenant app ID securely
        const currentTenantId = await getTenantAppId();
        if (currentTenantId !== profile.instantapp) {
          await storeTenantAppId(profile.instantapp);
          console.log('Found existing user with tenant app ID, stored/updated securely');
        } else {
          console.log('Found existing user with existing tenant app ID');
        }
      }
      
      // Send magic code
      await db.auth.sendMagicCode({ email });
      
      setStep('code');
      setCode('');
    } catch (error: any) {
      const errorMessage = error.body?.message || error.message || 'Failed to send magic code';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit magic code');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    setLoading(true);
    try {
      // Sign in with magic code
      const result = await db.auth.signInWithMagicCode({ email, code });
      
      console.log('Sign in result:', result);
      
      if (result.user?.id) {
        // Check if user has a profile using the user ID
        // This is a more reliable approach than trying to query by email
        const profileQuery = await db.queryOnce({
          profile: {
            $: {
              where: {
                '$users.id': result.user.id
              }
            }
          }
        });
        
        const profile = profileQuery.data.profile[0] || null;
        
        console.log('Profile existence from user ID check:', !!profile);
        console.log('Profile from user ID check:', profile);
        
        if (profile && profile.instantapp) {
          // User has profile with tenant app, go directly to main app
          // The products component will handle switching to tenant app
          console.log('User has profile with tenant app, navigating to tabs');
          // Store the tenant app ID if it's not already stored
          if (profile.instantapp) {
            const currentTenantId = await getTenantAppId();
            if (!currentTenantId) {
              await storeTenantAppId(profile.instantapp);
            }
          }
          router.replace('/(tabs)');
        } else {
          // No profile found, go to onboarding
          console.log('User has no profile, navigating to onboarding');
          router.replace('/onboard');
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setCode('');
      const errorMessage = error.body?.message || error.message || 'Failed to verify code';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    setLoading(true);
    try {
      await db.auth.sendMagicCode({ email });
      setCode('');
      Alert.alert('Success', 'Magic code resent successfully');
    } catch (error: any) {
      const errorMessage = error.body?.message || error.message || 'Failed to resend magic code';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        {step === 'email' ? (
          // Email input step
          <View style={styles.content}>
            <Text style={styles.greetingTitle}>Hello!</Text>
            <Text style={styles.greetingSubtitle}>Let's start with TAR app</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              textContentType="emailAddress"
              autoComplete="email"
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
                <Text style={styles.buttonText}>Get Started</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Code verification step
          <View style={styles.content}>
            <Text style={styles.greetingTitle}>Enter Magic Code</Text>
            <Text style={styles.greetingSubtitle}>We've sent a code to {email}</Text>
            
            <View style={styles.codeContainer}>
              <TextInput
                style={styles.codeInput}
                placeholder="000000"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoFocus
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerifyCode}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.button, loading && styles.disabledButton]} 
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.resendContainer}>
              <Text>Didn't receive the code? </Text>
              <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                <Text style={styles.resendText}>Resend</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.secondaryButton, loading && styles.disabledButton]} 
              onPress={handleBackToEmail}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Change Email</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  greetingSubtitle: {
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
    fontSize: 16,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  codeInput: {
    height: 60,
    width: 150,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 5,
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