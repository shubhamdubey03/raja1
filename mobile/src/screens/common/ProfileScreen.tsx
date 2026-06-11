/**
 * P5-08 — Profile Screen
 * View/edit profile, change mobile (re-OTP), logout, account deactivation.
 */
import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../hooks/useRedux';
import {logout, updateProfile} from '../../store/slices/authSlice';
import api from '../../services/api';
import {Button, Input, Card} from '../../components';
import {Colors, Typography, Spacing, Radius} from '../../theme';

const ProfileScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const {data} = await api.patch('/me', {full_name: name});
      dispatch(updateProfile({full_name: data.full_name}));
      setEditing(false);
      Alert.alert('Success', 'Profile updated');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not update profile');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Logout', style: 'destructive', onPress: () => {
        dispatch(logout());
        navigation.replace('RoleSelect');
      }},
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently deactivate your account. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete('/me');
            dispatch(logout());
            navigation.replace('RoleSelect');
          } catch { Alert.alert('Error', 'Could not delete account'); }
        }},
      ],
    );
  };

  const roleLabel = user?.role === 'vendor' ? '🏭 Vendor' : '🏪 Retailer';
  const initials = user?.full_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <Text style={styles.roleBadge}>{roleLabel}</Text>
          <Text style={styles.statusBadge}>{user?.status || 'active'}</Text>
        </View>

        {/* Info Card */}
        <Card>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            {editing ? (
              <Input label="" value={name} onChangeText={setName} style={{flex: 1, marginBottom: 0}} />
            ) : (
              <Text style={styles.infoVal}>{user?.full_name}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile</Text>
            <Text style={styles.infoVal}>{user?.mobile}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoVal}>{user?.role}</Text>
          </View>

          {editing ? (
            <View style={styles.editBtns}>
              <Button label="Save" onPress={handleSave} loading={saving} fullWidth={false} size="sm" />
              <Button label="Cancel" onPress={() => setEditing(false)} variant="secondary" fullWidth={false} size="sm" />
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editLink}>
              <Text style={styles.editLinkTxt}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Actions */}
        <Button label="Logout" onPress={handleLogout} variant="ghost" />
        <View style={styles.dangerZone}>
          <Text style={styles.dangerLabel}>Danger Zone</Text>
          <Button label="Delete Account" onPress={handleDeleteAccount} variant="danger" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgPrimary},
  content: {padding: Spacing.lg},
  avatarWrap: {alignItems: 'center', marginBottom: Spacing.lg, gap: Spacing.sm},
  avatar: {width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontSize: Typography.xxl, fontWeight: '800', color: Colors.white},
  roleBadge: {fontSize: Typography.sm, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full},
  statusBadge: {fontSize: Typography.xs, color: Colors.textMuted},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border},
  infoLabel: {fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '600'},
  infoVal: {fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary},
  editBtns: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md},
  editLink: {marginTop: Spacing.md},
  editLinkTxt: {color: Colors.primary, fontWeight: '600', fontSize: Typography.sm},
  dangerZone: {marginTop: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.lg},
  dangerLabel: {fontSize: Typography.sm, color: Colors.danger, fontWeight: '700', marginBottom: Spacing.md},
});

export default ProfileScreen;
