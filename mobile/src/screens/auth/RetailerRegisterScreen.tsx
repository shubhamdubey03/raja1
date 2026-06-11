/**
 * P5-07 — Retailer Self-Registration + OTP
 * Multi-step: Business details → OTP → immediate access
 */
import React, {useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, Alert} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import api from '../../services/api';
import {setCredentials} from '../../store/slices/authSlice';
import {useAppDispatch} from '../../hooks/useRedux';
import {Button, Input} from '../../components';
import {Colors, Typography, Spacing, Radius} from '../../theme';

interface Props {navigation: NativeStackNavigationProp<any>}

interface FormData {
  business_name: string;
  owner_name: string;
  mobile: string;
  business_type: string;
  gst_number: string;
  city: string;
  state: string;
}

const RetailerRegisterScreen: React.FC<Props> = ({navigation}) => {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState<FormData>({
    business_name: '', owner_name: '', mobile: '',
    business_type: 'General Store', gst_number: '', city: '', state: '',
  });
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof FormData, val: string) => setForm(f => ({...f, [key]: val}));

  const startTimer = () => {
    setTimer(60);
    const interval = setInterval(() => {
      setTimer(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleRegister = async () => {
    if (!form.business_name || !form.owner_name || !form.mobile || form.mobile.length < 10) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await api.post('/retailer/auth/register', {...form, mobile: `+91${form.mobile}`});
      setStep('otp');
      startTimer();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { Alert.alert('Error', 'Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      const res = await api.post('/retailer/auth/otp/verify', {mobile: `+91${form.mobile}`, otp});
      const profile = await api.get('/me', {headers: {Authorization: `Bearer ${res.data.access_token}`}});
      dispatch(setCredentials({
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
        user: {...profile.data, role: 'retailer'},
      }));
      navigation.replace('RetailerTab');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const BUSINESS_TYPES = ['General Store', 'Supermarket', 'Medical', 'Electronics', 'Clothing', 'Other'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.back} onPress={() => step === 'otp' ? setStep('form') : navigation.goBack()}>← Back</Text>
        <Text style={styles.roleChip}>🏪 Retailer Registration</Text>
        <Text style={styles.title}>{step === 'form' ? 'Business Details' : 'Verify OTP'}</Text>

        {/* Step 1 — Progress indicator */}
        <View style={styles.progressRow}>
          {['Details', 'OTP', 'Done'].map((s, i) => (
            <View key={s} style={styles.progressItem}>
              <View style={[styles.progressDot, (step === 'form' ? i === 0 : i <= 1) && styles.progressDotActive]} />
              <Text style={styles.progressLabel}>{s}</Text>
            </View>
          ))}
        </View>

        {step === 'form' ? (
          <>
            <Input label="Business Name *" value={form.business_name} onChangeText={t => update('business_name', t)} placeholder="Raja General Store" />
            <Input label="Owner Name *" value={form.owner_name} onChangeText={t => update('owner_name', t)} placeholder="Rajesh Kumar" />
            <View style={styles.phoneRow}>
              <View style={styles.prefix}><Text style={styles.prefixText}>+91</Text></View>
              <Input label="Mobile *" value={form.mobile} onChangeText={t => update('mobile', t.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" placeholder="9876543210" style={{flex: 1, marginBottom: 0}} />
            </View>
            <Input label="Business Type" value={form.business_type} onChangeText={t => update('business_type', t)} placeholder="General Store" />
            <Input label="GST Number (optional)" value={form.gst_number} onChangeText={t => update('gst_number', t.toUpperCase())} placeholder="29AADCB2230M1ZP" />
            <Input label="City" value={form.city} onChangeText={t => update('city', t)} placeholder="Mumbai" />
            <Input label="State" value={form.state} onChangeText={t => update('state', t)} placeholder="Maharashtra" />
            <Button label="Register & Send OTP" onPress={handleRegister} loading={loading} />
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>OTP sent to +91{form.mobile}</Text>
            <Input label="6-Digit OTP" value={otp} onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="------" maxLength={6} />
            <Button label="Verify & Continue" onPress={handleVerify} loading={loading} />
            <Text style={styles.resend} onPress={timer === 0 ? handleRegister : undefined}>
              {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
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
  roleChip: {alignSelf: 'flex-start', backgroundColor: Colors.secondaryLight, color: Colors.secondary, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full, fontWeight: '700', fontSize: Typography.xs, marginBottom: Spacing.md},
  title: {fontSize: Typography.xxl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md, letterSpacing: -0.5},
  subtitle: {fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.lg},
  progressRow: {flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.xl},
  progressItem: {alignItems: 'center', gap: 4},
  progressDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border},
  progressDotActive: {backgroundColor: Colors.primary},
  progressLabel: {fontSize: Typography.xs, color: Colors.textMuted},
  phoneRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 0},
  prefix: {backgroundColor: Colors.bgSecondary, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, marginTop: 22},
  prefixText: {fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary},
  resend: {textAlign: 'center', color: Colors.primary, fontWeight: '600', marginTop: Spacing.md, fontSize: Typography.sm},
});

export default RetailerRegisterScreen;
