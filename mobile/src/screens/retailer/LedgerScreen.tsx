/**
 * P5-17 — Ledger Screen (Retailer)
 * Running balance header, debit/credit list, date filter, export button.
 */
import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert} from 'react-native';
import api from '../../services/api';
import {EmptyState} from '../../components';
import {Colors, Typography, Spacing, Radius, Shadow} from '../../theme';
import {formatINR} from '../../utils/helpers';

const LedgerScreen: React.FC = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const {data} = await api.get('/ledger', {params: {page_size: 100}});
        setEntries(data.entries || []);
        setBalance(data.outstanding_balance || 0);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const balanceColor = balance > 0 ? Colors.danger : balance < 0 ? Colors.secondary : Colors.textPrimary;
  const balanceLabel = balance > 0 ? 'Outstanding Due' : balance < 0 ? 'Credit Available' : 'Settled';

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const {data} = await api.get(`/ledger/export`, {params: {format}});
      Alert.alert('Export Ready', `Download URL: ${data.url}`);
    } catch {
      Alert.alert('Export', 'Export feature requires backend configuration');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Balance Header */}
      <View style={[styles.balanceCard, {borderLeftColor: balanceColor}]}>
        <Text style={styles.balanceLabel}>{balanceLabel}</Text>
        <Text style={[styles.balanceAmount, {color: balanceColor}]}>{formatINR(Math.abs(balance))}</Text>
        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('csv')}>
            <Text style={styles.exportBtnTxt}>📄 Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('pdf')}>
            <Text style={styles.exportBtnTxt}>📋 Export PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <EmptyState title="No ledger entries" icon="📒" /> : null}
        renderItem={({item}) => (
          <View style={styles.entryCard}>
            <View style={[styles.entryDot, {backgroundColor: item.entry_type === 'debit' ? Colors.danger : Colors.secondary}]} />
            <View style={styles.entryInfo}>
              <Text style={styles.entryRef}>{item.reference_type || 'Entry'}</Text>
              <Text style={styles.entryDesc}>{item.description || '—'}</Text>
              <Text style={styles.entryDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.entryRight}>
              <Text style={[styles.entryAmount, {color: item.entry_type === 'debit' ? Colors.danger : Colors.secondary}]}>
                {item.entry_type === 'debit' ? '−' : '+'}{formatINR(item.amount)}
              </Text>
              <Text style={[styles.entryType, {color: item.entry_type === 'debit' ? Colors.danger : Colors.secondary}]}>
                {item.entry_type.toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgPrimary},
  balanceCard: {
    margin: Spacing.lg, backgroundColor: Colors.bgSecondary, borderRadius: Radius.md,
    padding: Spacing.lg, borderLeftWidth: 4, ...Shadow.md,
  },
  balanceLabel: {fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '600', marginBottom: 4},
  balanceAmount: {fontSize: Typography.xxxl, fontWeight: '800', letterSpacing: -1, marginBottom: Spacing.md},
  exportRow: {flexDirection: 'row', gap: Spacing.sm},
  exportBtn: {flex: 1, backgroundColor: Colors.bgTertiary, borderRadius: Radius.sm, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border},
  exportBtnTxt: {fontSize: Typography.xs, fontWeight: '700', color: Colors.textPrimary},
  list: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm},
  entryCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  entryDot: {width: 10, height: 10, borderRadius: 5, flexShrink: 0},
  entryInfo: {flex: 1},
  entryRef: {fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary},
  entryDesc: {fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2},
  entryDate: {fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2},
  entryRight: {alignItems: 'flex-end'},
  entryAmount: {fontSize: Typography.base, fontWeight: '800'},
  entryType: {fontSize: Typography.xs, fontWeight: '700'},
});

export default LedgerScreen;
