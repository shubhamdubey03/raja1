/**
 * Reusable UI components — Buttons, Cards, Input, Badge, Skeleton, OfflineBanner, EmptyState, ProductCard
 */
import React, { useState } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  View, TextInput, TextInputProps, ViewStyle, Image,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { BoxSelect, Archive } from 'lucide-react-native';

// ── PrimaryButton ────────────────────────────────────────────
interface BtnProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: any;
  icon?: React.ReactNode;
}

export const Button: React.FC<BtnProps> = ({
  label, onPress, loading = false, disabled = false,
  variant = 'primary', fullWidth = true, size = 'md', style, icon
}) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';

  const bg = isPrimary ? Colors.primary : isDanger ? Colors.error : 'transparent';
  const color = isPrimary || isDanger ? Colors.white : Colors.primary;
  const borderColor = isSecondary ? Colors.border : 'transparent';
  const borderWidth = isSecondary ? 1 : 0;
  const paddingV = Math.max(12, size === 'sm' ? 8 : size === 'lg' ? 16 : 12);
  const minHeight = 48;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor, borderWidth, paddingVertical: paddingV, minHeight },
        fullWidth && { width: '100%' },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <View style={styles.btnContent}>
          {icon && <View style={{ marginRight: Spacing.xs }}>{icon}</View>}
          <Text style={[styles.btnText, { color, fontSize: Typography.body }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Card ─────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({ label, error, containerStyle, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={[styles.inputWrap, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          isFocused && { borderColor: Colors.borderFocused },
          error && { borderColor: Colors.error },
        ]}
        placeholderTextColor={Colors.textMuted}
        onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// ── Badge ─────────────────────────────────────────────────────
export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'primary';
export const Badge: React.FC<{ label: string; variant?: BadgeVariant }> = ({ label, variant = 'primary' }) => {
  const bg = {
    success: Colors.successLight, warning: Colors.warningLight,
    error: Colors.errorLight, info: Colors.infoLight, primary: Colors.primaryLight,
  }[variant];
  const color = {
    success: Colors.success, warning: Colors.warning,
    error: Colors.error, info: Colors.info, primary: Colors.primary,
  }[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
};

// ── Skeleton ─────────────────────────────────────────────────
export const Skeleton: React.FC<{ width?: number | string; height?: number; radius?: number }> = ({
  width = '100%', height = 16, radius = Radius.sm,
}) => (
  <View style={{ width: width as any, height, backgroundColor: Colors.border, borderRadius: radius, marginVertical: Spacing.xxs }} />
);

// ── Section Header ────────────────────────────────────────────
export const SectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action}
  </View>
);

// ── Offline Banner ────────────────────────────────────────────
export const OfflineBanner: React.FC = () => (
  <View style={styles.offlineBanner}>
    <Text style={styles.offlineText}>⚠️  No internet connection — data may be outdated</Text>
  </View>
);

// ── Empty State ───────────────────────────────────────────────
export const EmptyState: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, subtitle, icon, actionLabel, onAction }) => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIconWrap}>
      {icon ? (
        typeof icon === 'string' ? (
          <Text style={{ fontSize: 32 }}>{icon}</Text>
        ) : (
          icon
        )
      ) : (
        <BoxSelect size={48} color={Colors.textMuted} />
      )}
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {actionLabel && onAction && (
      <Button label={actionLabel} onPress={onAction} size="sm" style={{ marginTop: Spacing.xl }} />
    )}
  </View>
);

// ── Product Card ──────────────────────────────────────────────
// Premium card used in both the vendor inventory grid and the retailer product list.
export const ProductCard: React.FC<{
  name: string;
  price: number;
  stockQty: number;
  threshold: number;
  imageUrl?: string | null;
  unit?: string;
  onPress: () => void;
}> = ({ name, price, stockQty, threshold, imageUrl, unit = 'piece', onPress }) => {
  const [imgError, setImgError] = useState(false);

  const isOutOfStock = stockQty <= 0;
  const isLowStock = !isOutOfStock && stockQty <= threshold;
  
  // Status tag configuration matching user screenshot exactly
  const dotColor = isOutOfStock ? '#D9743E' : '#2D8A4E';
  const statusColor = isOutOfStock ? '#92400E' : '#065F46';
  const statusBg = isOutOfStock ? '#FEF3C7' : '#D1FAE5';
  const statusLabel = isOutOfStock ? 'SOLD OUT' : 'IN STOCK';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.productCard}>
      {/* ── Image ── */}
      <View style={styles.productImageWrap}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Archive size={28} color={Colors.primary} />
          </View>
        )}
        {/* Status pill overlaid on image */}
        <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
          <Text style={[styles.statusTagText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* ── Info ── */}
      <View style={styles.productInfo}>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.productName} numberOfLines={2}>{name}</Text>
          <Text style={styles.productUnitText}>Pack: {unit}</Text>
          <Text style={styles.productPriceText}>₹{(price / 100).toFixed(2)}</Text>
          <Text style={[styles.stockText, { color: isOutOfStock ? '#DC2626' : '#059669' }]}>
            {isOutOfStock ? 'Unavailable' : `${stockQty} units left`}
          </Text>
        </View>
        
        {/* Full-width button at bottom of card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          style={[
            styles.fullWidthViewBtn,
            isOutOfStock
              ? { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#5C5A1E' }
              : { backgroundColor: '#5C5A1E' }
          ]}
        >
          <Text style={[styles.fullWidthViewBtnText, { color: isOutOfStock ? '#5C5A1E' : '#FFFFFF' }]}>
            View
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Button
  btn: {
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // Card
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },

  // Input
  inputWrap: { marginBottom: Spacing.md },
  label: {
    fontSize: Typography.label,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: Typography.body,
    color: Colors.textPrimary,
    minHeight: 48,
  },
  errorText: {
    fontSize: Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xxs,
  },

  // Badge
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.lg,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: Typography.label,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.subheading,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Offline
  offlineBanner: {
    backgroundColor: Colors.warning,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  offlineText: {
    color: Colors.white,
    fontSize: Typography.caption,
    fontWeight: '500',
  },

  // Empty State
  emptyWrap: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    justifyContent: 'center',
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.subheading,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Product Card
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '48.5%', // Ensure consistent sizing in 2-column grid
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FAF7F2',
    marginBottom: 12,
    shadowColor: '#725B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  productImageWrap: {
    width: '100%',
    aspectRatio: 1.1,
    backgroundColor: '#FAF7F2',
    position: 'relative',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F4EF',
  },
  statusTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.5,
    elevation: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  productInfo: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
    minHeight: 36, // Ensure name fits in exactly two lines nicely
    marginBottom: 2,
  },
  productUnitText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  productPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  fullWidthViewBtn: {
    width: '100%',
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  fullWidthViewBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
