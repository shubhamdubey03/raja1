/**
 * Figma PDF Page 22 — Offline Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { WifiOff, RefreshCw, Info } from 'lucide-react-native';

interface Props {
  onRetry?: () => void;
}

const OfflineScreen: React.FC<Props> = ({ onRetry }) => {
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    const state = await NetInfo.fetch();
    setChecking(false);
    if (state.isConnected) {
      onRetry?.();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <WifiOff size={44} color={Colors.primary} />
          </View>
          <Text style={styles.brand}>Supply Setu</Text>
          <Text style={styles.title}>You're offline</Text>
          <Text style={styles.subtitle}>
            It seems your connection to the global supply grid has been interrupted.
          </Text>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusText}>A W A I T I N G   C O N N E C T I O N</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.btnPrimary} 
            onPress={handleRetry} 
            disabled={checking}
            activeOpacity={0.85}>
            {checking ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <RefreshCw size={18} color={Colors.white} />
                <Text style={styles.btnTextPrimary}>Retry Connection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.85}>
            <Info size={18} color={Colors.primary} />
            <Text style={styles.btnTextSecondary}>Check Network Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoWrap: {
    width: 80,
    height: 80,
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
    paddingHorizontal: Spacing.md,
  },
  statusBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.bgCard,
    marginBottom: Spacing.xxxl,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    width: '100%',
    height: 48,
    ...Shadow.md,
  },
  btnSecondary: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    width: '100%',
    height: 48,
  },
  btnTextPrimary: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.body - 1,
  },
  btnTextSecondary: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: Typography.body - 1,
  },
});

export default OfflineScreen;

