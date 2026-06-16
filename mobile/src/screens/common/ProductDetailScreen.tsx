/**
 * P5-11 — Product Detail Screen
 * Hero image gallery, role-based price, stock status, qty selector, Add to Cart.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { Button } from '../../components';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { formatINR, normalizeImageUrl } from '../../utils/helpers';
import { ArrowLeft, ShoppingCart, Archive, ChevronRight } from 'lucide-react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const ProductDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { product } = route.params;
  const [qty, setQty] = useState(1);
  const [addingCart, setAddingCart] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  // Collect all images
  const images: string[] = (product.images || [])
    .map((img: any) => normalizeImageUrl(img.image_url))
    .filter(Boolean);
  if (product.image_url && images.length === 0) {
    const n = normalizeImageUrl(product.image_url);
    if (n) images.push(n);
  }

  const isOutOfStock = product.stock_qty <= 0;
  const isLowStock = !isOutOfStock && product.stock_qty <= product.low_stock_threshold;

  const statusColor = isOutOfStock ? Colors.error : isLowStock ? Colors.warning : Colors.success;
  const statusBg = isOutOfStock ? Colors.errorLight : isLowStock ? Colors.warningLight : Colors.successLight;
  const statusLabel = isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK';

  const gstAmount = Math.round(product.base_price * qty * product.gst_rate / 100);
  const totalIncGST = product.base_price * qty + gstAmount;

  const handleAddCart = async () => {
    if (isOutOfStock) return;
    setAddingCart(true);
    try {
      await api.post('/cart/add', { product_id: product.id, quantity: qty });
      Alert.alert('Added to Cart', `${product.name} × ${qty} added`, [
        { text: 'Continue Shopping' },
        { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not add to cart');
    } finally {
      setAddingCart(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero Image ── */}
        <View style={styles.heroWrap}>
          {images.length > 0 && !imgError ? (
            <Image
              source={{ uri: images[activeImg] }}
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Archive size={64} color={Colors.primary} />
            </View>
          )}

          {/* Status pill */}
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* ── Thumbnail Row ── */}
        {images.length > 1 && (
          <View style={styles.thumbRow}>
            {images.map((uri, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => { setActiveImg(idx); setImgError(false); }}
                style={[styles.thumb, activeImg === idx && styles.thumbActive]}>
                <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Info Section ── */}
        <View style={styles.infoSection}>

          {/* Name + SKU */}
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.sku}>SKU: {product.sku}</Text>

          {/* Price card */}
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>Base Price</Text>
              <Text style={styles.price}>{formatINR(product.base_price)}</Text>
            </View>
            <View style={styles.gstPill}>
              <Text style={styles.gstText}>+{product.gst_rate}% GST</Text>
            </View>
          </View>

          {/* Description */}
          {product.description ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          ) : null}

          {/* Return Policy */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Return Policy</Text>
            </View>
            <Text style={styles.desc}>{product.return_policy || 'No returns allowed'}</Text>
          </View>

          {/* Quantity Selector */}
          <View style={styles.qtySection}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQty(Math.max(1, qty - 1))}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQty(Math.min(Math.max(1, product.stock_qty), qty + 1))}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({qty} {product.unit})</Text>
              <Text style={styles.summaryValue}>{formatINR(product.base_price * qty)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST ({product.gst_rate}%)</Text>
              <Text style={styles.summaryValue}>{formatINR(gstAmount)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total incl. GST</Text>
              <Text style={styles.totalValue}>{formatINR(totalIncGST)}</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View style={styles.bottomBar}>
        <Button
          label={isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          onPress={handleAddCart}
          loading={addingCart}
          disabled={isOutOfStock}
          icon={!isOutOfStock ? <ShoppingCart size={18} color={Colors.white} /> : undefined}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgPrimary,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  headerTitle: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  content: { paddingBottom: 20 },

  // Hero image
  heroWrap: {
    width: SCREEN_W,
    height: SCREEN_W * 0.85,
    backgroundColor: Colors.primaryLight,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  statusPill: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Thumbnails
  thumbRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  thumb: {
    width: 60, height: 60, borderRadius: Radius.sm,
    borderWidth: 2, borderColor: Colors.border,
    overflow: 'hidden',
  },
  thumbActive: { borderColor: Colors.primary, borderWidth: 2.5 },
  thumbImg: { width: '100%', height: '100%' },

  // Info
  infoSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  productName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sku: { fontSize: Typography.caption, color: Colors.textMuted, marginBottom: Spacing.lg },

  priceCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  priceLabel: { fontSize: Typography.caption, color: Colors.textMuted, marginBottom: 2 },
  price: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  gstPill: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  gstText: { fontSize: Typography.caption, color: Colors.warning, fontWeight: '700' },

  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.xs,
  },
  sectionTitle: { fontSize: Typography.body, fontWeight: '700', color: Colors.textPrimary },
  desc: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 22 },

  // Qty
  qtySection: { marginBottom: Spacing.lg },
  qtyLabel: { fontSize: Typography.body, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  qtyBtn: {
    width: 44, height: 44, borderRadius: Radius.sm,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  qtyBtnText: { fontSize: 22, fontWeight: '400', color: Colors.textPrimary, lineHeight: 26 },
  qtyValue: {
    fontSize: 22, fontWeight: '800',
    color: Colors.textPrimary, minWidth: 40, textAlign: 'center',
  },

  // Summary
  summaryCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: Typography.caption, color: Colors.textSecondary },
  summaryValue: { fontSize: Typography.caption, fontWeight: '600', color: Colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 10 },
  totalLabel: { fontSize: Typography.body, fontWeight: '700', color: Colors.textPrimary },
  totalValue: { fontSize: Typography.body, fontWeight: '800', color: Colors.primary },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1, borderTopColor: Colors.border,
    ...Shadow.md,
  },
});

export default ProductDetailScreen;
