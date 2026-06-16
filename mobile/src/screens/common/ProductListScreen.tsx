/**
 * P5-10 — Product Listing / P5-12 — Search
 * Infinite scroll pagination, sort & filter, debounced search.
 * Includes category & subcategory dropdown selectors matching vendor inventory.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import api from '../../services/api';
import { ProductCard, EmptyState } from '../../components';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { debounce, normalizeImageUrl } from '../../utils/helpers';

interface CategoryNode {
  id: string;
  name: string;
  subcategories?: CategoryNode[];
  sub_categories?: CategoryNode[];
}

const FALLBACK_MAIN_CATEGORIES = ['All', 'Grocery', 'Electronics', 'Home & Kitchen'];

const FALLBACK_SUBCATEGORIES_DATA: { [key: string]: string[] } = {
  "Grocery": ["Daal", "Aata", "Masala", "Tel/Oil", "Rice", "Tea & Coffee", "Snacks"],
  "Electronics": ["Mobile", "Laptop", "Charger", "Earphones", "Smart TV", "Camera"],
  "Home & Kitchen": ["Cookware", "Cleaning", "Storage", "Appliances", "Bedding"]
};

const ProductListScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showSubCatDropdown, setShowSubCatDropdown] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState('newest');
  const PAGE_SIZE = 20;

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

  const fetchProducts = useCallback(async (pg: number, kw: string, s: string, catId?: string | null, subCatId?: string | null) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.get('/products', {
        params: {
          page: pg,
          page_size: PAGE_SIZE,
          keyword: kw || undefined,
          sort: s,
          category_id: catId || undefined,
          sub_category_id: subCatId || undefined,
        },
      });
      if (pg === 1) setProducts(data);
      else setProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = data.filter((p: any) => !existingIds.has(p.id));
        return [...prev, ...uniqueNew];
      });
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const { data } = await api.get('/categories/tree');
      setCategories(data || []);
    } catch (e: any) {
      console.error('[ProductListScreen] Error fetching categories:', e);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, keyword, sort, selectedRootCatId, selectedSubCatId);
  }, [keyword, sort, selectedRootCatId, selectedSubCatId]);

  const debouncedSearch = useCallback(debounce((kw: string) => setKeyword(kw), 300), []);

  const loadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchProducts(next, keyword, sort, selectedRootCatId, selectedSubCatId);
  };

  const SORTS = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price ↑', value: 'price_asc' },
    { label: 'Price ↓', value: 'price_desc' },
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
            <Text style={[styles.sortChipText, sort === s.value && { color: Colors.white }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

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

      {/* Products list */}
      <FlatList
        data={products}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProductCard
            name={item.name}
            price={item.base_price}
            stockQty={item.stock_qty}
            threshold={item.low_stock_threshold}
            imageUrl={normalizeImageUrl(item.images?.[0]?.image_url ?? item.image_url ?? null)}
            unit={item.unit}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id, product: item })}
          />
        )}
        ListEmptyComponent={!loading ? <EmptyState title="No products found" icon="📦" /> : null}
        ListFooterComponent={loading ? <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.lg }} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', margin: Spacing.lg,
    backgroundColor: Colors.bgSecondary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
    ...Shadow.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: Typography.base, color: Colors.textPrimary },
  sortRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sortChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.bgSecondary, borderWidth: 1, borderColor: Colors.border },
  sortChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sortChipText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },

  // Dropdown Styling
  dropdownContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
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

export default ProductListScreen;
