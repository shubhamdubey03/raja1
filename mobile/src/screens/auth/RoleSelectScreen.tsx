/**
 * P5-05 — Role Selection Screen
 * Entry point for unauthenticated users.
 */
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, SafeAreaView} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Typography, Spacing, Radius, Shadow} from '../../theme';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

const RoleSelectScreen: React.FC<Props> = ({navigation}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>⚡</Text>
        <Text style={styles.title}>AMB Platform</Text>
        <Text style={styles.subtitle}>B2B Vendor & Retailer Management</Text>
      </View>

      <Text style={styles.prompt}>I am a...</Text>

      <View style={styles.roleRow}>
        <TouchableOpacity
          style={styles.roleCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('VendorLogin')}>
          <Text style={styles.roleIcon}>🏭</Text>
          <Text style={styles.roleLabel}>Vendor</Text>
          <Text style={styles.roleDesc}>Wholesaler / Supplier</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, {borderColor: Colors.secondary}]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('RetailerRegister')}>
          <Text style={styles.roleIcon}>🏪</Text>
          <Text style={styles.roleLabel}>Retailer</Text>
          <Text style={styles.roleDesc}>Small Shop Owner</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('VendorLogin', {role: 'retailer'})} style={styles.footerButton}>
        <Text style={styles.footer}>Already registered? <Text style={{color: Colors.primary, fontWeight: '700'}}>Sign in here</Text></Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.bgPrimary,
    paddingHorizontal: Spacing.lg, justifyContent: 'center',
  },
  header: {alignItems: 'center', marginBottom: Spacing.xxl},
  logo: {fontSize: 56, marginBottom: Spacing.sm},
  title: {fontSize: Typography.xxxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1},
  subtitle: {fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 4},
  prompt: {
    fontSize: Typography.lg, fontWeight: '700', color: Colors.textSecondary,
    marginBottom: Spacing.lg, textAlign: 'center',
  },
  roleRow: {flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl},
  roleCard: {
    flex: 1, backgroundColor: Colors.bgSecondary, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', borderWidth: 2, borderColor: Colors.primary,
    ...Shadow.md,
  },
  roleIcon: {fontSize: 40, marginBottom: Spacing.sm},
  roleLabel: {fontSize: Typography.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4},
  roleDesc: {fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center'},
  footer: {fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center'},
  footerButton: {marginTop: Spacing.md, alignSelf: 'center'},
});

export default RoleSelectScreen;
