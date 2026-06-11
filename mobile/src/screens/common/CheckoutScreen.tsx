/**
 * P5-14 — Checkout Screen + P5-15 Payment (Razorpay stub)
 * Address input, coupon, order summary, Place Order CTA.
 */
import React, {useState} from 'react';
import {View, Text, ScrollView, StyleSheet, SafeAreaView, Alert} from 'react-native';
import api from '../../services/api';
import {useAppDispatch, useAppSelector} from '../../hooks/useRedux';
import {clearCart} from '../../store/slices/cartSlice';
import {Button, Input, Card} from '../../components';
import {Colors, Typography, Spacing, Radius} from '../../theme';
import {formatINR, calcCartTotals} from '../../utils/helpers';

const CheckoutScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(s => s.cart.items);
  const [address, setAddress] = useState({line1: '', city: '', state: '', pincode: ''});
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [placing, setPlacing] = useState(false);
  const {subtotal, gst, grandTotal} = calcCartTotals(cartItems);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const {data} = await api.post('/cart/apply-coupon', {code: coupon.trim()});
      setDiscount(data.discount_amount || 0);
      Alert.alert('Coupon Applied', `Discount: ${formatINR(data.discount_amount)}`);
    } catch (err: any) {
      Alert.alert('Invalid Coupon', err.response?.data?.detail || 'Could not apply coupon');
    }
  };

  const placeOrder = async () => {
    if (!address.line1 || !address.city || !address.pincode) {
      Alert.alert('Error', 'Please fill all address fields');
      return;
    }
    setPlacing(true);
    try {
      const {data} = await api.post('/orders', {
        delivery_address: address,
        coupon_code: coupon || undefined,
      });
      dispatch(clearCart());
      navigation.replace('OrderConfirmation', {order: data});
    } catch (err: any) {
      const detail = err.response?.data?.detail || '';
      // P5-19 — Credit limit block
      if (err.response?.status === 402) {
        Alert.alert('Credit Limit Exceeded', `${detail}\n\nContact your admin to increase your credit limit.`);
      } else {
        Alert.alert('Order Failed', detail || 'Please try again');
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Checkout</Text>

        {/* Delivery Address */}
        <Card>
          <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
          <Input label="Address Line" value={address.line1} onChangeText={t => setAddress(a => ({...a, line1: t}))} placeholder="Shop No., Street, Area" />
          <View style={styles.rowInputs}>
            <Input label="City" value={address.city} onChangeText={t => setAddress(a => ({...a, city: t}))} placeholder="Mumbai" style={{flex: 1}} />
            <Input label="State" value={address.state} onChangeText={t => setAddress(a => ({...a, state: t}))} placeholder="MH" style={{flex: 1}} />
          </View>
          <Input label="Pincode" value={address.pincode} onChangeText={t => setAddress(a => ({...a, pincode: t.replace(/\D/g, '').slice(0, 6)}))} keyboardType="number-pad" placeholder="400001" />
        </Card>

        {/* Coupon */}
        <Card>
          <Text style={styles.sectionTitle}>🏷️ Coupon Code</Text>
          <View style={styles.couponRow}>
            <Input label="" value={coupon} onChangeText={setCoupon} placeholder="Enter coupon code" style={{flex: 1, marginBottom: 0}} />
            <Button label="Apply" onPress={applyCoupon} fullWidth={false} size="sm" />
          </View>
        </Card>

        {/* Order Summary */}
        <Card>
          <Text style={styles.sectionTitle}>📋 Order Summary</Text>
          {cartItems.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product_name} × {item.quantity}</Text>
              <Text style={styles.itemPrice}>{formatINR(item.price_snapshot * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.itemRow}><Text style={styles.itemName}>Subtotal</Text><Text style={styles.itemPrice}>{formatINR(subtotal)}</Text></View>
          <View style={styles.itemRow}><Text style={styles.itemName}>GST</Text><Text style={styles.itemPrice}>{formatINR(gst)}</Text></View>
          {discount > 0 && <View style={styles.itemRow}><Text style={[styles.itemName, {color: Colors.secondary}]}>Discount</Text><Text style={[styles.itemPrice, {color: Colors.secondary}]}>-{formatINR(discount)}</Text></View>}
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>{formatINR(grandTotal - discount)}</Text>
          </View>
        </Card>

        {/* Payment info — Razorpay integration P5-15 */}
        <View style={styles.paymentNote}>
          <Text style={styles.paymentNoteText}>💳 Payment via Razorpay · COD available on delivery</Text>
        </View>

        <Button label="Place Order" onPress={placeOrder} loading={placing} size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgPrimary},
  content: {padding: Spacing.lg, paddingBottom: Spacing.xxl},
  title: {fontSize: Typography.xxl, fontWeight: '800', marginBottom: Spacing.lg, letterSpacing: -0.5},
  sectionTitle: {fontSize: Typography.base, fontWeight: '700', marginBottom: Spacing.md, color: Colors.textPrimary},
  rowInputs: {flexDirection: 'row', gap: Spacing.sm},
  couponRow: {flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm},
  itemRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6},
  itemName: {fontSize: Typography.sm, color: Colors.textSecondary, flex: 1},
  itemPrice: {fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary},
  divider: {height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm},
  grandLabel: {fontSize: Typography.base, fontWeight: '700'},
  grandValue: {fontSize: Typography.base, fontWeight: '800', color: Colors.primary},
  paymentNote: {backgroundColor: Colors.infoLight, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.md},
  paymentNoteText: {fontSize: Typography.sm, color: Colors.info, fontWeight: '600'},
});

export default CheckoutScreen;
