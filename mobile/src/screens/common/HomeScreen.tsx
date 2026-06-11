/**
 * P5-09 — Home Screen
 * Category scroll + product grid; role-aware pricing; pull-to-refresh.
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import api from '../../services/api';
import {useAppSelector} from '../../hooks/useRedux';
import {ProductCard, EmptyState, Skeleton, SectionHeader} from '../../components';
import {Colors, Typography, Spacing, Radius, Shadow} from '../../theme';

const HomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const user = useAppSelector(s => s.auth.user);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/categories'),
        api.get('/products', {params: {category_id: selectedCat || undefined, page_size: 20}}),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
    } catch (e) {
      console.error('Home load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCat]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={80} radius={12} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        stickyHeaderIndices={[0]}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.name}>{user?.full_name?.split(' ')[0] || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.cartIcon}>🛒</Text>
          </TouchableOpacity>
        </View>

        {/* Category Chips */}
        <SectionHeader title="Categories" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{gap: Spacing.sm, paddingHorizontal: Spacing.lg}}>
          <TouchableOpacity
            style={[styles.catChip, !selectedCat && styles.catChipActive]}
            onPress={() => setSelectedCat(null)}>
            <Text style={[styles.catChipText, !selectedCat && {color: Colors.white}]}>All</Text>
          </TouchableOpacity>
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catChip, selectedCat === c.id && styles.catChipActive]}
              onPress={() => setSelectedCat(c.id)}>
              <Text style={[styles.catChipText, selectedCat === c.id && {color: Colors.white}]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products */}
        <SectionHeader
          title="Products"
          action={
            <Text style={styles.viewAll} onPress={() => navigation.navigate('Products')}>View all →</Text>
          }
        />
        <View style={styles.content}>
          {products.length === 0 ? (
            <EmptyState title="No products found" subtitle="Try a different category" icon="📦" />
          ) : (
            products.map(p => (
              <ProductCard
                key={p.id}
                name={p.name}
                price={p.base_price}
                stockQty={p.stock_qty}
                threshold={p.low_stock_threshold}
                onPress={() => navigation.navigate('ProductDetail', {productId: p.id, product: p})}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgPrimary},
  content: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, backgroundColor: Colors.bgPrimary,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  greeting: {fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '500'},
  name: {fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary},
  cartBtn: {
    width: 44, height: 44, backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  cartIcon: {fontSize: 20},
  catScroll: {paddingVertical: Spacing.sm},
  catChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.bgSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  catChipText: {fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary},
  viewAll: {fontSize: Typography.sm, color: Colors.primary, fontWeight: '600'},
});

export default HomeScreen;
