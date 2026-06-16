/**
 * Figma PDF Page 3 — Role Selection Screen
 * Step 2 of 4 in Onboarding.
 * Rebuilt to match the new vertical cards, gold labels, and custom headers.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector } from '../../hooks/useRedux';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { ArrowLeft, Store, Factory } from 'lucide-react-native';
import translations, { AppLanguage } from '../../i18n';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

const RoleSelectScreen: React.FC<Props> = ({ navigation }) => {
  const savedLang = useAppSelector(s => (s as any).settings?.language ?? 'en') as AppLanguage;
  const [selectedRole, setSelectedRole] = useState<'retailer' | 'vendor'>('retailer');

  const t = (key: string) => {
    const dict = translations[savedLang] ?? translations.en;
    return (dict as any)[key] ?? (translations.en as any)[key] ?? key;
  };

  const handleContinue = () => {
    if (selectedRole === 'retailer') {
      navigation.navigate('RetailerRegister');
    } else {
      navigation.navigate('VendorLogin');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Menu Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={22} color={Colors.textPrimary} style={styles.menuIcon} />
          </TouchableOpacity>
          <Text style={styles.headerBrand}>{t('appName')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Onboarding Tag & Title */}
        <Text style={styles.tag}>{t('onboarding')}</Text>

        {/* Welcome to the Next Era of Supply (Next Era in Italic) */}
        <Text style={styles.title}>
          Welcome to the{'\n'}
          <Text style={styles.titleItalic}>Next Era</Text> of Supply.
        </Text>

        <Text style={styles.subtitle}>{t('selectPerspective')}</Text>

        {/* Retailer Card */}
        <TouchableOpacity
          style={[styles.card, selectedRole === 'retailer' && styles.cardActive]}
          activeOpacity={0.85}
          onPress={() => setSelectedRole('retailer')}>
          <View style={styles.iconWrap}>
            <Store size={26} color={Colors.textPrimary} />
          </View>
          <Text style={[styles.cardTitle, selectedRole === 'retailer' && styles.textActive]}>
            I'm a Retailer
          </Text>
          <Text style={styles.cardDesc}>{t('retailerLongDesc')}</Text>

          <TouchableOpacity
            style={styles.cardLink}
            onPress={() => {
              setSelectedRole('retailer');
              navigation.navigate('RetailerRegister');
            }}>
            <Text style={styles.cardLinkText}>{t('exploreMarketplace')} →</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Vendor Card */}
        <TouchableOpacity
          style={[styles.card, selectedRole === 'vendor' && styles.cardActive]}
          activeOpacity={0.85}
          onPress={() => setSelectedRole('vendor')}>
          <View style={styles.iconWrap}>
            <Factory size={26} color={Colors.textPrimary} />
          </View>
          <Text style={[styles.cardTitle, selectedRole === 'vendor' && styles.textActive]}>
            I'm a Vendor
          </Text>
          <Text style={styles.cardDesc}>{t('vendorLongDesc')}</Text>

          <TouchableOpacity
            style={styles.cardLink}
            onPress={() => {
              setSelectedRole('vendor');
              navigation.navigate('VendorLogin');
            }}>
            <Text style={styles.cardLinkText}>{t('accessDashboard')} →</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Action Button */}
        <TouchableOpacity style={styles.btn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.btnText}>{t('continueJourney')}</Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('VendorLogin', { role: selectedRole })}
          style={styles.signInContainer}
          activeOpacity={0.7}>
          <Text style={styles.signInLabel}>
            Already have an account? <Text style={styles.signInLinkText}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        {/* Onboarding steps */}
        <Text style={styles.stepFooter}>{t('step2of4')}</Text>

        {/* Standard modern distribution footer text */}
        <Text style={styles.copyright}>
          {t('standardModernDist')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF8F8', // Warm off-white
  },
  topHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EDED',
    backgroundColor: Colors.white,
    marginBottom: -Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: Spacing.md,
  },
  headerBrand: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  tag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: Spacing.xs,
  },
  titleItalic: {
    fontStyle: 'italic',
    fontWeight: '400',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#EFEBEB',
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  cardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF6ED',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3EDED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.body,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardLink: {
    paddingVertical: Spacing.xs,
  },
  cardLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  textActive: {
    color: Colors.primary,
  },
  btn: {
    backgroundColor: '#000000',
    borderRadius: Radius.full,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  btnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.body,
    letterSpacing: 1,
  },
  signInContainer: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  signInLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  signInLinkText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  stepFooter: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.xl,
    textTransform: 'uppercase',
  },
  copyright: {
    fontSize: 8,
    color: Colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.8,
  },
});

export default RoleSelectScreen;
