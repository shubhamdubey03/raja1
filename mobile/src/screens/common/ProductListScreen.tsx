/**
 * P5-10 — Product Listing / P5-12 — Search
 * Infinite scroll pagination, sort & filter, debounced search.
 */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import api from '../../services/api';
import {ProductCard, EmptyState, Badge} from '../../components';
import {Colors, Typography, Spacing, Radius} from '../../theme';
import {debounce} from '../../utils/helpers';

const ProductListScreen: React.FC<{navigation: any; route: any}> = ({navigation, route}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState('newest');
  const PAGE_SIZE = 20;

  const fetchProducts = useCallback(async (pg: number, kw: string, s: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const {data} = await api.get('/products', {
        params: {page: pg, page_size: PAGE_SIZE, keyword: kw || undefined, sort: s},
      });
      if (pg === 1) setProducts(data);
      else setProducts(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, keyword, sort);
  }, [keyword, sort]);

  const debouncedSearch = useCallback(debounce((kw: string) => setKeyword(kw), 300), []);

  const loadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchProducts(next, keyword, sort);
  };

  const SORTS = [
    {label: 'Newest', value: 'newest'},
    {label: 'Price ↑', value: 'price_asc'},
    {label: 'Price ↓', value: 'price_desc'},
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={Colors.textMuted}
          onChangeText={debouncedSearch}
        />
      </View>

      {/* Sort chips */}
      <View style={styles.sortRow}>
        {SORTS.map(s => (
          <TouchableOpacity
            key={s.value}
            style={[styles.sortChip, sort === s.value && styles.sortChipActive]}
            onPress={() => setSort(s.value)}>
            <Text style={[styles.sortChipText, sort === s.value && {color: Colors.white}]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={products}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <ProductCard
            name={item.name}
            price={item.base_price}
            stockQty={item.stock_qty}
            threshold={item.low_stock_threshold}
            onPress={() => navigation.navigate('ProductDetail', {productId: item.id, product: item})}
          />
        )}
        ListEmptyComponent={!loading ? <EmptyState title="No products found" icon="📦" /> : null}
        ListFooterComponent={loading ? <ActivityIndicator color={Colors.primary} style={{padding: Spacing.lg}} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgPrimary},
  searchBar: {
    flexDirection: 'row', alignItems: 'center', margin: Spacing.lg,
    backgroundColor: Colors.bgSecondary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  searchIcon: {fontSize: 16},
  searchInput: {flex: 1, paddingVertical: 10, fontSize: Typography.base, color: Colors.textPrimary},
  sortRow: {flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  sortChip: {paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.bgSecondary, borderWidth: 1, borderColor: Colors.border},
  sortChipActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  sortChipText: {fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary},
  list: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl},
});

export default ProductListScreen;
