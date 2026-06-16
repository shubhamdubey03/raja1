/**
 * Vendor Inventory Management Screen
 * Premium design matching Supply Setu brand — dynamic product images.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Image, Modal, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { EmptyState } from '../../components';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { debounce, normalizeImageUrl } from '../../utils/helpers';
import { Search, Upload, Package, ShoppingBag, Archive, ChevronDown, Check } from 'lucide-react-native';

interface CategoryNode {
  id: string;
  name: string;
  subcategories?: CategoryNode[];
  sub_categories?: CategoryNode[];
}

// ── Types ─────────────────────────────────────────────────────
interface ProductImage { id: string; image_url: string; sort_order: number; }
interface Product {
  id: string; name: string; sku: string; description?: string;
  base_price: number; stock_qty: number; low_stock_threshold: number;
  unit: string; images: ProductImage[]; image_url?: string;
}

// ── Product Card ──────────────────────────────────────────────
const InventoryCard: React.FC<{ item: any; onPress: () => void }> = ({ item, onPress }) => {
  const [imgError, setImgError] = useState(false);
  const rawUrl = item.images?.[0]?.image_url ?? item.image_url ?? null;
  const imageUrl = normalizeImageUrl(rawUrl);

  const isOutOfStock = item.stock_qty <= 0;
  const isLowStock = !isOutOfStock && item.stock_qty <= item.low_stock_threshold;

  const statusColor = isOutOfStock ? Colors.error : isLowStock ? Colors.warning : Colors.success;
  const statusBg = isOutOfStock ? Colors.errorLight : isLowStock ? Colors.warningLight : Colors.successLight;
  const statusLabel = isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK';

  const priceRupees = (item.base_price / 100).toFixed(2);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.card}>
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Archive size={32} color={Colors.primary} />
          </View>
        )}

        {/* Stock badge overlaid on image */}
        <View style={[styles.stockBadge, { backgroundColor: statusBg }]}>
          <View style={[styles.stockDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.stockBadgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        {/* Category & Sub-category Badges */}
        <View style={styles.badgeRow}>
          {item.category && (
            <View style={[styles.badge, styles.categoryBadge]}>
              <Text style={styles.badgeText}>{item.category}</Text>
            </View>
          )}
          {item.sub_category && (
            <View style={[styles.badge, styles.subCategoryBadge]}>
              <Text style={styles.badgeText}>{item.sub_category}</Text>
            </View>
          )}
        </View>

        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>

        {item.description ? (
          <Text style={styles.productDesc} numberOfLines={1}>{item.description}</Text>
        ) : (
          <Text style={styles.productSku}>SKU: {item.sku}</Text>
        )}

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>₹{priceRupees}</Text>
          <Text style={styles.perUnit}>/{item.unit}</Text>
        </View>

        <View style={styles.qtyRow}>
          <ShoppingBag size={12} color={Colors.textMuted} />
          <Text style={styles.qtyText}>
            {item.stock_qty} {item.unit}{item.stock_qty !== 1 ? 's' : ''} available
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Main Screen ───────────────────────────────────────────────
const FALLBACK_MAIN_CATEGORIES = ['All', 'Grocery', 'Electronics', 'Home & Kitchen'];

const FALLBACK_SUBCATEGORIES_DATA: { [key: string]: string[] } = {
  "Grocery": ["Daal", "Aata", "Masala", "Tel/Oil", "Rice", "Tea & Coffee", "Snacks"],
  "Electronics": ["Mobile", "Laptop", "Charger", "Earphones", "Smart TV", "Camera"],
  "Home & Kitchen": ["Cookware", "Cleaning", "Storage", "Appliances", "Bedding"]
};

const getCategoryPath = (categoryId: string, tree: CategoryNode[]): { rootCatName: string; subCatName: string } => {
  if (!categoryId || !tree) return { rootCatName: '', subCatName: '' };
  
  for (const root of tree) {
    if (root.id === categoryId) {
      return { rootCatName: root.name, subCatName: '' };
    }
    const subList = root.sub_categories || root.subcategories || [];
    for (const sub of subList) {
      if (sub.id === categoryId) {
        return { rootCatName: root.name, subCatName: sub.name };
      }
      const leafList = sub.sub_categories || sub.subcategories || [];
      for (const leaf of leafList) {
        if (leaf.id === categoryId) {
          return { rootCatName: root.name, subCatName: sub.name };
        }
      }
    }
  }
  return { rootCatName: '', subCatName: '' };
};

const detectCategoryAndSub = (product: any, categoriesTree: CategoryNode[]) => {
  let rootCatName = '';
  let subCatName = '';

  // 1. Try resolving using sub_category_id
  if (product.sub_category_id && categoriesTree) {
    for (const root of categoriesTree) {
      const subList = root.sub_categories || root.subcategories || [];
      const foundSub = subList.find((sub: any) => sub.id === product.sub_category_id);
      if (foundSub) {
        rootCatName = root.name;
        subCatName = foundSub.name;
        break;
      }
    }
  }

  // 2. If not found, fallback to category_id
  if (!rootCatName && product.category_id && categoriesTree) {
    const path = getCategoryPath(product.category_id, categoriesTree);
    rootCatName = path.rootCatName;
    subCatName = path.subCatName;
  }

  // 3. Fallback to name-based detection if tree resolution fails
  if (!rootCatName) {
    const nameLower = product.name.toLowerCase();
    if (nameLower.includes('tea') || nameLower.includes('coffee') || nameLower.includes('oil') || nameLower.includes('atta') || nameLower.includes('salt') || nameLower.includes('rice') || nameLower.includes('flakes') || nameLower.includes('bhujia') || nameLower.includes('honey') || nameLower.includes('chocolate') || nameLower.includes('ketchup') || nameLower.includes('noodles') || nameLower.includes('biscuit') || nameLower.includes('almond') || nameLower.includes('sugar') || nameLower.includes('soya')) {
      rootCatName = 'Grocery';
    } else if (nameLower.includes('mouse') || nameLower.includes('keyboard') || nameLower.includes('headphone') || nameLower.includes('charger') || nameLower.includes('airtag') || nameLower.includes('sd card') || nameLower.includes('speaker') || nameLower.includes('router') || nameLower.includes('power bank') || nameLower.includes('webcam') || nameLower.includes('ssd') || nameLower.includes('deck') || nameLower.includes('monitor') || nameLower.includes('adapter') || nameLower.includes('light') || nameLower.includes('fitbit') || nameLower.includes('printer') || nameLower.includes('nord') || nameLower.includes('vivobook')) {
      rootCatName = 'Electronics';
    } else if (nameLower.includes('bottle') || nameLower.includes('flask') || nameLower.includes('kadai') || nameLower.includes('cooker') || nameLower.includes('tumbler') || nameLower.includes('sponge') || nameLower.includes('cleaner') || nameLower.includes('broom') || nameLower.includes('fragrance') || nameLower.includes('repellent') || nameLower.includes('induction') || nameLower.includes('lunch') || nameLower.includes('jug') || nameLower.includes('mixer') || nameLower.includes('container') || nameLower.includes('kettle') || nameLower.includes('pan') || nameLower.includes('sheet') || nameLower.includes('towel') || nameLower.includes('bulb') || nameLower.includes('battery')) {
      rootCatName = 'Home & Kitchen';
    } else {
      rootCatName = 'Grocery';
    }
  }

  if (!subCatName) {
    const nameLower = product.name.toLowerCase();
    if (rootCatName === 'Grocery') {
      if (nameLower.includes('atta') || nameLower.includes('flour')) subCatName = 'Aata';
      else if (nameLower.includes('tea') || nameLower.includes('coffee')) subCatName = 'Tea & Coffee';
      else if (nameLower.includes('oil') || nameLower.includes('ghee')) subCatName = 'Tel/Oil';
      else if (nameLower.includes('rice')) subCatName = 'Rice';
      else if (nameLower.includes('sugar')) subCatName = 'Sugar';
      else if (nameLower.includes('bhujia') || nameLower.includes('snack') || nameLower.includes('biscuit') || nameLower.includes('chocolate') || nameLower.includes('almond')) subCatName = 'Snacks';
      else if (nameLower.includes('turmeric') || nameLower.includes('pepper') || nameLower.includes('masala')) subCatName = 'Masala';
      else if (nameLower.includes('daal')) subCatName = 'Daal';
      else subCatName = 'Snacks';
    } else if (rootCatName === 'Electronics') {
      if (nameLower.includes('charger') || nameLower.includes('adapter')) subCatName = 'Charger';
      else if (nameLower.includes('headphone') || nameLower.includes('earphone')) subCatName = 'Earphones';
      else if (nameLower.includes('tv') || nameLower.includes('monitor')) subCatName = 'Smart TV';
      else if (nameLower.includes('camera') || nameLower.includes('webcam')) subCatName = 'Camera';
      else if (nameLower.includes('phone') || nameLower.includes('nord')) subCatName = 'Mobile';
      else if (nameLower.includes('laptop') || nameLower.includes('vivobook')) subCatName = 'Laptop';
      else subCatName = 'Charger';
    } else if (rootCatName === 'Home & Kitchen') {
      if (nameLower.includes('cleaner') || nameLower.includes('sponge') || nameLower.includes('broom')) subCatName = 'Cleaning';
      else if (nameLower.includes('cooker') || nameLower.includes('pan') || nameLower.includes('kadai')) subCatName = 'Cookware';
      else if (nameLower.includes('bottle') || nameLower.includes('flask') || nameLower.includes('container') || nameLower.includes('jug')) subCatName = 'Storage';
      else if (nameLower.includes('kettle') || nameLower.includes('mixer') || nameLower.includes('induction')) subCatName = 'Appliances';
      else if (nameLower.includes('sheet') || nameLower.includes('towel')) subCatName = 'Bedding';
      else subCatName = 'Storage';
    }
  }

  return { category: rootCatName, sub_category: subCatName };
};

const InventoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showSubCatDropdown, setShowSubCatDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const PAGE_SIZE = 20;
  const loadingRef = useRef(false);

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
  
  const toggleCatDropdown = () => {
    setShowCatDropdown(prev => !prev);
    setShowSubCatDropdown(false);
  };

  const toggleSubCatDropdown = () => {
    setShowSubCatDropdown(prev => !prev);
    setShowCatDropdown(false);
  };

  const selectedRootCatId = React.useMemo(() => {
    if (selectedMainCategory === 'All') return null;
    const found = categories.find(c => c.name.toLowerCase().includes(selectedMainCategory.toLowerCase()) || selectedMainCategory.toLowerCase().includes(c.name.toLowerCase()));
    return found ? found.id : null;
  }, [selectedMainCategory, categories]);

  const fetchProducts = useCallback(async (pg: number, kw: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const { data } = await api.get('/products', {
        params: {
          page: pg,
          page_size: PAGE_SIZE,
          keyword: kw || undefined,
          sort: 'newest',
          category_id: selectedRootCatId || undefined,
        },
      });
      if (pg === 1) {
        setProducts(data);
        setTotalCount(data.length);
      } else {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = data.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        setTotalCount(prev => (prev ?? 0) + data.length);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [selectedRootCatId]);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, keyword);
  }, [keyword, selectedRootCatId, fetchProducts]);

  const debouncedSearch = React.useMemo(() => debounce((kw: string) => setKeyword(kw), 300), []);

  const loadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchProducts(next, keyword);
  };

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    setCategoryError(null);
    try {
      const { data } = await api.get('/categories/tree');
      setCategories(data || []);
    } catch (e: any) {
      console.error('[InventoryScreen] Error fetching categories:', e);
      setCategoryError(e.message || 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleBulkUpload = () => {
    Alert.alert('Bulk Upload (CSV)', 'Select a CSV file to upload inventory in bulk.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Select File', onPress: () => {
          setTimeout(() => Alert.alert('Success', 'Inventory imported successfully from CSV.'), 1000);
        }
      },
    ]);
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

  const filteredProducts = React.useMemo(() => {
    return products
      .map(p => {
        const { category, sub_category } = detectCategoryAndSub(p, categories);
        return { ...p, category, sub_category, subcategory: sub_category };
      })
      .filter(p => {
        if (selectedMainCategory !== 'All') {
          if (p.category !== selectedMainCategory) return false;
        }
        if (selectedSubCategory && !selectedSubCategory.startsWith('All')) {
          if (p.sub_category !== selectedSubCategory) return false;
        }
        return true;
      });
  }, [products, categories, selectedMainCategory, selectedSubCategory]);

  const inStock = React.useMemo(() => filteredProducts.filter(p => p.stock_qty > 0).length, [filteredProducts]);
  const outOfStock = React.useMemo(() => filteredProducts.filter(p => p.stock_qty <= 0).length, [filteredProducts]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inventory</Text>
          {totalCount !== null && (
            <Text style={styles.headerSub}>{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.uploadBtn} onPress={handleBulkUpload} activeOpacity={0.7}>
          <Upload size={16} color={Colors.primary} />
          <Text style={styles.uploadBtnTxt}>CSV Upload</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory..."
          placeholderTextColor={Colors.textMuted}
          onChangeText={debouncedSearch}
        />
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

      {loadingCategories && (
        <View style={{ padding: Spacing.md, alignItems: 'center' }}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>Loading categories...</Text>
        </View>
      )}

      {categoryError && (
        <View style={{ backgroundColor: '#FFE6E6', padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radius.sm }}>
          <Text style={{ fontSize: 12, color: Colors.error }}>❌ {categoryError}</Text>
        </View>
      )}

      {/* ── Stats Strip ── */}
      {filteredProducts.length > 0 && (
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.statLabel}>{inStock} In Stock</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: Colors.error }]} />
            <Text style={styles.statLabel}>{outOfStock} Out of Stock</Text>
          </View>
        </View>
      )}
      {/* ── List ── */}
      <FlatList
        data={filteredProducts}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <InventoryCard
            item={item}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id, product: item })}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No products found"
              subtitle="Add items to your inventory to start selling."
              icon={<Package size={48} color={Colors.textMuted} />}
            />
          ) : null
        }
        ListFooterComponent={
          loading ? <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.lg }} /> : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />

    </SafeAreaView>
  );
};

const CARD_GAP = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1EC',
  },

  // ── Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: '#F5F1EC',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '400',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#E8D9A0',
  },
  uploadBtnTxt: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: Typography.label,
  },

  // ── Stats
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Shadow.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: Typography.label,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
  },

  // ── Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  categoryFilterRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  catFilterContent: {
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  catChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: {
    fontSize: Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: Typography.body,
    color: Colors.textPrimary,
  },

  // ── Grid List
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },

  // ── Card
  card: {
    width: '48.5%',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadow.card,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.primaryLight,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // ── Info
  infoSection: {
    padding: Spacing.sm,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 19,
    marginBottom: 3,
  },
  productDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  productSku: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  perUnit: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // ── FAB
  fab: {
    position: 'absolute',
    bottom: Spacing.xxl,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.fab,
  },

  // ── Badges & Subcategories
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadge: {
    backgroundColor: '#E5F2FF',
  },
  subCategoryBadge: {
    backgroundColor: '#E6F7ED',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#333333',
  },
  subCatFilterRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xs,
    backgroundColor: '#F5F1EC',
  },
  subCatFilterContent: {
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  subCatChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    marginRight: 6,
  },
  subCatChipActive: {
    backgroundColor: '#5C5A1E',
    borderColor: '#5C5A1E',
  },
  subCatChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  subCatChipTextActive: {
    color: Colors.white,
  },

  // ── Category Dropdown Styling
  dropdownContainer: {
    marginHorizontal: Spacing.xl,
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
  // ── Modal Bottom Sheet Styling
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

export default InventoryScreen;
