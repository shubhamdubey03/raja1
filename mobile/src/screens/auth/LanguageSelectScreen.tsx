/**
 * Figma PDF Page 2 — Select Language Screen
 * Step 1 of 4 in Onboarding.
 * Rebuilt to match the new 2-column grid layout, gold selection borders, and header menus.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { setLanguage } from '../../store/slices/settingsSlice';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { 
  Globe, Languages, CaseSensitive, 
  Compass, Scroll, PenTool, ArrowRight 
} from 'lucide-react-native';
import translations, { AppLanguage } from '../../i18n';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

const LANGUAGES: { id: AppLanguage; label: string; sub: string; Icon: any }[] = [
  { id: 'en', label: 'English',   sub: 'Universal',  Icon: Globe },
  { id: 'hi', label: 'Hindi',     sub: 'हिन्दी',      Icon: Languages },
  { id: 'mr', label: 'Marathi',   sub: 'मराठी',      Icon: CaseSensitive },
  { id: 'gu', label: 'Gujarati',   sub: 'ગુજરાતી',    Icon: Compass },
  { id: 'ta', label: 'Tamil',      sub: 'தமிழ்',     Icon: Scroll },
  { id: 'te', label: 'Telugu',     sub: 'తెలుగు',     Icon: PenTool },
];

const LanguageSelectScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const savedLang = useAppSelector(s => (s as any).settings?.language ?? 'en') as AppLanguage;
  const [selectedLang, setSelectedLang] = useState<AppLanguage>(savedLang);

  const t = (key: string) => {
    const dict = translations[selectedLang] ?? translations.en;
    return (dict as any)[key] ?? (translations.en as any)[key] ?? key;
  };

  const handleContinue = () => {
    dispatch(setLanguage(selectedLang));
    navigation.navigate('RoleSelect');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title & Slogan */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('selectLanguage')}</Text>
          <Text style={styles.subtitle}>
            Choose your preferred communication medium to personalize your supply chain experience.
          </Text>
        </View>

        {/* 2-Column Grid of Languages */}
        <View style={styles.grid}>
          {LANGUAGES.map(lang => {
            const isSelected = selectedLang === lang.id;
            const IconComponent = lang.Icon;

            return (
              <TouchableOpacity
                key={lang.id}
                style={[styles.card, isSelected && styles.cardActive]}
                activeOpacity={0.85}
                onPress={() => setSelectedLang(lang.id)}>
                {/* Icon wrapper */}
                <View style={[styles.iconWrap, isSelected && styles.iconWrapActive]}>
                  <IconComponent size={28} color={isSelected ? Colors.primary : Colors.textMuted} />
                </View>
                
                {/* Text Labels */}
                <Text style={[styles.cardLabel, isSelected && styles.textActive]}>
                  {lang.label}
                </Text>
                <Text style={[styles.cardSub, isSelected && styles.subActive]}>
                  {lang.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.btn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.btnText}>{t('continueBtn')}</Text>
          <ArrowRight size={18} color={Colors.white} />
        </TouchableOpacity>

        {/* Onboarding steps */}
        <Text style={styles.stepFooter}>{t('step1of4')}</Text>

        {/* Privacy Terms and Support links */}
        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>PRIVACY</Text>
          <Text style={styles.linkDot}>•</Text>
          <Text style={styles.linkLabel}>TERMS</Text>
          <Text style={styles.linkDot}>•</Text>
          <Text style={styles.linkLabel}>SUPPORT</Text>
        </View>

        <Text style={styles.copyright}>
          © 2024 Supply Setu Logistics Solutions. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF8F8', // Premium warm off-white background
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.xl,
    gap: 12,
  },
  card: {
    width: '48%', // Approx half-width with gap
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#EFEBEB',
    ...Shadow.sm,
  },
  cardActive: {
    borderColor: Colors.primary, // Gold border
    backgroundColor: '#FAF6ED', // Subtle gold tint background
  },
  iconWrap: {
    marginBottom: Spacing.sm,
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: '#FBF9F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#F3EAD3',
  },
  cardLabel: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  cardSub: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  textActive: {
    color: Colors.primary,
  },
  subActive: {
    color: Colors.primary,
  },
  btn: {
    backgroundColor: '#1E1C1C', // Dark charcoal/black continue button
    borderRadius: Radius.full,
    paddingVertical: 15,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '85%',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  btnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.body,
    letterSpacing: 0.5,
  },
  stepFooter: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.xxl,
    textTransform: 'uppercase',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  linkLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  linkDot: {
    fontSize: 8,
    color: Colors.border,
  },
  copyright: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

export default LanguageSelectScreen;
