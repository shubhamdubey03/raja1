/**
 * P5-11 — Product Detail Screen
 * Image, name, role-based price, stock status, quantity selector, Add to Cart.
 */
import React, {useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import api from '../../services/api';
import {Badge, Button} from '../../components';
import {Colors, Typography, Spacing, Radius, Shadow} from '../../theme';
import {formatINR} from '../../utils/helpers';

const ProductDetailScreen: React.FC<{navigation: any; route: any}> = ({navigation, route}) => {
  const {product} = route.params;
  const [qty, setQty] = useState(1);
  const [addingCart, setAddingCart] = useState(false);

  const stockStatus = product.stock_qty <= 0 ? 'out_of_stock'
    : product.stock_qty <= product.low_stock_threshold ? 'low_stock' : 'in_stock';
  const stockLabel = {out_of_stock: 'Out of Stock', low_stock: 'Low Stock', in_stock: 'In Stock'}[stockStatus];
  const stockVariant = {out_of_stock: 'danger', low_stock: 'warning', in_stock: 'success'}[stockStatus] as any;
  const gstAmount = Math.round(product.base_price * qty * product.gst_rate / 100);
  const totalIncGST = product.base_price * qty + gstAmount;

  const handleAddCart = async () => {
    if (stockStatus === 'out_of_stock') return;
    setAddingCart(true);
    try {
      await api.post('/cart/add', {product_id: product.id, quantity: qty});
      Alert.alert('Added to Cart', `${product.name} × ${qty} added`, [
        {text: 'Continue Shopping'},
        {text: 'View Cart', onPress: () => navigation.navigate('Cart')},
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not add to cart');
    } finally {
      setAddingCart(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Product image placeholder */}
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageEmoji}>📦</Text>
          <Badge label={stockLabel} variant={stockVariant} />
        </View>

        {/* Product info */}
        <View style={styles.infoSection}>
          <Text style={styles.category}>{product.category_id}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.sku}>SKU: {product.sku}</Text>

          {/* Price block */}
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>Base Price</Text>
              <Text style={styles.price}>{formatINR(product.base_price)}</Text>
            </View>
            <View style={styles.gstBadge}>
              <Text style={styles.gstText}>+{product.gst_rate}% GST</Text>
            </View>
          </View>

          {product.description ? (
            <View style={styles.descSection}>
              <Text style={styles.descLabel}>Description</Text>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          ) : null}

          {/* Quantity Selector */}
          <View style={styles.qtySection}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQty(Math.min(product.stock_qty, qty + 1))}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({qty} units)</Text>
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
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <Button
          label={stockStatus === 'out_of_stock' ? 'Out of Stock' : 'Add to Cart'}
          onPress={handleAddCart}
          loading={addingCart}
          disabled={stockStatus === 'out_of_stock'}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgPrimary},
  content: {paddingBottom: 100},
  imagePlaceholder: {
    height: 240, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
  },
  imageEmoji: {fontSize: 72},
  infoSection: {padding: Spacing.lg},
  category: {fontSize: Typography.xs, color: Colors.primary, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4},
  name: {fontSize: Typography.xxl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4, letterSpacing: -0.5},
  sku: {fontSize: Typography.xs, color: Colors.textMuted, marginBottom: Spacing.lg},
  priceCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgSecondary, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, ...Shadow.sm,
  },
  priceLabel: {fontSize: Typography.xs, color: Colors.textMuted, fontWeight: '600', marginBottom: 2},
  price: {fontSize: Typography.xxl, fontWeight: '800', color: Colors.primary},
  gstBadge: {backgroundColor: Colors.warningLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm},
  gstText: {fontSize: Typography.xs, color: Colors.warning, fontWeight: '700'},
  descSection: {marginBottom: Spacing.lg},
  descLabel: {fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4},
  desc: {fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20},
  qtySection: {marginBottom: Spacing.lg},
  qtyLabel: {fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm},
  qtyRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.lg},
  qtyBtn: {
    width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: Colors.bgSecondary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  qtyBtnText: {fontSize: Typography.xl, fontWeight: '600', color: Colors.textPrimary},
  qtyValue: {fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, minWidth: 40, textAlign: 'center'},
  summaryCard: {backgroundColor: Colors.bgSecondary, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border},
  summaryRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6},
  summaryLabel: {fontSize: Typography.sm, color: Colors.textSecondary},
  summaryValue: {fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary},
  totalRow: {borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 10},
  totalLabel: {fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary},
  totalValue: {fontSize: Typography.base, fontWeight: '800', color: Colors.primary},
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg,
    backgroundColor: Colors.bgSecondary, borderTopWidth: 1, borderTopColor: Colors.border,
  },
});

export default ProductDetailScreen;
