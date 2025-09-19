import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';

export default function MagicAuthScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email'); // Track current step
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { sendMagicCode, signInWithMagicCode } = useAuth();

  const handleSendMagicCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await sendMagicCode(email);
      setStep('code');
    } catch (error: any) {
      Alert.alert('Error', error.body?.message || error.message || 'Failed to send magic code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) {
      Alert.alert('Error', 'Please enter the magic code');
      return;
    }

    setLoading(true);
    try {
      await signInWithMagicCode(email, code);
      // Navigation will be handled by InstantDB's SignedIn/SignedOut components
    } catch (error: any) {
      setCode('');
      Alert.alert('Error', error.body?.message || error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await sendMagicCode(email);
      Alert.alert('Success', 'Magic code resent successfully');
    } catch (error: any) {
      Alert.alert('Error', error.body?.message || error.message || 'Failed to resend magic code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
  };

  return (
    <View style={styles.container}>
      {step === 'email' ? (
        // Email input step
        <>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Enter your email to receive a magic code</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
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
            style={styles.input}
            placeholder="Magic Code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoFocus
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
            <Text style={styles.secondaryButtonText}>Back to Email</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
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