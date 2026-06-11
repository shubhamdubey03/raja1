/**
 * P5-16 — Order Confirmation + Order History
 */
import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView} from 'react-native';
import api from '../../services/api';
import {Badge, EmptyState} from '../../components';
import {Colors, Typography, Spacing, Radius, Shadow} from '../../theme';
import {formatINR} from '../../utils/helpers';

// ── Order Confirmation ─────────────────────────────────────────
export const OrderConfirmationScreen: React.FC<{navigation: any; route: any}> = ({navigation, route}) => {
  const {order} = route.params;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.successWrap}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Order Placed!</Text>
        <Text style={styles.orderId}>#{order.order_number}</Text>
        <Text style={styles.successMsg}>Your order has been received and is being processed.</Text>

        <View style={styles.summaryCard}>
          <View style={styles.sRow}><Text style={styles.sLabel}>Subtotal</Text><Text style={styles.sVal}>{formatINR(order.subtotal)}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>GST</Text><Text style={styles.sVal}>{formatINR(order.gst_amount)}</Text></View>
          <View style={[styles.sRow, {borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4}]}>
            <Text style={[styles.sLabel, {fontWeight: '700', fontSize: Typography.base}]}>Grand Total</Text>
            <Text style={[styles.sVal, {color: Colors.primary, fontSize: Typography.base, fontWeight: '800'}]}>{formatINR(order.grand_total)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Orders')}>
          <Text style={styles.primaryBtnTxt}>View Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.secondaryLink}>← Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ── Order History ──────────────────────────────────────────────
const STATUS_COLORS: Record<string, any> = {
  pending: 'primary', confirmed: 'info', dispatched: 'warning', delivered: 'success', cancelled: 'danger',
};

const OrdersScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const params: any = {page_size: 50};
        if (filter) params.order_status = filter;
        const {data} = await api.get('/orders', {params});
        setOrders(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [filter]);

  const STATUS_FILTERS = ['', 'pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter chips */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={i => i || 'all'}
        contentContainerStyle={styles.filterRow}
        showsHorizontalScrollIndicator={false}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
            onPress={() => setFilter(item)}>
            <Text style={[styles.filterChipTxt, filter === item && {color: Colors.white}]}>
              {item ? item.charAt(0).toUpperCase() + item.slice(1) : 'All'}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={orders}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <EmptyState title="No orders yet" icon="📋" /> : null}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.orderCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OrderDetail', {orderId: item.id, order: item})}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderNum}>#{item.order_number}</Text>
              <Badge label={item.status} variant={STATUS_COLORS[item.status] || 'primary'} />
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.orderMeta}>{item.items?.length || 0} items · {new Date(item.created_at).toLocaleDateString()}</Text>
              <Text style={styles.orderTotal}>{formatINR(item.grand_total)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgPrimary},
  successWrap: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl},
  successIcon: {fontSize: 72, marginBottom: Spacing.md},
  successTitle: {fontSize: Typography.xxxl, fontWeight: '800', color: Colors.secondary, letterSpacing: -1},
  orderId: {fontSize: Typography.md, fontWeight: '700', color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.md},
  successMsg: {fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl},
  summaryCard: {width: '100%', backgroundColor: Colors.bgSecondary, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border},
  sRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6},
  sLabel: {fontSize: Typography.sm, color: Colors.textSecondary},
  sVal: {fontSize: Typography.sm, fontWeight: '600'},
  primaryBtn: {width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: Spacing.md},
  primaryBtnTxt: {color: Colors.white, fontWeight: '700', fontSize: Typography.base},
  secondaryLink: {color: Colors.primary, fontWeight: '600', fontSize: Typography.sm},
  filterRow: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm},
  filterChip: {paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.bgSecondary, borderWidth: 1, borderColor: Colors.border},
  filterChipActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  filterChipTxt: {fontSize: Typography.xs, fontWeight: '700', color: Colors.textSecondary},
  list: {padding: Spacing.lg, gap: Spacing.sm},
  orderCard: {backgroundColor: Colors.bgSecondary, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm},
  orderHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm},
  orderNum: {fontSize: Typography.base, fontWeight: '800', color: Colors.textPrimary},
  orderRow: {flexDirection: 'row', justifyContent: 'space-between'},
  orderMeta: {fontSize: Typography.xs, color: Colors.textMuted},
  orderTotal: {fontSize: Typography.sm, fontWeight: '700', color: Colors.primary},
});

export {OrdersScreen};
export default OrdersScreen;
