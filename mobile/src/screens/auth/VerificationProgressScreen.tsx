/**
 * Figma PDF Page 7 — Verification in Progress Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { logout, setCredentials } from '../../store/slices/authSlice';
import api from '../../services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { ShieldAlert, CheckCircle, FileText, PhoneCall, RefreshCw, LogOut } from 'lucide-react-native';

const VerificationProgressScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const token = useAppSelector(s => s.auth.accessToken);
  const refreshToken = useAppSelector(s => s.auth.refreshToken);
  const [refreshing, setRefreshing] = useState(false);

  const checkStatus = async () => {
    setRefreshing(true);
    try {
      const profile = await api.get('/me');
      if (profile.data.is_verified || profile.data.status === 'active') {
        // Update Redux state to reflect active status
        dispatch(setCredentials({
          accessToken: token!,
          refreshToken: refreshToken!,
          user: { ...profile.data, role: user?.role || 'retailer' }
        }));
      }
    } catch (e) {
      console.error('Check status error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = () => {
    dispatch(logout());
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <ShieldAlert size={36} color={Colors.primary} />
          </View>
          <Text style={styles.brand}>Supply Setu</Text>
          <Text style={styles.title}>Verification in Progress</Text>
          <Text style={styles.subtitle}>
            We are currently reviewing your business credentials to ensure a secure trading environment. This typically takes 24-48 business hours.
          </Text>
        </View>

        <View style={styles.timeline}>
          <View style={styles.step}>
            <View style={styles.iconBox}>
              <CheckCircle size={20} color={Colors.success} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Application Submitted</Text>
              <Text style={styles.stepDesc}>Completed successfully. Our system registered your details.</Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primaryLight }]}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Document Review</Text>
              <Text style={styles.stepDesc}>Our compliance team is verifying your Tax ID, GST and Owner credentials.</Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.iconBox, { backgroundColor: Colors.bgInput }]}>
              <FileText size={18} color={Colors.textMuted} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: Colors.textMuted }]}>Marketplace Access</Text>
              <Text style={styles.stepDesc}>Once approved, you will gain full access to the wholesale catalogue.</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ESTIMATED RESOLUTION</Text>
          <Text style={styles.infoValue}>24 HOURS</Text>
          <Text style={styles.infoSub}>Quality is worth the wait.</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.btn, styles.btnPrimary]} 
            onPress={checkStatus} 
            disabled={refreshing}
            activeOpacity={0.85}>
            {refreshing ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <RefreshCw size={18} color={Colors.white} />
                <Text style={styles.btnTextPrimary}>REFRESH STATUS</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleSignOut} activeOpacity={0.85}>
            <LogOut size={18} color={Colors.primary} />
            <Text style={styles.btnTextSecondary}>SIGN OUT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.support}>
          <PhoneCall size={16} color={Colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.supportText}>Need Help? Contact Concierge Support</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  brand: {
    fontSize: Typography.label,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.heading - 2,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.caption,
    fontWeight: '400',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  timeline: {
    gap: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: Typography.caption,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.xxs,
  },
  infoValue: {
    fontSize: Typography.heading,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xxs,
  },
  infoSub: {
    fontSize: Typography.caption,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  btn: {
    borderRadius: Radius.sm,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 48,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    ...Shadow.md,
  },
  btnSecondary: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  btnTextPrimary: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.body - 1,
    letterSpacing: 1,
  },
  btnTextSecondary: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: Typography.body - 1,
    letterSpacing: 1,
  },
  support: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  supportText: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});

export default VerificationProgressScreen;

