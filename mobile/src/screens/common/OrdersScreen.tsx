/**
 * P5-16 — Orders Screen + Order Confirmation
 * Supply Setu premium design — order cards with product image, status badge,
 * date, item count, and total amount.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { formatINR, normalizeImageUrl, formatDateSecure } from '../../utils/helpers';
import { Calendar, Package, ChevronRight, CheckCircle } from 'lucide-react-native';

// ── Status config ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'PENDING',           color: '#725B00', bg: '#FFF9E6' },
  confirmed:  { label: 'CONFIRMED',         color: '#1A5CB3', bg: '#E8F0FE' },
  dispatched: { label: 'PENDING SHIPMENT',  color: '#C07000', bg: '#FFF3CD' },
  delivered:  { label: 'DELIVERED',         color: '#23501D', bg: '#EAF2E8' },
  cancelled:  { label: 'CANCELLED',         color: '#BA1A1A', bg: '#FFDAD6' },
  processing: { label: 'PROCESSING',        color: '#6B7280', bg: '#F0EDEB' },
  returned:   { label: 'RETURNED',          color: '#BA1A1A', bg: '#FFDAD6' },
};

// ── Order Confirmation Screen ──────────────────────────────────
export const OrderConfirmationScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { order } = route.params;
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.confirmWrap}>
        {/* Checkmark */}
        <View style={styles.confirmIconWrap}>
          <CheckCircle size={56} color={Colors.success} />
        </View>
        <Text style={styles.confirmTitle}>Order Confirmed.</Text>
        <Text style={styles.confirmSub}>
          Your procurement process has been initiated.
        </Text>

        {/* Order meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ORDER NUMBER</Text>
            <Text style={styles.metaVal}>#{order.order_number}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>EXPECTED DELIVERY</Text>
            <Text style={styles.metaVal}>
              {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.sRow}>
            <Text style={styles.sLabel}>Subtotal</Text>
            <Text style={styles.sVal}>{formatINR(order.subtotal)}</Text>
          </View>
          <View style={styles.sRow}>
            <Text style={styles.sLabel}>GST</Text>
            <Text style={styles.sVal}>{formatINR(order.gst_amount)}</Text>
          </View>
          <View style={[styles.sRow, styles.sTotalRow]}>
            <Text style={styles.sTotalLabel}>Total Amount</Text>
            <Text style={styles.sTotalVal}>{formatINR(order.grand_total)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Orders')}>
          <Text style={styles.primaryBtnTxt}>View My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.secondaryLink}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ── Order Card ─────────────────────────────────────────────────
const OrderCard: React.FC<{ item: any; onPress: () => void }> = ({ item, onPress }) => {
  const [imgError, setImgError] = useState(false);

  // Try to get a product image from the first order item
  const firstItemImgRaw = item.items?.[0]?.product_image_url ?? item.items?.[0]?.image_url ?? null;
  const imageUrl = normalizeImageUrl(firstItemImgRaw);

  const status = item.status?.toLowerCase() ?? 'pending';
  const statusConf = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  const dateStr = formatDateSecure(item.created_at);
  const itemCount = item.items?.length ?? 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.orderCard}>
      {/* Product thumbnail */}
      <View style={styles.orderImgWrap}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.orderImg}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.orderImgPlaceholder}>
            <Package size={24} color={Colors.primary} />
          </View>
        )}
      </View>

      {/* Order info */}
      <View style={styles.orderBody}>
        {/* Order number + status */}
        <View style={styles.orderTopRow}>
          <Text style={styles.orderNum}>{item.order_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
            <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
          </View>
        </View>

        {/* Vendor / company name (fallback to order number) */}
        <Text style={styles.vendorName} numberOfLines={1}>
          {item.vendor_name ?? item.delivery_address?.split(',')[0] ?? 'Supply Partner'}
        </Text>

        {/* Date + items */}
        <View style={styles.orderMeta}>
          <Calendar size={12} color={Colors.textMuted} />
          <Text style={styles.orderMetaText}>{dateStr} · {itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
        </View>

        {/* Total + View Details */}
        <View style={styles.orderBottomRow}>
          <View>
            <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
            <Text style={styles.totalVal}>{formatINR(item.grand_total)}</Text>
          </View>
          <TouchableOpacity onPress={onPress} style={styles.viewDetailsBtn}>
            <Text style={styles.viewDetailsTxt}>View Details</Text>
            <ChevronRight size={12} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Tab Filter ─────────────────────────────────────────────────
const TABS = [
  { label: 'All Orders', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

// ── Orders Screen ─────────────────────────────────────────────
const OrdersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params: any = { page_size: 50 };
        if (filter) params.order_status = filter;
        const { data } = await api.get('/orders', { params });
        setOrders(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [filter]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSub}>Track and manage your supply chain fulfillments.</Text>
        </View>
      </View>

      {/* ── Tab filters ── */}
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, filter === tab.value && styles.tabActive]}
            onPress={() => setFilter(tab.value)}>
            <Text style={[styles.tabTxt, filter === tab.value && styles.tabTxtActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Package size={48} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>Your placed orders will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <OrderCard
              item={item}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id, order: item })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1EC' },

  // ── Confirmation
  confirmWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl,
  },
  confirmIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.successLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  confirmTitle: {
    fontSize: 28, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: -0.5, marginBottom: 6,
  },
  confirmSub: {
    fontSize: Typography.caption, color: Colors.textMuted,
    textAlign: 'center', marginBottom: Spacing.xl,
  },
  metaRow: {
    flexDirection: 'row', width: '100%',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '700', letterSpacing: 0.8, marginBottom: 3 },
  metaVal: { fontSize: Typography.caption, fontWeight: '700', color: Colors.textPrimary },
  summaryCard: {
    width: '100%', backgroundColor: Colors.bgCard,
    borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
  },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  sLabel: { fontSize: Typography.caption, color: Colors.textSecondary },
  sVal: { fontSize: Typography.caption, fontWeight: '600', color: Colors.textPrimary },
  sTotalRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 10 },
  sTotalLabel: { fontSize: Typography.body, fontWeight: '700', color: Colors.textPrimary },
  sTotalVal: { fontSize: Typography.body, fontWeight: '800', color: Colors.primary },
  primaryBtn: {
    width: '100%', backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: 14,
    alignItems: 'center', marginBottom: Spacing.md,
  },
  primaryBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: Typography.body },
  secondaryLink: { color: Colors.primary, fontWeight: '600', fontSize: Typography.caption },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerLeft: { flex: 1, marginRight: Spacing.md },
  headerTitle: {
    fontSize: 26, fontWeight: '800',
    color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 3,
  },
  headerSub: { fontSize: Typography.caption, color: Colors.textMuted, lineHeight: 18 },
  newOrderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  newOrderTxt: { fontSize: Typography.caption, fontWeight: '700', color: Colors.white },

  // ── Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: 0,
  },
  tab: {
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabTxt: { fontSize: Typography.caption, fontWeight: '600', color: Colors.textMuted },
  tabTxtActive: { color: Colors.textPrimary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.sm },

  // ── Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── List
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 32 },

  // ── Order Card
  orderCard: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  orderImgWrap: {
    width: 90,
    backgroundColor: Colors.primaryLight,
  },
  orderImg: { width: '100%', height: '100%' },
  orderImgPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  orderBody: { flex: 1, padding: Spacing.sm },
  orderTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 3,
  },
  orderNum: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  statusBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4,
  },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  vendorName: {
    fontSize: 14, fontWeight: '700',
    color: Colors.textPrimary, marginBottom: 4,
  },
  orderMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  orderMetaText: { fontSize: 11, color: Colors.textMuted },
  orderBottomRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  totalVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewDetailsTxt: { fontSize: Typography.caption, color: Colors.primary, fontWeight: '700' },

  // ── Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg, ...Shadow.sm,
  },
  emptyTitle: { fontSize: Typography.subheading, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  emptySub: { fontSize: Typography.caption, color: Colors.textMuted },
});

export { OrdersScreen };
export default OrdersScreen;
