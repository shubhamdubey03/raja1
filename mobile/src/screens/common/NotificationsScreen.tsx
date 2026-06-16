import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import api from '../../services/api';
import {EmptyState} from '../../components';
import {Colors, Typography, Spacing, Radius, Shadow} from '../../theme';
import {ArrowLeft} from 'lucide-react-native';

const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const {data} = await api.get('/notifications', {params: {page_size: 50}});
      setNotifications(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? {...n, is_read: true} : n));
    } catch (e) { console.error(e); }
  };

  const TYPE_ICONS: Record<string, string> = {
    order: '🛍️', payment: '💳', alert: '⚠️', system: '🔔', promo: '🏷️',
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <EmptyState title="No notifications" icon="🔔" subtitle="You're all caught up!" /> : null}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
            onPress={() => markRead(item.id)}
            activeOpacity={0.85}>
            <View style={styles.notifIcon}>
              <Text style={styles.notifIconTxt}>{TYPE_ICONS[item.notification_type] || '🔔'}</Text>
            </View>
            <View style={styles.notifBody}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifMsg} numberOfLines={2}>{item.body}</Text>
              <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgPrimary},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgPrimary,
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
  list: {padding: Spacing.lg, gap: Spacing.sm},
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  notifCardUnread: {borderLeftWidth: 3, borderLeftColor: Colors.primary},
  notifIcon: {width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  notifIconTxt: {fontSize: 20},
  notifBody: {flex: 1},
  notifTitle: {fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2},
  notifMsg: {fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: 16},
  notifTime: {fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4},
  unreadDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 4},
});

export default NotificationsScreen;
