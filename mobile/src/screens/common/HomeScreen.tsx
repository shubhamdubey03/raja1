/**
 * P5-09 — Home Screen (Retailer Catalog & Vendor Dashboard)
 * Optimized to minimize API calls (categories loaded once; products on category change).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Alert, Image, Modal, Pressable, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAppSelector } from '../../hooks/useRedux';
import { ProductCard, EmptyState, Skeleton, SectionHeader } from '../../components';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { formatINR, normalizeImageUrl, formatDateSecure } from '../../utils/helpers';
import { useTranslation } from '../../i18n';
import {
  ShoppingCart, PackageSearch, TrendingUp,
  Users, AlertTriangle, Sparkles, ClipboardList, Bell,
  ChevronDown, Check
} from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Text as SvgText } from 'react-native-svg';

// ─── Types ────────────────────────────────────────────────────
interface VendorDashboard {
  today_orders: number;
  pending_amount_paise: number;
  active_retailers: number;
  low_stock_skus: number;
  out_of_stock_skus: number;
  orders_this_week: number;
  weekly_sales_trend: {
    label: string;
    sales_paise: number;
    sales_rupees: number;
  }[];
  recent_orders: {
    id: string;
    order_number: string;
    status: string;
    grand_total: number;
    delivery_address: string | null;
    created_at: string;
  }[];
}

// ─── Sales Chart Component ─────────────────────────────────────
const SalesChart: React.FC<{ trendData: any[] }> = ({ trendData }) => {
  // 1. Fallback to weekly mock trend if no trendData is present from the API
  const defaultData = [12000, 15000, 8000, 24000, 18000, 31000, 27298]; // in Rupees
  const defaultLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let finalData = [...defaultData];
  let finalLabels = [...defaultLabels];

  if (trendData && trendData.length > 0) {
    finalData = trendData.map(item => item.sales_rupees);
    finalLabels = trendData.map(item => item.label);
  }

  const width = 340;
  const height = 140;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minVal = Math.min(...finalData) * 0.8;
  const maxVal = Math.max(...finalData) * 1.1;
  const valRange = maxVal - minVal || 1;

  const points = finalData.map((val, index) => {
    const x = padding + (index / (finalData.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((val - minVal) / valRange) * chartHeight;
    return { x, y };
  });

  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  let areaD = '';
  if (points.length > 0 && pathD) {
    areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  }

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>Sales Trend</Text>
          <Text style={styles.chartSub}>Weekly procurement sales volume</Text>
        </View>
        <View style={styles.trendBadge}>
          <TrendingUp size={12} color={Colors.success} />
          <Text style={styles.trendText}>+18.4%</Text>
        </View>
      </View>

      <View style={styles.svgContainer}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = padding + ratio * chartHeight;
            return (
              <Path
                key={i}
                d={`M ${padding} ${y} L ${width - padding} ${y}`}
                stroke="#EAE5DF"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area gradient */}
          {areaD ? <Path d={areaD} fill="url(#chartGrad)" /> : null}

          {/* Line */}
          {pathD ? <Path d={pathD} fill="none" stroke={Colors.primary} strokeWidth="3" /> : null}

          {/* Point circles */}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill={Colors.white}
              stroke={Colors.primary}
              strokeWidth="2.5"
            />
          ))}

          {/* X axis labels */}
          {points.map((p, i) => (
            <SvgText
              key={i}
              x={p.x}
              y={height - 4}
              fontSize="9"
              fill={Colors.textMuted}
              fontWeight="600"
              textAnchor="middle">
              {finalLabels[i]}
            </SvgText>
          ))}
        </Svg>
      </View>
    </View>
  );
};

const FALLBACK_MAIN_CATEGORIES = ['All', 'Grocery', 'Electronics', 'Home & Kitchen'];

const FALLBACK_SUBCATEGORIES_DATA: { [key: string]: string[] } = {
  "Grocery": ["Daal", "Aata", "Masala", "Tel/Oil", "Rice", "Tea & Coffee", "Snacks"],
  "Electronics": ["Mobile", "Laptop", "Charger", "Earphones", "Smart TV", "Camera"],
  "Home & Kitchen": ["Cookware", "Cleaning", "Storage", "Appliances", "Bedding"]
};

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const t = useTranslation();
  const user = useAppSelector(s => s.auth.user);
  const isVendor = user?.role === 'vendor';

  // Retailer states
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showSubCatDropdown, setShowSubCatDropdown] = useState(false);

  const toggleCatDropdown = () => {
    setShowCatDropdown(prev => !prev);
    setShowSubCatDropdown(false);
  };

  const toggleSubCatDropdown = () => {
    setShowSubCatDropdown(prev => !prev);
    setShowCatDropdown(false);
  };

  const handleMainCategoryPress = (catName: string) => {
    setSelectedMainCategory(catName);
    if (catName === 'All') {
      setSelectedSubCategory('');
    } else {
      const allPrefix = catName === 'Home & Kitchen' ? 'All H&K' : `All ${catName}`;
      setSelectedSubCategory(allPrefix);
    }
    setShowCatDropdown(false);
    setShowSubCatDropdown(false);
  };

  const dynamicMainCategories = React.useMemo(() => {
    if (!categories || categories.length === 0) {
      return FALLBACK_MAIN_CATEGORIES;
    }
    return ['All', ...categories.map(c => c.name)];
  }, [categories]);

  const getSubcategories = (catName: string) => {
    if (catName === 'All') return [];
    const found = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    const list = found ? (found.sub_categories || found.subcategories || []).map((sub: any) => sub.name) : [];
    if (list.length === 0) {
      const fallbackList = FALLBACK_SUBCATEGORIES_DATA[catName] || [];
      const allPrefix = catName === 'Home & Kitchen' ? 'All H&K' : `All ${catName}`;
      return [allPrefix, ...fallbackList];
    }
    const allPrefix = catName === 'Home & Kitchen' ? 'All H&K' : `All ${catName}`;
    return [allPrefix, ...list];
  };

  const selectedRootCatId = React.useMemo(() => {
    if (selectedMainCategory === 'All') return null;
    const found = categories.find(c => c.name.toLowerCase() === selectedMainCategory.toLowerCase());
    return found ? found.id : null;
  }, [selectedMainCategory, categories]);

  const selectedSubCatId = React.useMemo(() => {
    if (!selectedSubCategory || selectedSubCategory.startsWith('All')) return null;
    const root = categories.find(c => c.name.toLowerCase() === selectedMainCategory.toLowerCase());
    if (!root) return null;
    const subList = root.sub_categories || root.subcategories || [];
    const found = subList.find((s: any) => s.name.toLowerCase() === selectedSubCategory.toLowerCase());
    return found ? found.id : null;
  }, [selectedSubCategory, selectedMainCategory, categories]);

  // Vendor state
  const [dashboard, setDashboard] = useState<VendorDashboard | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch products only (efficiently triggered on category change or pull-to-refresh)
  const fetchProducts = useCallback(async (catId: string | null) => {
    try {
      const { data } = await api.get('/products', {
        params: { category_id: catId || undefined, page_size: 20 },
      });
      setProducts(data || []);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/categories/tree');
      setCategories(data || []);
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  }, []);

  // 2. Main initial loader (loads static categories once, dashboard or initial products once)
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      if (isVendor) {
        const { data } = await api.get('/vendor/dashboard');
        setDashboard(data);
      } else {
        // Load categories once, and initial products in parallel
        const [catRes, prodRes] = await Promise.all([
          api.get('/categories/tree'),
          api.get('/products', { params: { page_size: 20 } }),
        ]);
        setCategories(catRes.data || []);
        setProducts(prodRes.data || []);
      }
    } catch (e) {
      console.error('Home initial load error:', e);
    } finally {
      setLoading(false);
    }
  }, [isVendor]);

  // Load once on mount or when role changes
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Fetch products when selected category changes (WITHOUT reloading categories!)
  useEffect(() => {
    if (!isVendor && !loading) {
      fetchProducts(selectedSubCatId || selectedRootCatId);
    }
  }, [selectedRootCatId, selectedSubCatId, fetchProducts, isVendor]);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (isVendor) {
        const { data } = await api.get('/vendor/dashboard');
        setDashboard(data);
      } else {
        await fetchProducts(selectedSubCatId || selectedRootCatId);
      }
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // ─── Loading skeleton ───────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.skeletonHeader}>
          <Skeleton width={160} height={14} />
          <Skeleton width={220} height={28} />
        </View>
        <View style={styles.skeletonBody}>
          <View style={styles.skeletonRow}>
            <Skeleton width="48%" height={110} radius={12} />
            <Skeleton width="48%" height={110} radius={12} />
          </View>
          <View style={styles.skeletonRow}>
            <Skeleton width="48%" height={110} radius={12} />
            <Skeleton width="48%" height={110} radius={12} />
          </View>
          {[1, 2, 3].map(i => <Skeleton key={i} height={72} radius={12} />)}
        </View>
      </SafeAreaView>
    );
  }

  // ─── VENDOR VIEW ────────────────────────────────────────────
  if (isVendor) {
    const d = dashboard;
    const pendingINR = d ? d.pending_amount_paise / 100 : 0;
    const pendingLabel = pendingINR >= 100000
      ? `₹${(pendingINR / 100000).toFixed(1)}L`
      : formatINR(d?.pending_amount_paise ?? 0);

    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        {/* Brand Header */}
        <View style={[styles.vendorHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={styles.brandTitleWrap}>
            <View style={styles.avatarMini}>
              {user?.avatar_url ? (
                <Image
                  source={{ uri: normalizeImageUrl(user.avatar_url) || undefined }}
                  style={{ width: 36, height: 36, borderRadius: 18 }}
                />
              ) : (
                <Text style={styles.avatarMiniText}>
                  {user?.full_name?.slice(0, 2).toUpperCase() || 'SS'}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.brandNameTitle}>Supply Setu</Text>
              <Text style={styles.vendorNameSub}>{user?.full_name || user?.mobile}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginRight: 4 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Bell size={22} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <ShoppingCart size={22} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}>

          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={styles.vendorGreeting}>{t('welcomeBack')},</Text>
            <Text style={styles.vendorMainTitle}>{user?.full_name || user?.mobile}</Text>
            <Text style={styles.vendorSub}>
              Here is your live distribution network overview.
            </Text>
          </View>

          {/* Stats Grid — ALL from API */}
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: Colors.primaryLight }]}>
                  <TrendingUp size={20} color={Colors.primary} />
                </View>
                <Text style={styles.statVal}>{d?.today_orders ?? 0}</Text>
                <Text style={styles.statLabel}>{t('todayOrders')}</Text>
                <Text style={styles.statSub}>{d?.orders_this_week ?? 0} this week</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: Colors.warningLight }]}>
                  <ClipboardList size={20} color={Colors.warning} />
                </View>
                <Text style={styles.statVal}>{pendingLabel}</Text>
                <Text style={styles.statLabel}>{t('pendingPayments')}</Text>
                <Text style={[styles.statSub, { color: Colors.warning }]}>Awaiting settlement</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: Colors.successLight }]}>
                  <Users size={20} color={Colors.success} />
                </View>
                <Text style={styles.statVal}>{d?.active_retailers ?? 0}</Text>
                <Text style={styles.statLabel}>{t('activeRetailers')}</Text>
                <Text style={styles.statSub}>Unique buyers</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: Colors.errorLight }]}>
                  <AlertTriangle size={20} color={Colors.error} />
                </View>
                <Text style={styles.statVal}>{d?.low_stock_skus ?? 0} SKU</Text>
                <Text style={styles.statLabel}>{t('lowStockAlerts')}</Text>
                {(d?.out_of_stock_skus ?? 0) > 0 && (
                  <Text style={[styles.statSub, { color: Colors.error }]}>
                    {d?.out_of_stock_skus} out of stock
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Revenue Graph */}
          <SalesChart trendData={d?.weekly_sales_trend || []} />

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionHeading}>{t('quickActions')}</Text>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('Orders')}
                activeOpacity={0.8}>
                <ClipboardList size={16} color={Colors.primary} />
                <Text style={styles.actionBtnText}>{t('viewOrders')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => Alert.alert('Schemes', 'Configure promotional schemes from the Admin Panel.')}
                activeOpacity={0.8}>
                <Sparkles size={16} color={Colors.primary} />
                <Text style={styles.actionBtnText}>{t('sendScheme')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Orders — from API */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionHeading}>Recent Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Orders')} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentList}>
              {d?.recent_orders && d.recent_orders.length > 0 ? (
                d.recent_orders.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.orderItemCard}
                    onPress={() => navigation.navigate('OrderDetail', { orderId: item.id, order: item })}
                    activeOpacity={0.85}>
                    <View style={styles.orderLeft}>
                      <Text style={styles.orderStoreName} numberOfLines={1}>
                        {item.delivery_address
                          ? item.delivery_address.split(',')[0].trim()
                          : item.order_number}
                      </Text>
                      <Text style={styles.orderDateText}>
                        {formatDateSecure(item.created_at)}{' '}
                        · #{item.order_number.split('-').pop()}
                      </Text>
                    </View>
                    <View style={styles.orderRight}>
                      <Text style={styles.orderAmtText}>{formatINR(item.grand_total)}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              item.status === 'pending' ? Colors.warningLight : Colors.successLight,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color:
                                item.status === 'pending' ? Colors.warning : Colors.success,
                            },
                          ]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyRecent}>
                  <ClipboardList size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyRecentText}>No orders yet</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── RETAILER VIEW ──────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('welcomeBack')} 👋</Text>
          <Text style={styles.name}>{user?.full_name?.split(' ')[0] || user?.mobile}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Bell size={22} color={Colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Cart')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ShoppingCart size={22} color={Colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }>

        <View>
          {/* Category Dropdown Selector */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownHeader}
              activeOpacity={0.8}
              onPress={toggleCatDropdown}>
              <View style={styles.dropdownHeaderTextWrap}>
                <Text style={styles.dropdownLabel}>Category</Text>
                <Text style={styles.dropdownValue}>
                  {selectedMainCategory === 'All' ? 'All Categories' : selectedMainCategory}
                </Text>
              </View>
              <ChevronDown size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Subcategory Dropdown Selector */}
          {selectedMainCategory !== 'All' && (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownHeader}
                activeOpacity={0.8}
                onPress={toggleSubCatDropdown}>
                <View style={styles.dropdownHeaderTextWrap}>
                  <Text style={styles.dropdownLabel}>Sub-category</Text>
                  <Text style={styles.dropdownValue}>
                    {selectedSubCategory.startsWith('All') ? 'All' : selectedSubCategory}
                  </Text>
                </View>
                <ChevronDown size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Products */}
          <View style={{ paddingHorizontal: Spacing.xl }}>
            <SectionHeader
              title={t('products')}
              action={
                <TouchableOpacity
                  onPress={() => navigation.navigate('Products')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.viewAll}>{t('viewAll')}</Text>
                </TouchableOpacity>
              }
            />
            <View style={styles.productGrid}>
              {products.length === 0 ? (
                <EmptyState
                  title="No products found"
                  subtitle="We couldn't find any products in this category."
                  icon={<PackageSearch size={48} color={Colors.textMuted} />}
                />
              ) : (
                products.map(p => (
                  <ProductCard
                    key={p.id}
                    name={p.name}
                    price={p.base_price}
                    stockQty={p.stock_qty}
                    threshold={p.low_stock_threshold}
                    imageUrl={normalizeImageUrl(p.images?.[0]?.image_url ?? p.image_url ?? null)}
                    unit={p.unit}
                    onPress={() =>
                      navigation.navigate('ProductDetail', { productId: p.id, product: p })
                    }
                  />
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCatDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCatDropdown(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCatDropdown(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCatDropdown(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={dynamicMainCategories}
              keyExtractor={item => item}
              renderItem={({ item }) => {
                const isActive = selectedMainCategory === item;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => {
                      handleMainCategoryPress(item);
                    }}>
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {item === 'All' ? 'All Categories' : item}
                    </Text>
                    {isActive && <Check size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Subcategory Selection Modal */}
      <Modal
        visible={showSubCatDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSubCatDropdown(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSubCatDropdown(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sub-category</Text>
              <TouchableOpacity onPress={() => setShowSubCatDropdown(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={getSubcategories(selectedMainCategory)}
              keyExtractor={item => item}
              renderItem={({ item }) => {
                const isActive = selectedSubCategory === item;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => {
                      setSelectedSubCategory(item);
                      setShowSubCatDropdown(false);
                    }}>
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {item}
                    </Text>
                    {isActive && <Check size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },

  // Skeleton
  skeletonHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  skeletonBody: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },

  // Retailer Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greeting: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  name: {
    fontSize: Typography.subheading,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  cartBtn: {
    width: 44,
    height: 44,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },

  // Category chips
  catScroll: { paddingVertical: Spacing.xs },
  catScrollContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: Typography.caption, fontWeight: '600', color: Colors.textSecondary },

  viewAll: { fontSize: Typography.caption, color: Colors.primary, fontWeight: '600' },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: Spacing.xxxl,
  },

  // Vendor Header
  vendorHeader: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  brandTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: { color: Colors.white, fontWeight: '700', fontSize: Typography.caption },
  brandNameTitle: {
    fontSize: Typography.body,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  vendorNameSub: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Welcome
  welcomeSection: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  vendorGreeting: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  vendorMainTitle: {
    fontSize: Typography.heading,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  vendorSub: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Stats grid
  grid: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  gridRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statVal: {
    fontSize: Typography.subheading,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statSub: {
    fontSize: 9,
    color: Colors.success,
    fontWeight: '600',
  },

  // Quick Actions
  actionsSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionHeading: {
    fontSize: Typography.body,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  actionButtonsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    ...Shadow.sm,
  },
  actionBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  // Recent Orders
  recentSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  viewAllText: { fontSize: Typography.caption, fontWeight: '700', color: Colors.primary },
  recentList: { gap: Spacing.sm },
  orderItemCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  orderLeft: { flex: 1, paddingRight: Spacing.sm },
  orderStoreName: {
    fontSize: Typography.body - 1,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  orderDateText: { fontSize: Typography.caption - 1, color: Colors.textMuted, marginTop: 2 },
  orderRight: { alignItems: 'flex-end' },
  orderAmtText: {
    fontSize: Typography.body - 1,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statusBadge: {
    borderRadius: Radius.lg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  statusBadgeText: { fontSize: 8, fontWeight: '800' },
  emptyRecent: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  emptyRecentText: { fontSize: Typography.caption, color: Colors.textMuted, fontWeight: '600' },

  // Sales Chart
  chartCard: {
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  chartSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.success,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  // Dropdown Styling
  dropdownContainer: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    position: 'relative',
    zIndex: 100,
    elevation: 5,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  dropdownHeaderTextWrap: {
    flexDirection: 'column',
  },
  dropdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  
  // Modal Bottom Sheet Styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '70%',
    ...Shadow.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F1EC',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F1EC',
  },
  modalItemActive: {
    backgroundColor: '#F9F7F4',
  },
  modalItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});

export default HomeScreen;
