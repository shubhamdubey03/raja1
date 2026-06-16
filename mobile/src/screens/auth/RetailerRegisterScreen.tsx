/**
 * P5-07 — Retailer Self-Registration + OTP
 * Multi-step: Business details → OTP → immediate access
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, Store } from 'lucide-react-native';
import api from '../../services/api';
import { setCredentials } from '../../store/slices/authSlice';
import { useAppDispatch } from '../../hooks/useRedux';
import { Button, Input } from '../../components';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';

interface Props { navigation: NativeStackNavigationProp<any> }

interface FormData {
  business_name: string;
  owner_name: string;
  mobile: string;
  business_type: string;
  gst_number: string;
  city: string;
  state: string;
}

const steps = [
  { label: 'Business Details', active: true },
  { label: 'OTP Verification', active: false },
  { label: 'Access Granted', active: false },
];

const RetailerRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState<FormData>({
    business_name: '', owner_name: '', mobile: '',
    business_type: 'General Store', gst_number: '', city: '', state: '',
  });
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof FormData, val: string) => setForm(f => ({ ...f, [key]: val }));

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
      await api.post('/retailer/auth/register', { ...form, mobile: `+91${form.mobile}` });
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
      const res = await api.post('/retailer/auth/otp/verify', {
        mobile: `+91${form.mobile}`,
        otp,
        purpose: 'register',
      });
      const profile = await api.get('/me', { headers: { Authorization: `Bearer ${res.data.access_token}` } });
      dispatch(setCredentials({
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
        user: { ...profile.data, role: 'retailer' },
      }));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => step === 'otp' ? setStep('form') : navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Store size={18} color={Colors.primaryDark} />
          </View>
          <Text style={styles.heroTitle}>Retailer Registration</Text>
          <Text style={styles.heroSubtitle}>Help us build your business profile for curated inventory, offers, and quick onboarding.</Text>
        </View>

        <View style={styles.stepperRow}>
          <View style={styles.stepperLine} />
          {steps.map((item, index) => {
            const isActive = step === 'form' ? index === 0 : index === 1;
            return (
              <View key={item.label} style={styles.stepItem}>
                <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
                  <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{index + 1}</Text>
                </View>
                <Text style={[styles.stepText, isActive && styles.stepTextActive]} numberOfLines={2}>{item.label}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>{step === 'form' ? 'Business Details' : 'Verify OTP'}</Text>

        <View style={styles.formCard}>
          {step === 'form' ? (
            <>
              <Input label="Business Name *" value={form.business_name} onChangeText={t => update('business_name', t)} placeholder="Raja General Store" containerStyle={styles.field} />
              <Input label="Owner Name *" value={form.owner_name} onChangeText={t => update('owner_name', t)} placeholder="Rajesh Kumar" containerStyle={styles.field} />
              <View style={styles.field}>
                <Text style={styles.inputLabel}>Mobile Number *</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.prefix}><Text style={styles.prefixText}>+91</Text></View>
                  <Input
                    value={form.mobile}
                    onChangeText={t => update('mobile', t.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="number-pad"
                    placeholder="9876543210"
                    style={styles.phoneInput}
                    containerStyle={{ marginBottom: 0, flex: 1 }}
                  />
                </View>
              </View>
              <Input label="Business Type" value={form.business_type} onChangeText={t => update('business_type', t)} placeholder="General Store" containerStyle={styles.field} />
              <Input label="GST Number (optional)" value={form.gst_number} onChangeText={t => update('gst_number', t.toUpperCase())} placeholder="29AADCB2230M1ZP" containerStyle={styles.field} />
              <Input label="City" value={form.city} onChangeText={t => update('city', t)} placeholder="Mumbai" containerStyle={styles.field} />
              <Input label="State" value={form.state} onChangeText={t => update('state', t)} placeholder="Maharashtra" containerStyle={styles.field} />
              <Button
                label="Continue"
                onPress={handleRegister}
                loading={loading}
                icon={<ArrowRight size={18} color={Colors.white} />}
                style={styles.ctaButton}
              />
              <Text style={styles.disclaimer}>By continuing, you agree to our Terms of Service and Privacy Policy.</Text>
            </>
          ) : (
            <>
              <Text style={styles.otpIntro}>Enter the 6-digit code sent to +91{form.mobile}</Text>
              <Input label="OTP Code" value={otp} onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="123456" maxLength={6} containerStyle={styles.field} />
              <Button
                label="Verify & Continue"
                onPress={handleVerify}
                loading={loading}
                icon={<ArrowRight size={18} color={Colors.white} />}
                style={styles.ctaButton}
              />
              <TouchableOpacity onPress={timer === 0 ? handleRegister : undefined} disabled={timer > 0} activeOpacity={0.7}>
                <Text style={[styles.resend, timer > 0 && styles.resendDisabled]}>
                  {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {step === 'form' && (
          <TouchableOpacity onPress={() => navigation.navigate('VendorLogin', { role: 'retailer' })} activeOpacity={0.7}>
            <Text style={styles.signInText}>Already registered? Sign In</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxxl },
  back: { color: Colors.primary, fontWeight: '700', marginBottom: Spacing.md, fontSize: Typography.base },
  heroCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  heroBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: { fontSize: Typography.subheading, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  heroSubtitle: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 22 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl, position: 'relative' },
  stepperLine: { position: 'absolute', top: 16, left: Spacing.md, right: Spacing.md, height: 1, backgroundColor: Colors.border },
  stepItem: { flex: 1, alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepNumber: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textMuted },
  stepNumberActive: { color: Colors.white },
  stepText: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },
  stepTextActive: { color: Colors.textPrimary, fontWeight: '700' },
  sectionTitle: { fontSize: Typography.heading, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  formCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  field: { marginBottom: Spacing.md },
  inputLabel: { fontSize: Typography.label, color: Colors.textSecondary, fontWeight: '700', marginBottom: Spacing.xs },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  prefix: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  prefixText: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  phoneInput: { flex: 1, marginBottom: 0 },
  ctaButton: { marginTop: Spacing.sm },
  disclaimer: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 18 },
  otpIntro: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.md },
  resend: { textAlign: 'center', color: Colors.primary, fontWeight: '700', marginTop: Spacing.md, fontSize: Typography.sm },
  resendDisabled: { opacity: 0.5 },
  signInText: { color: Colors.secondary, fontWeight: '700', fontSize: Typography.sm, marginTop: Spacing.md, textAlign: 'center' },
});

export default RetailerRegisterScreen;
