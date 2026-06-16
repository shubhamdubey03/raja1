/**
 * P5-08 — Profile Screen
 * Beautiful high-fidelity premium design matching the requested Figma mockup.
 * Avatar with gold border and pencil overlay, GST/Member Tier status cards,
 * preferences list (Business Settings, Help, Security), and customized red Sign Out card.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { logout, updateProfile } from '../../store/slices/authSlice';
import api from '../../services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { useTranslation } from '../../i18n';
import { normalizeImageUrl } from '../../utils/helpers';
import {
  Settings,
  LogOut,
  ChevronRight,
  Star,
  CheckCircle2,
  Lock,
  HelpCircle,
  Edit2
} from 'lucide-react-native';

const ProfileScreen: React.FC = () => {
  const t = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);

  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/me');
      dispatch(updateProfile(data));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          dispatch(logout());
        }
      }
    ]);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch('/me', { full_name: fullName });
      dispatch(updateProfile({ full_name: data.full_name }));
      setModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.response?.data?.detail || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAvatar = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
      },
      async response => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        const asset = response.assets?.[0];
        if (!asset || !asset.uri) return;

        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || 'avatar.jpg',
          type: asset.type || 'image/jpeg',
        } as any);

        setUploadingAvatar(true);
        try {
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

          const { data } = await api.patch('/me', { avatar_url: uploadedImageUrl });
          dispatch(updateProfile({ avatar_url: data.avatar_url }));
          Alert.alert('Success', 'Profile image updated successfully');
        } catch (err: any) {
          Alert.alert(
            'Error',
            err.response?.data?.message ||
              err.response?.data?.detail ||
              'Could not upload image'
          );
        } finally {
          setUploadingAvatar(false);
        }
      }
    );
  };

  const initials = user?.full_name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const businessName =
    user?.retailer_profile?.business_name ||
    user?.vendor_profile?.business_name ||
    user?.full_name ||
    'Maitreyi Enterprise';

  const gstNumber =
    user?.retailer_profile?.gst_number ||
    user?.vendor_profile?.gst_number ||
    '27AAAAA0000A1Z5';

  const roleLabel =
    user?.role === 'retailer' ? 'Premium Retailer • Mumbai, IN' : 'Verified Vendor • India';

  const gstStatus = user?.status === 'active' || user?.is_verified ? 'Verified' : 'Pending';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatarInner}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : user?.avatar_url ? (
                <Image
                  source={{ uri: normalizeImageUrl(user.avatar_url) || undefined }}
                  style={{ width: 92, height: 92, borderRadius: 46 }}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.editPencilBtn}
              onPress={handleSelectAvatar}
              activeOpacity={0.85}>
              <Edit2 size={12} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.businessNameText}>{businessName}</Text>
          <Text style={styles.roleSubtext}>{roleLabel}</Text>
        </View>

        {/* Horizontal Status Cards Row */}
        <View style={styles.cardsRow}>
          {/* Card 1: GST Status */}
          <View style={[styles.statusCard, styles.gstCardBorder]}>
            <Text style={styles.cardHeaderLabel}>GST STATUS</Text>
            <View style={styles.statusValueRow}>
              <CheckCircle2 size={16} color={Colors.success} />
              <Text style={styles.cardStatusValue}>{gstStatus}</Text>
            </View>
            <Text style={styles.cardDetailText}>{gstNumber}</Text>
          </View>

          {/* Card 2: Member Tier */}
          <View style={[styles.statusCard, styles.tierCardBorder]}>
            <Text style={styles.cardHeaderLabel}>MEMBER TIER</Text>
            <View style={styles.statusValueRow}>
              <Star size={16} color="#E8C349" fill="#E8C349" />
              <Text style={styles.cardStatusValueBlack}>Gold Elite</Text>
            </View>
            <Text style={styles.cardDetailText}>Since June 2021</Text>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.preferencesSection}>
          <Text style={styles.preferencesHeading}>PREFERENCES</Text>

          {/* Business Settings */}
          <TouchableOpacity
            style={styles.prefItem}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}>
            <View style={styles.prefIconWrap}>
              <Settings size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefItemTitle}>Business Settings</Text>
              <Text style={styles.prefItemSub}>Manage addresses and billing</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={styles.prefItem}
            onPress={() =>
              Alert.alert('Help & Support', 'Reach our B2B Helpdesk at help@supplysetu.com')
            }
            activeOpacity={0.7}>
            <View style={styles.prefIconWrap}>
              <HelpCircle size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefItemTitle}>Help & Support</Text>
              <Text style={styles.prefItemSub}>Contact concierge & FAQs</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Security */}
          <TouchableOpacity
            style={styles.prefItem}
            onPress={() => Alert.alert('Security', 'Your account has 2FA enabled via registered mobile.')}
            activeOpacity={0.7}>
            <View style={styles.prefIconWrap}>
              <Lock size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefItemTitle}>Security</Text>
              <Text style={styles.prefItemSub}>Two-factor & privacy</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Card */}
        <TouchableOpacity style={styles.signOutCard} onPress={handleLogout} activeOpacity={0.8}>
          <View style={styles.signOutIconWrap}>
            <LogOut size={18} color={Colors.error} />
          </View>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version Footer */}
        <View style={styles.versionFooter}>
          <Text style={styles.versionLabel}>SUPPLY SETU V2.4.1</Text>
          <Text style={styles.copyrightText}>
            © 2024 Supply Setu Logistics Ltd. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Business Settings</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Owner Name</Text>
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter owner name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Read-only Business Details */}
            <View style={styles.readOnlyGroup}>
              <Text style={styles.inputLabel}>Business Name (Verified)</Text>
              <Text style={styles.readOnlyText}>{businessName}</Text>
            </View>

            <View style={styles.readOnlyGroup}>
              <Text style={styles.inputLabel}>GST Number (Verified)</Text>
              <Text style={styles.readOnlyText}>{gstNumber}</Text>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
                disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSave}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#FDF8F8', // Warm Brand Beige
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },



  // Avatar Section
  avatarContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  avatarOuter: {
    position: 'relative',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: '#E8C349', // Gold accent border
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#725B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
  },
  editPencilBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FDF8F8',
    ...Shadow.sm,
  },
  businessNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleSubtext: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Status Cards
  cardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statusCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#F0ECE5',
    ...Shadow.sm,
  },
  gstCardBorder: {
    borderLeftColor: '#725B00', // Gold/Olive accent border
  },
  tierCardBorder: {
    borderLeftColor: '#1A1A1A', // Black accent border
  },
  cardHeaderLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  statusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cardStatusValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.success,
  },
  cardStatusValueBlack: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cardDetailText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Preferences Section
  preferencesSection: {
    marginBottom: Spacing.xl,
  },
  preferencesHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  prefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: '#F2ECE8',
  },
  prefIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F6F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  prefTextWrap: {
    flex: 1,
  },
  prefItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  prefItemSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Sign Out Card
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDAD6', // Soft red background
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FFB4AB',
    marginBottom: Spacing.xl,
  },
  signOutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFECE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.error,
  },

  // Version Footer
  versionFooter: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  versionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readOnlyGroup: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.bgInput,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#ECEAE8',
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalBtn: {
    flex: 1,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default ProfileScreen;
