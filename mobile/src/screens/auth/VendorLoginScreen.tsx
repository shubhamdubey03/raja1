/**
 * Figma PDF Page 4 & 5 — Mobile Input & OTP Verification Screen
 * Unified authentication flow matching the high-fidelity mockups.
 * Features 6-digit individual box inputs, lock/badge SVGs, masked numbers,
 * custom countdown timers, and concierge support links.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, TextInput, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { setCredentials } from '../../store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { ArrowRight, Lock, ArrowLeft, HelpCircle, ChevronDown } from 'lucide-react-native';
import Svg, { Rect, Path, Line } from 'react-native-svg';
import translations, { AppLanguage } from '../../i18n';

const appLogo = require('../../assets/appicon_multicolor_512.png');

interface Props {
  route?: any;
  navigation: NativeStackNavigationProp<any>;
}

const VendorLoginScreen: React.FC<Props> = ({ route, navigation }) => {
  const dispatch = useAppDispatch();
  const savedLang = useAppSelector(s => (s as any).settings?.language ?? 'en') as AppLanguage;

  const [role, setRole] = useState<'vendor' | 'retailer'>(route?.params?.role || 'vendor');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');

  // OTP individual values
  const [otpVal, setOtpVal] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<any[]>([]);

  useEffect(() => {
    if (route?.params?.role) {
      setRole(route.params.role);
    }
  }, [route?.params?.role]);

  const t = (key: string) => {
    const dict = translations[savedLang] ?? translations.en;
    return (dict as any)[key] ?? (translations.en as any)[key] ?? key;
  };

  const startTimer = () => {
    setTimer(59);
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
      if (role === 'vendor') {
        await api.post('/vendor/auth/login', { mobile: `+91${mobile}` });
      } else {
        await api.post('/otp/send', { mobile: `+91${mobile}`, purpose: 'login' });
      }
      setOtpVal(['', '', '', '', '', '']);
      setStep('otp');
      startTimer();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Please register as vendor first');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCombined = otpVal.join('');
    if (otpCombined.length !== 6) {
      Alert.alert('Error', 'Enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (role === 'vendor') {
        res = await api.post('/vendor/auth/otp/verify', { mobile: `+91${mobile}`, otp: otpCombined });
      } else {
        res = await api.post('/retailer/auth/otp/verify', { mobile: `+91${mobile}`, otp: otpCombined, purpose: 'login' });
      }
      const profile = await api.get('/me', {
        headers: { Authorization: `Bearer ${res.data.access_token}` },
      });
      dispatch(setCredentials({
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
        user: { ...profile.data, role: role },
      }));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeText = (text: string, index: number) => {
    const val = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpVal];
    newOtp[index] = val;
    setOtpVal(newOtp);

    // Auto-focus next input if filled
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otpVal[index] && index > 0) {
        const newOtp = [...otpVal];
        newOtp[index - 1] = '';
        setOtpVal(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getMaskedMobile = (num: string) => {
    if (num.length < 3) return `+91 ••••• ••${num}`;
    return `+91 ••••• ••${num.slice(-3)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => step === 'otp' ? setStep('mobile') : navigation.goBack()}
          activeOpacity={0.7}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'mobile' ? (
          <>
            {/* Page 4 - Mobile Number Input */}
            <View style={styles.brandContainer}>
              <View style={styles.logoBlock}>
                <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={styles.brandName}>SUPPLY SETU</Text>
            </View>

            <Text style={styles.title}>Welcome back.</Text>
            <Text style={styles.subtitle}>
              Enter your mobile number to securely access your logistics dashboard.
            </Text>

            {/* White card container */}
            <View style={styles.card}>
              <Text style={styles.inputLabel}>MOBILE NUMBER</Text>

              <View style={styles.phoneInputRow}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.flag}>🇮🇳</Text>
                  <Text style={styles.countryCode}>+91</Text>
                  <ChevronDown size={16} color={Colors.textMuted} />
                </View>
                <View style={styles.prefixDivider} />
                <TextInput
                  style={styles.phoneInput}
                  value={mobile}
                  onChangeText={t => setMobile(t.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="number-pad"
                  placeholder="98765 43210"
                  placeholderTextColor="#7F7B7B"
                  maxLength={10}
                />
              </View>

              <View style={styles.helperRow}>
                <HelpCircle size={14} color={Colors.textMuted} />
                <Text style={styles.helperText}>A 6-digit OTP will be sent to this number.</Text>
              </View>

              <TouchableOpacity style={styles.btn} onPress={handleSendOTP} activeOpacity={0.85} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Text style={styles.btnText}>Send OTP</Text>
                    <ArrowRight size={16} color={Colors.white} strokeWidth={2.5} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('RoleSelect')} style={styles.linkContainer}>
              <Text style={styles.linkText}>
                New to the network? <Text style={styles.linkGold}>Request access</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Page 5 - OTP Verification */}
            <View style={styles.illustrationWrap}>
              <View style={styles.iconCircle}>
                <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={Colors.textPrimary} strokeWidth={2}>
                  <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <Line x1="12" y1="18" x2="12" y2="18.01" strokeWidth={3} />
                  <Rect x="9" y="8" width="6" height="5" rx="1" ry="1" fill={Colors.textPrimary} />
                  <Path d="M10 8V6a2 2 0 1 1 4 0v2" />
                </Svg>
                {/* Yellow dot badge */}
                <View style={styles.badge} />
              </View>
            </View>

            <Text style={styles.title}>Security Verification</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to <Text style={{ fontWeight: '700' }}>{getMaskedMobile(mobile)}</Text>
            </Text>

            {/* 6 Individual OTP Boxes */}
            <View style={styles.otpBoxesRow}>
              {otpVal.map((val, index) => (
                <TextInput
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  style={styles.otpBox}
                  value={val}
                  onChangeText={text => handleChangeText(text, index)}
                  onKeyPress={e => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  placeholder="•"
                  placeholderTextColor="#7F7B7B"
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Countdown timer & resend */}
            <Text style={styles.timerLabel}>
              REQUEST A NEW CODE IN  <Text style={styles.timerGold}>{formatTime(timer)}</Text>
            </Text>

            <TouchableOpacity
              disabled={timer > 0 || loading}
              onPress={handleSendOTP}
              activeOpacity={0.7}
              style={styles.resendLinkBtn}>
              <Text style={[styles.resendLinkText, timer > 0 && { color: Colors.textMuted }]}>
                RESEND CODE
              </Text>
            </TouchableOpacity>

            {/* Action button */}
            <TouchableOpacity style={styles.btnVerify} onPress={handleVerifyOTP} activeOpacity={0.85} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.btnVerifyText}>VERIFY & CONTINUE</Text>
                  <ArrowRight size={16} color="#E8C449" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Concierge', 'Connecting you to concierge assistance...')}
              style={styles.troubleLink}>
              <Text style={styles.troubleLinkText}>
                Having trouble? <Text style={styles.troubleGold}>Contact Concierge</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Global Footer (shows on both steps) */}
        <View style={styles.footer}>
          <View style={styles.footerLinkRow}>
            <Text style={styles.footerLink}>PRIVACY POLICY</Text>
            <Text style={styles.footerLinkDot}>•</Text>
            <Text style={styles.footerLink}>TERMS OF SERVICE</Text>
          </View>

          <View style={styles.footerCopyRow}>
            <Text style={styles.footerCopy}>© 2024 Supply Setu Enterprise</Text>
            <View style={styles.secureContainer}>
              <Lock size={10} color={Colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.secureText}>Secure Encryption</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EE',
  },
  topHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#F5F3EE',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: '#D9D6CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerLogoMini: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    backgroundColor: '#121111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoImage: {
    width: 16,
    height: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoBlock: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  brandName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A6A1E',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#E7E2D8',
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A6A1E',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3EE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: Spacing.md,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  prefixDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#D8D4CD',
    marginHorizontal: Spacing.md,
  },
  flag: {
    fontSize: 18,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
    paddingVertical: 0,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  btn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    ...Shadow.sm,
  },
  btnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  linkContainer: {
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xxl,
  },
  linkText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  linkGold: {
    color: Colors.primary,
    fontWeight: '700',
  },
  illustrationWrap: {
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FAF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEBEB',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E8C449',
    borderWidth: 1.5,
    borderColor: '#FAF5F5',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  otpBox: {
    width: 44,
    height: 54,
    borderWidth: 1.5,
    borderColor: '#EFEBEB',
    borderRadius: 8,
    backgroundColor: Colors.white,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    ...Shadow.sm,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  timerGold: {
    color: Colors.primary,
  },
  resendLinkBtn: {
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  resendLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  btnVerify: {
    backgroundColor: '#000000',
    borderRadius: Radius.full,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  btnVerifyText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.body,
    letterSpacing: 1,
  },
  troubleLink: {
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xxl,
  },
  troubleLinkText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  troubleGold: {
    color: Colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#F7F4F4',
  },
  footerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  footerLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A6A1E',
    letterSpacing: 0.8,
  },
  footerLinkDot: {
    fontSize: 11,
    color: '#7A6A1E',
  },
  footerCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.sm,
  },
  footerCopy: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  secureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secureText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});

export default VendorLoginScreen;
