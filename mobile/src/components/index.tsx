/**
 * Reusable UI components — Buttons, Cards, Input, Badge, Skeleton, OfflineBanner
 */
import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  View, TextInput, TextInputProps, Animated,
} from 'react-native';
import {Colors, Typography, Spacing, Radius, Shadow} from '../theme';

// ── PrimaryButton ────────────────────────────────────────────
interface BtnProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<BtnProps> = ({
  label, onPress, loading = false, disabled = false,
  variant = 'primary', fullWidth = true, size = 'md',
}) => {
  const bg = {
    primary: Colors.primary,
    secondary: Colors.bgTertiary,
    danger: Colors.dangerLight,
    ghost: 'transparent',
  }[variant];

  const color = {
    primary: Colors.white,
    secondary: Colors.textPrimary,
    danger: Colors.danger,
    ghost: Colors.primary,
  }[variant];

  const paddingV = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const fontSize = size === 'sm' ? Typography.sm : Typography.base;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        {backgroundColor: bg, paddingVertical: paddingV},
        fullWidth && {width: '100%'},
        (disabled || loading) && {opacity: 0.6},
      ]}>
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <Text style={[styles.btnText, {color, fontSize}]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

// ── Card ─────────────────────────────────────────────────────
export const Card: React.FC<{children: React.ReactNode; style?: any}> = ({children, style}) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({label, error, ...props}) => (
  <View style={styles.inputWrap}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={[styles.input, error ? {borderColor: Colors.danger} : {}]}
      placeholderTextColor={Colors.textMuted}
      {...props}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// ── Badge ─────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'primary';
export const Badge: React.FC<{label: string; variant?: BadgeVariant}> = ({label, variant = 'primary'}) => {
  const bg = {
    success: Colors.secondaryLight, warning: Colors.warningLight,
    danger: Colors.dangerLight, info: Colors.infoLight, primary: Colors.primaryLight,
  }[variant];
  const color = {
    success: Colors.secondary, warning: Colors.warning,
    danger: Colors.danger, info: Colors.info, primary: Colors.primary,
  }[variant];

  return (
    <View style={[styles.badge, {backgroundColor: bg}]}>
      <Text style={[styles.badgeText, {color}]}>{label.toUpperCase()}</Text>
    </View>
  );
};

// ── SkeletonLoader ─────────────────────────────────────────────
export const Skeleton: React.FC<{width?: number | string; height?: number; radius?: number}> = ({
  width = '100%', height = 16, radius = Radius.sm,
}) => (
  <View style={{width: width as any, height, backgroundColor: Colors.bgTertiary, borderRadius: radius, marginVertical: 4}} />
);

// ── Section Header ────────────────────────────────────────────
export const SectionHeader: React.FC<{title: string; action?: React.ReactNode}> = ({title, action}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action}
  </View>
);

// ── Offline Banner — P5-23 ────────────────────────────────────
export const OfflineBanner: React.FC = () => (
  <View style={styles.offlineBanner}>
    <Text style={styles.offlineText}>⚠️  No internet connection — data may be outdated</Text>
  </View>
);

// ── Empty State ───────────────────────────────────────────────
export const EmptyState: React.FC<{title: string; subtitle?: string; icon?: string}> = ({title, subtitle, icon = '📭'}) => (
  <View style={styles.emptyWrap}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
  </View>
);

// ── Product Card ──────────────────────────────────────────────
export const ProductCard: React.FC<{
  name: string; price: number; stockQty: number; threshold: number;
  onPress: () => void;
}> = ({name, price, stockQty, threshold, onPress}) => {
  const status = stockQty <= 0 ? 'Out of Stock' : stockQty <= threshold ? 'Low Stock' : 'In Stock';
  const statusVariant: BadgeVariant = stockQty <= 0 ? 'danger' : stockQty <= threshold ? 'warning' : 'success';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.productCard}>
      <View style={styles.productIconWrap}>
        <Text style={styles.productIcon}>📦</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{name}</Text>
        <Text style={styles.productPrice}>INR {(price / 100).toFixed(2)}</Text>
      </View>
      <Badge label={status} variant={statusVariant} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  btnText: {fontWeight: '700', letterSpacing: 0.2},
  card: {
    backgroundColor: Colors.bgSecondary, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  inputWrap: {marginBottom: Spacing.md},
  label: {fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6},
  input: {
    backgroundColor: Colors.bgPrimary, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: Typography.base, color: Colors.textPrimary,
  },
  errorText: {fontSize: Typography.xs, color: Colors.danger, marginTop: 4},
  badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start'},
  badgeText: {fontSize: 10, fontWeight: '700', letterSpacing: 0.5},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm, marginTop: Spacing.md},
  sectionTitle: {fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary},
  offlineBanner: {backgroundColor: Colors.warning, padding: Spacing.sm, alignItems: 'center'},
  offlineText: {color: Colors.white, fontSize: Typography.sm, fontWeight: '600'},
  emptyWrap: {alignItems: 'center', padding: Spacing.xxl},
  emptyIcon: {fontSize: 48, marginBottom: Spacing.md},
  emptyTitle: {fontSize: Typography.md, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4},
  emptySubtitle: {fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center'},
  productCard: {
    backgroundColor: Colors.bgSecondary, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row',
    alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  productIconWrap: {
    width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  productIcon: {fontSize: 22},
  productInfo: {flex: 1},
  productName: {fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4},
  productPrice: {fontSize: Typography.sm, color: Colors.primary, fontWeight: '600'},
});
