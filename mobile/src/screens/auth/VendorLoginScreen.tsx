/**
 * P5-06 — Vendor Login + OTP flow
 * Mobile → OTP → dispatch auth → Vendor Home
 */
import React, {useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, Alert} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import api from '../../services/api';
import {setCredentials} from '../../store/slices/authSlice';
import {useAppDispatch} from '../../hooks/useRedux';
import {Button, Input} from '../../components';
import {Colors, Typography, Spacing, Radius} from '../../theme';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

const VendorLoginScreen: React.FC<Props> = ({navigation}) => {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  const startTimer = () => {
    setTimer(60);
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!mobile || mobile.length < 10) {
      Alert.alert('Error', 'Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/vendor/auth/login', {mobile: `+91${mobile}`});
      setOtpId(res.data.otp_id || '');
      setStep('otp');
      startTimer();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/vendor/auth/otp/verify', {mobile: `+91${mobile}`, otp});
      const profile = await api.get('/me', {
        headers: {Authorization: `Bearer ${res.data.access_token}`},
      });
      dispatch(setCredentials({
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
        user: {...profile.data, role: 'vendor'},
      }));
      navigation.replace('VendorTab');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.back} onPress={() => step === 'otp' ? setStep('mobile') : navigation.goBack()}>← Back</Text>

        <Text style={styles.roleChip}>🏭 Vendor Login</Text>
        <Text style={styles.title}>{step === 'mobile' ? 'Enter your mobile' : 'Verify OTP'}</Text>
        <Text style={styles.subtitle}>
          {step === 'mobile'
            ? 'We\'ll send a 6-digit OTP to your registered number'
            : `OTP sent to +91${mobile}`}
        </Text>

        {step === 'mobile' ? (
          <>
            <View style={styles.phoneRow}>
              <View style={styles.prefix}><Text style={styles.prefixText}>+91</Text></View>
              <Input
                label=""
                value={mobile}
                onChangeText={t => setMobile(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad"
                placeholder="9876543210"
                style={{flex: 1, marginBottom: 0}}
              />
            </View>
            <Button label="Send OTP" onPress={handleSendOTP} loading={loading} />
          </>
        ) : (
          <>
            <Input
              label="6-Digit OTP"
              value={otp}
              onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="------"
              maxLength={6}
            />

            <Button label="Verify & Login" onPress={handleVerifyOTP} loading={loading} />

            <Text style={styles.resend} onPress={timer === 0 ? handleSendOTP : undefined}>
              {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgPrimary},
  content: {padding: Spacing.lg, paddingTop: Spacing.xl},
  back: {color: Colors.primary, fontWeight: '600', marginBottom: Spacing.lg, fontSize: Typography.base},
  roleChip: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryLight,
    color: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: Radius.full, fontWeight: '700', fontSize: Typography.xs, marginBottom: Spacing.md,
  },
  title: {fontSize: Typography.xxl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4, letterSpacing: -0.5},
  subtitle: {fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.xl},
  phoneRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md},
  prefix: {
    backgroundColor: Colors.bgSecondary, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  prefixText: {fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary},
  resend: {
    textAlign: 'center', color: Colors.primary, fontWeight: '600',
    marginTop: Spacing.md, fontSize: Typography.sm,
  },
});

export default VendorLoginScreen;
