/**
 * P5-13 — Cart Screen
 * Cart items, qty stepper, MOV validation banner, price summary, checkout CTA.
 * P5-19 — Credit Limit Warning banner included.
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, RefreshControl,
} from 'react-native';
import api from '../../services/api';
import {setCart, setMovValidation} from '../../store/slices/cartSlice';
import {useAppDispatch, useAppSelector} from '../../hooks/useRedux';
import {Button, EmptyState} from '../../components';
import {Colors, Typography, Spacing, Radius, Shadow} from '../../theme';
import {formatINR, calcCartTotals} from '../../utils/helpers';

const CartScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(s => s.cart.items);
  const {movValid, shortfallAmount} = useAppSelector(s => s.cart);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCart = useCallback(async () => {
    try {
      const [cartRes, movRes] = await Promise.all([
        api.get('/cart'),
        api.get('/cart/validate'),
      ]);
      const items = (cartRes.data.items || []).filter((i: any) => !i.is_deleted);
      dispatch(setCart(items));
      dispatch(setMovValidation({valid: movRes.data.valid, shortfall_amount: movRes.data.shortfall_amount || 0}));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [dispatch]);

  useEffect(() => { loadCart(); }, [loadCart]);

  const updateQty = async (itemId: string, qty: number) => {
    try {
      await api.patch(`/cart/items/${itemId}`, {quantity: qty});
      loadCart();
    } catch (e) { Alert.alert('Error', 'Could not update quantity'); }
  };

  const removeItem = async (itemId: string) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      loadCart();
    } catch (e) { Alert.alert('Error', 'Could not remove item'); }
  };

  const {subtotal, gst, grandTotal} = calcCartTotals(cartItems);

  if (loading) return <SafeAreaView style={styles.container}><EmptyState title="Loading cart..." icon="⏳" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      {/* MOV Warning Banner */}
      {!movValid && shortfallAmount > 0 && (
        <View style={styles.movBanner}>
          <Text style={styles.movText}>
            ⚠️ Minimum order value not met · Add {formatINR(shortfallAmount)} more
          </Text>
        </View>
      )}

      <FlatList
        data={cartItems}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCart(); }} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="Your cart is empty" subtitle="Browse products to add items" icon="🛒" />
        }
        renderItem={({item}) => (
          <View style={styles.cartItem}>
            <View style={styles.itemIconWrap}><Text style={styles.itemIcon}>📦</Text></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
              <Text style={styles.itemPrice}>{formatINR(item.price_snapshot)} / unit</Text>
            </View>
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => item.quantity > 1 ? updateQty(item.id, item.quantity - 1) : removeItem(item.id)}>
                <Text style={styles.qtyBtnTxt}>{item.quantity > 1 ? '−' : '🗑'}</Text>
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{item.quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, item.quantity + 1)}>
                <Text style={styles.qtyBtnTxt}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={cartItems.length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.row}><Text style={styles.rowLabel}>Subtotal</Text><Text style={styles.rowVal}>{formatINR(subtotal)}</Text></View>
            <View style={styles.row}><Text style={styles.rowLabel}>GST</Text><Text style={styles.rowVal}>{formatINR(gst)}</Text></View>
            <View style={[styles.row, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalVal}>{formatINR(grandTotal)}</Text>
            </View>
          </View>
        ) : null}
      />

      {cartItems.length > 0 && (
        <View style={styles.checkoutBar}>
          <View style={styles.checkoutTotalWrap}>
            <Text style={styles.checkoutTotalLabel}>Total</Text>
            <Text style={styles.checkoutTotalVal}>{formatINR(grandTotal)}</Text>
          </View>
          <Button
            label={movValid ? 'Proceed to Checkout' : 'MOV Not Met'}
            onPress={() => navigation.navigate('Checkout')}
            disabled={!movValid}
            fullWidth={false}
            size="md"
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgPrimary},
  movBanner: {backgroundColor: Colors.warning, padding: Spacing.sm, paddingHorizontal: Spacing.lg},
  movText: {color: Colors.white, fontWeight: '700', fontSize: Typography.sm},
  list: {padding: Spacing.lg, gap: Spacing.sm},
  cartItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  itemIconWrap: {width: 40, height: 40, backgroundColor: Colors.primaryLight, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center'},
  itemIcon: {fontSize: 20},
  itemInfo: {flex: 1},
  itemName: {fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2},
  itemPrice: {fontSize: Typography.xs, color: Colors.textMuted},
  qtyControl: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  qtyBtn: {width: 28, height: 28, borderRadius: 6, backgroundColor: Colors.bgTertiary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border},
  qtyBtnTxt: {fontSize: 13, fontWeight: '700', color: Colors.textPrimary},
  qtyVal: {fontSize: Typography.base, fontWeight: '800', minWidth: 24, textAlign: 'center'},
  summaryCard: {backgroundColor: Colors.bgSecondary, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border},
  summaryTitle: {fontSize: Typography.base, fontWeight: '700', marginBottom: Spacing.md},
  row: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6},
  rowLabel: {fontSize: Typography.sm, color: Colors.textSecondary},
  rowVal: {fontSize: Typography.sm, fontWeight: '600'},
  totalRow: {borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 10},
  totalLabel: {fontSize: Typography.base, fontWeight: '700'},
  totalVal: {fontSize: Typography.base, fontWeight: '800', color: Colors.primary},
  checkoutBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, backgroundColor: Colors.bgSecondary,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  checkoutTotalWrap: {flexDirection: 'column'},
  checkoutTotalLabel: {fontSize: Typography.xs, color: Colors.textMuted},
  checkoutTotalVal: {fontSize: Typography.lg, fontWeight: '800', color: Colors.textPrimary},
});

export default CartScreen;
