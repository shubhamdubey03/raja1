/**
 * P5-16 — Order Detail Screen with Razorpay Retry Payment Flow
 * Supply Setu premium design
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import api from '../../services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { formatINR, formatDateSecure, normalizeImageUrl } from '../../utils/helpers';
import { Config } from '../../config';
import { useAppSelector } from '../../hooks/useRedux';
import { Calendar, MapPin, Package, CreditCard, ChevronRight, ArrowLeft, RotateCcw } from 'lucide-react-native';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'PENDING',           color: '#725B00', bg: '#FFF9E6' },
  confirmed:  { label: 'CONFIRMED',         color: '#1A5CB3', bg: '#E8F0FE' },
  dispatched: { label: 'PENDING SHIPMENT',  color: '#C07000', bg: '#FFF3CD' },
  delivered:  { label: 'DELIVERED',         color: '#23501D', bg: '#EAF2E8' },
  cancelled:  { label: 'CANCELLED',         color: '#BA1A1A', bg: '#FFDAD6' },
  processing: { label: 'PROCESSING',        color: '#6B7280', bg: '#F0EDEB' },
  returned:   { label: 'RETURNED',          color: '#BA1A1A', bg: '#FFDAD6' },
};

const OrderDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { orderId, order: initialOrder } = route.params;
  const [order, setOrder] = useState<any>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [returning, setReturning] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const user = useAppSelector(s => s.auth.user);

  const status = order?.status?.toLowerCase() ?? 'pending';
  const statusConf = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  const dateStr = formatDateSecure(order?.created_at);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to refresh order details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    setPaying(true);
    try {
      // 1. Initiate payment gateway transaction on backend
      const { data: paymentData } = await api.post('/payments/initiate', {
        order_id: order.id,
      });

      // 2. Trigger Razorpay Checkout UI
      const options = {
        description: `Order ${order.order_number}`,
        image: 'https://i.imgur.com/3g7urwK.png',
        currency: 'INR',
        key: Config.RAZORPAY_KEY,
        amount: order.grand_total, // in paise
        name: 'Supply Setu',
        order_id: paymentData.gateway_order_id,
        prefill: {
          contact: user?.mobile || '',
          name: user?.full_name || '',
          email: '',
        },
        theme: { color: Colors.primary },
      };

      const rzpResponse = await RazorpayCheckout.open(options);

      // 3. Verify signature on successful payment on backend
      const { data: verifyData } = await api.post('/payments/verify', {
        razorpay_order_id: rzpResponse.razorpay_order_id,
        razorpay_payment_id: rzpResponse.razorpay_payment_id,
        razorpay_signature: rzpResponse.razorpay_signature,
      });

      Alert.alert('Payment Success', 'Your payment has been successfully verified!');
      // Refresh order to reflect updated status
      fetchOrderDetails();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.description || 'Payment process was cancelled or failed.';
      Alert.alert('Payment Failed', msg);
    } finally {
      setPaying(false);
    }
  };

  const handleReturnOrder = () => {
    setShowReturnModal(true);
    setReturnReason('');
    setSelectedImage(null);
  };

  const openPicker = (type: 'camera' | 'gallery') => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as any,
      maxWidth: 800,
      maxHeight: 800,
    };

    const callback = async (response: any) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }
      const asset = response.assets?.[0];
      if (!asset || !asset.uri) return;

      setSelectedImage(asset);
    };

    if (type === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  const uploadAndReturn = async (asset: any, reason: string) => {
    setReturning(true);
    try {
      // 1. Upload image to server
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'return_image.jpg',
        type: asset.type || 'image/jpeg',
      } as any);

      const uploadRes = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data, headers) => {
          if (headers) {
            delete headers['Content-Type'];
            delete headers['content-type'];
          }
          return data;
        },
        timeout: 60000,
      });
      const uploadedImageUrl = uploadRes.data.image_url;

      // 2. Submit return request with verification image and reason
      const { data } = await api.post(`/orders/${order.id}/return`, {
        return_image_url: uploadedImageUrl,
        return_reason: reason.trim() || undefined,
      });

      setOrder(data);
      setShowReturnModal(false);
      Alert.alert('Success', 'Order return has been completed successfully!');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to request return. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setReturning(false);
    }
  };

  if (!order) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['left', 'right', 'bottom']}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Order Header info */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderNum}>#{order.order_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
              <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Calendar size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{dateStr}</Text>
          </View>
        </View>

        {/* Verification Image preview */}
        {order.return_image_url ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Return Verification Details</Text>
            <Image
              source={{ uri: normalizeImageUrl(order.return_image_url) || undefined }}
              style={styles.verificationImage}
              resizeMode="cover"
            />
            {order.return_reason ? (
              <View style={styles.reasonContainer}>
                <Text style={styles.reasonLabel}>Reason for Return</Text>
                <Text style={styles.reasonText}>{order.return_reason}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Address Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressRow}>
            <MapPin size={16} color={Colors.primary} style={styles.addressIcon} />
            <Text style={styles.addressText}>{order.delivery_address || 'No address specified'}</Text>
          </View>
        </View>

        {/* Items Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items?.map((item: any, index: number) => (
            <View key={item.id || index} style={[styles.itemRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.itemLeft}>
                  {item.product_image_url ? (
                    <Image
                      source={{ uri: normalizeImageUrl(item.product_image_url) || undefined }}
                      style={{ width: 32, height: 32, borderRadius: Radius.sm }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Package size={20} color={Colors.textSecondary} />
                  )}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.product_name || 'Product'}</Text>
                    <Text style={styles.itemSub}>
                      {item.quantity} units x {formatINR(item.unit_price)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemTotal}>{formatINR(item.line_total)}</Text>
              </View>
              
              {/* Return Policy Display */}
              <View style={{ marginLeft: 32, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 10, color: Colors.textMuted, backgroundColor: '#FAF7F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: Colors.border }}>
                  🛡️ Policy: {item.return_policy || 'No returns'}
                </Text>
                {item.return_window_days !== undefined && (
                  <Text style={{ fontSize: 10, color: Colors.textMuted, backgroundColor: '#FAF7F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: Colors.border }}>
                    ⏱️ Window: {item.return_window_days} days
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Price summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Price Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>{formatINR(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST</Text>
            <Text style={styles.summaryVal}>{formatINR(order.gst_amount)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalVal}>{formatINR(order.grand_total)}</Text>
          </View>
        </View>

        {/* Pay Now block */}
        {status === 'pending' && (
          <TouchableOpacity
            style={styles.payBtn}
            onPress={handlePayNow}
            disabled={paying}
            activeOpacity={0.8}>
            {paying ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <CreditCard size={18} color={Colors.white} />
                <Text style={styles.payBtnTxt}>Pay Now ({formatINR(order.grand_total)})</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Return Order block */}
        {status === 'delivered' && (user?.role === 'retailer' || user?.role === 'vendor') && (
          <TouchableOpacity
            style={styles.returnBtn}
            onPress={handleReturnOrder}
            disabled={returning}
            activeOpacity={0.8}>
            {returning ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <RotateCcw size={18} color={Colors.white} />
                <Text style={styles.returnBtnTxt}>Return Items</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Return Request Modal */}
      <Modal
        visible={showReturnModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReturnModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Product Return</Text>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Reason / Message</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Describe reason for return (e.g. Damaged products, wrong item)..."
                placeholderTextColor={Colors.textMuted}
                multiline={true}
                numberOfLines={3}
                value={returnReason}
                onChangeText={setReturnReason}
              />

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Verification Photo (Mandatory)</Text>
              
              {selectedImage ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.changeImageBtn}
                    onPress={() => {
                      Alert.alert(
                        'Change Verification Image',
                        'Please capture or choose an image.',
                        [
                          { text: 'Take Photo', onPress: () => openPicker('camera') },
                          { text: 'Choose from Gallery', onPress: () => openPicker('gallery') },
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                    }}>
                    <Text style={styles.changeImageBtnText}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadButtonsRow}>
                  <TouchableOpacity
                    style={styles.uploadIconButton}
                    onPress={() => openPicker('camera')}>
                    <Text style={styles.uploadIconText}>📸 Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.uploadIconButton}
                    onPress={() => openPicker('gallery')}>
                    <Text style={styles.uploadIconText}>🖼️ Choose Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => setShowReturnModal(false)}
                disabled={returning}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.submitModalBtn,
                  (!selectedImage || returning) && styles.disabledModalBtn
                ]}
                onPress={() => selectedImage && uploadAndReturn(selectedImage, returnReason)}
                disabled={!selectedImage || returning}>
                {returning ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.submitModalBtnText}>Submit Return</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1EC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#F5F1EC',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F1EC' },
  content: { padding: Spacing.md, gap: Spacing.md },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  orderNum: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  metaText: { fontSize: Typography.caption, color: Colors.textMuted },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  addressIcon: { marginTop: 2 },
  addressText: { fontSize: Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F0EBE6' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: Typography.caption, fontWeight: '700', color: Colors.textPrimary },
  itemSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  itemTotal: { fontSize: Typography.caption, fontWeight: '700', color: Colors.textPrimary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: Typography.caption, color: Colors.textSecondary },
  summaryVal: { fontSize: Typography.caption, fontWeight: '600', color: Colors.textPrimary },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 6, paddingTop: 10 },
  grandTotalLabel: { fontSize: Typography.body, fontWeight: '800', color: Colors.textPrimary },
  grandTotalVal: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    ...Shadow.md,
  },
  payBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: Typography.body },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#BA1A1A',
    borderRadius: Radius.md,
    paddingVertical: 14,
    ...Shadow.md,
  },
  returnBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: Typography.body },
  verificationImage: {
    width: '100%',
    height: 180,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  reasonContainer: {
    marginTop: Spacing.sm,
    backgroundColor: '#FAF7F5',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#BA1A1A',
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BA1A1A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: Typography.caption,
    color: Colors.textPrimary,
    marginTop: 2,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.bgCard,
    width: '100%',
    borderRadius: Radius.md,
    padding: Spacing.md,
    maxHeight: '80%',
    ...Shadow.md,
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalBody: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: Typography.caption,
    backgroundColor: '#FAF7F5',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  uploadIconButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F5',
  },
  uploadIconText: {
    color: Colors.primary,
    fontSize: Typography.caption,
    fontWeight: '700',
  },
  previewContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: Radius.sm,
    objectFit: 'cover',
  },
  changeImageBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
  },
  changeImageBtnText: {
    color: Colors.primary,
    fontSize: Typography.caption,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  cancelModalBtn: {
    backgroundColor: Colors.bgSecondary,
  },
  cancelModalBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: Typography.caption,
  },
  submitModalBtn: {
    backgroundColor: '#BA1A1A',
  },
  disabledModalBtn: {
    backgroundColor: '#E5DED9',
  },
  submitModalBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.caption,
  },
});

export default OrderDetailScreen;
