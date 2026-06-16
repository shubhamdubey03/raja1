/**
 * P5-13 — Cart Screen
 * Supply Setu premium design — product images, qty stepper, order summary, payment method.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { setCart, setMovValidation } from '../../store/slices/cartSlice';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { Button } from '../../components';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { formatINR, calcCartTotals, normalizeImageUrl } from '../../utils/helpers';
import { ShoppingCart, Trash2, Archive, AlertTriangle, ChevronRight, ArrowLeft } from 'lucide-react-native';

// ── Cart Item Card ────────────────────────────────────────────
const CartItemCard: React.FC<{
  item: any;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}> = ({ item, onUpdateQty, onRemove }) => {
  const [imgError, setImgError] = useState(false);

  // Image URL: cart item may carry product_image_url or images array
  const rawUrl = item.product_image_url ?? item.images?.[0]?.image_url ?? null;
  const imageUrl = normalizeImageUrl(rawUrl);

  const lineTotal = item.price_snapshot * item.quantity;

  return (
    <View style={styles.cartCard}>
      {/* Product image */}
      <View style={styles.productImgWrap}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImg}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.productImgPlaceholder}>
            <Archive size={22} color={Colors.primary} />
          </View>
        )}
      </View>

      {/* Product info */}
      <View style={styles.itemBody}>
        <View style={styles.itemTopRow}>
          <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
          <TouchableOpacity onPress={() => onRemove(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={styles.removeBtn}>
              <Trash2 size={13} color={Colors.error} />
              <Text style={styles.removeTxt}>REMOVE</Text>
            </View>
          </TouchableOpacity>
        </View>

        {item.product_sku ? (
          <Text style={styles.itemMeta}>{item.product_sku}</Text>
        ) : null}

        <Text style={styles.itemUnitPrice}>{formatINR(item.price_snapshot)} / unit</Text>

        {/* Qty stepper + line total */}
        <View style={styles.itemBottomRow}>
          <View style={styles.qtyControl}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => item.quantity > 1 ? onUpdateQty(item.id, item.quantity - 1) : onRemove(item.id)}>
              <Text style={styles.qtyBtnTxt}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyVal}>{String(item.quantity).padStart(2, '0')}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => onUpdateQty(item.id, item.quantity + 1)}>
              <Text style={styles.qtyBtnTxt}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.lineTotal}>{formatINR(lineTotal)}</Text>
        </View>
      </View>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────
const CartScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(s => s.cart.items);
  const { movValid, shortfallAmount } = useAppSelector(s => s.cart);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payMethod, setPayMethod] = useState<'pay_now' | 'setu_credit'>('pay_now');

  const loadCart = useCallback(async () => {
    try {
      const [cartRes, movRes] = await Promise.all([
        api.get('/cart'),
        api.get('/cart/validate'),
      ]);
      const items = (cartRes.data.items || []).filter((i: any) => !i.is_deleted);
      dispatch(setCart(items));
      dispatch(setMovValidation({
        valid: movRes.data.valid,
        shortfall_amount: movRes.data.shortfall_amount || 0,
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useFocusEffect(useCallback(() => { loadCart(); }, [loadCart]));

  const updateQty = async (itemId: string, qty: number) => {
    try {
      await api.patch(`/cart/items/${itemId}`, { quantity: qty });
      loadCart();
    } catch { Alert.alert('Error', 'Could not update quantity'); }
  };

  const removeItem = async (itemId: string) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      loadCart();
    } catch { Alert.alert('Error', 'Could not remove item'); }
  };

  const { subtotal, gst, grandTotal } = calcCartTotals(cartItems);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeftContainer}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}>
              <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Supply Setu</Text>
        </View>
        <ShoppingCart size={24} color={Colors.textPrimary} />
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={i => i.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadCart(); }}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* Vendor label */}
            {cartItems.length > 0 && (
              <View style={styles.vendorRow}>
                <Text style={styles.vendorMeta}>ACTIVE VENDOR</Text>
                <Text style={styles.vendorName}>Your Supply Partner</Text>
              </View>
            )}

            {/* MOV Warning Banner */}
            {!movValid && shortfallAmount > 0 && (
              <View style={styles.movBanner}>
                <AlertTriangle size={16} color={Colors.warning} />
                <Text style={styles.movText}>
                  {'Low Credit Limit\n'}
                  <Text style={styles.movSub}>
                    Add {formatINR(shortfallAmount)} more to meet minimum order value.
                  </Text>
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <ShoppingCart size={48} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySub}>Browse products to add items</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CartItemCard item={item} onUpdateQty={updateQty} onRemove={removeItem} />
        )}
        ListFooterComponent={cartItems.length > 0 ? (
          <>
            {/* ── Order Summary ── */}
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryVal}>{formatINR(subtotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>GST (18%)</Text>
                  <Text style={styles.summaryVal}>{formatINR(gst)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping</Text>
                  <Text style={[styles.summaryVal, { color: Colors.success }]}>FREE</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalVal}>{formatINR(grandTotal)}</Text>
                </View>
              </View>
            </View>

            {/* ── Payment Method ── */}
            <View style={styles.paySection}>
              <Text style={styles.summaryTitle}>Payment Method</Text>

              <TouchableOpacity
                style={[styles.payOption, payMethod === 'pay_now' && styles.payOptionActive]}
                onPress={() => setPayMethod('pay_now')}>
                <View style={[styles.payRadio, payMethod === 'pay_now' && styles.payRadioActive]}>
                  {payMethod === 'pay_now' && <View style={styles.payRadioDot} />}
                </View>
                <View style={styles.payInfo}>
                  <Text style={styles.payLabel}>Pay Now</Text>
                  <Text style={styles.payDesc}>Immediate bank settlement</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payOption, payMethod === 'setu_credit' && styles.payOptionActive]}
                onPress={() => setPayMethod('setu_credit')}>
                <View style={[styles.payRadio, payMethod === 'setu_credit' && styles.payRadioActive]}>
                  {payMethod === 'setu_credit' && <View style={styles.payRadioDot} />}
                </View>
                <View style={styles.payInfo}>
                  <View style={styles.payLabelRow}>
                    <Text style={styles.payLabel}>Setu Credit (30 days)</Text>
                    <View style={styles.premiumTag}>
                      <Text style={styles.premiumTagTxt}>PREMIUM</Text>
                    </View>
                  </View>
                  <Text style={styles.payDesc}>Interest-free B2B financing</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ── Place Order CTA ── */}
            <View style={styles.placeOrderWrap}>
              <Button
                label="Place Supply Order →"
                onPress={() => navigation.navigate('Checkout')}
                disabled={!movValid}
              />
              {!movValid && (
                <Text style={styles.movHint}>
                  Add {formatINR(shortfallAmount)} more to place order
                </Text>
              )}
              <Text style={styles.termsText}>
                By placing this order, you agree to the Terms of Service.
              </Text>
            </View>

            {/* ── Assistance ── */}
            <View style={styles.assistCard}>
              <View style={styles.assistIcon}>
                <Text style={styles.assistIconTxt}>💬</Text>
              </View>
              <View>
                <Text style={styles.assistTitle}>Need assistance?</Text>
                <Text style={styles.assistSub}>Contact your dedicated supply manager</Text>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
            </View>

            <View style={{ height: 32 }} />
          </>
        ) : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1EC' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: Typography.body, color: Colors.textMuted },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    backgroundColor: '#F5F1EC',
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  backBtn: {
    marginRight: Spacing.xs,
    paddingVertical: 4,
    paddingRight: 4,
  },
  headerTitle: {
    fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3,
  },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },

  // Vendor
  vendorRow: { marginBottom: Spacing.md },
  vendorMeta: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', letterSpacing: 1 },
  vendorName: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  // MOV banner
  movBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF9E0', borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderLeftWidth: 4, borderLeftColor: Colors.warning,
  },
  movText: { flex: 1, fontSize: Typography.caption, color: Colors.textPrimary, fontWeight: '700' },
  movSub: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: '400' },

  // Cart item card
  cartCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  productImgWrap: {
    width: 80, height: 80,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight,
  },
  productImg: { width: '100%', height: '100%' },
  productImgPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  itemBody: { flex: 1 },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  itemName: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 19, marginRight: 8 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2 },
  removeTxt: { fontSize: 10, color: Colors.error, fontWeight: '800', letterSpacing: 0.3 },
  itemMeta: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  itemUnitPrice: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.xs },
  itemBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 6,
    backgroundColor: Colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  qtyBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  qtyVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, minWidth: 28, textAlign: 'center' },
  lineTotal: { fontSize: 15, fontWeight: '800', color: Colors.primary },

  // Summary
  summarySection: { marginTop: Spacing.lg, marginBottom: Spacing.md },
  summaryTitle: { fontSize: Typography.body, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  summaryCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: Typography.caption, color: Colors.textSecondary },
  summaryVal: { fontSize: Typography.caption, fontWeight: '600', color: Colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 10 },
  totalLabel: { fontSize: Typography.body, fontWeight: '700', color: Colors.textPrimary },
  totalVal: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },

  // Payment
  paySection: { marginBottom: Spacing.md },
  payOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  payOptionActive: { borderColor: Colors.primary },
  payRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  payRadioActive: { borderColor: Colors.primary },
  payRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  payInfo: { flex: 1 },
  payLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  payLabel: { fontSize: Typography.caption, fontWeight: '700', color: Colors.textPrimary },
  payDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  premiumTag: {
    backgroundColor: Colors.primary, paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4,
  },
  premiumTagTxt: { fontSize: 8, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },

  // Place order
  placeOrderWrap: { marginBottom: Spacing.md },
  movHint: {
    fontSize: Typography.caption, color: Colors.error,
    textAlign: 'center', marginTop: 6, fontWeight: '600',
  },
  termsText: {
    fontSize: 10, color: Colors.textMuted,
    textAlign: 'center', marginTop: 8, lineHeight: 14,
  },

  // Assistance
  assistCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  assistIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  assistIconTxt: { fontSize: 18 },
  assistTitle: { fontSize: Typography.caption, fontWeight: '700', color: Colors.textPrimary },
  assistSub: { fontSize: 11, color: Colors.textMuted },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg, ...Shadow.sm,
  },
  emptyTitle: { fontSize: Typography.subheading, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  emptySub: { fontSize: Typography.caption, color: Colors.textMuted },
});

export default CartScreen;
