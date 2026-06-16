/**
 * P5-02 — Navigation Setup
 * Stack + Bottom Tab navigators; role-aware tree.
 * Icons: lucide-react-native (professional vector icons).
 * SafeArea: handled by react-native-safe-area-context via SafeAreaProvider in App.tsx.
 */
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppSelector } from '../hooks/useRedux';
import { Colors, Typography } from '../theme';

// Icons (professional vector, not emoji)
import {
  Home, Package, ShoppingCart, ClipboardList, User,
  BookOpen, LayoutGrid, ArrowLeft, Bell,
} from 'lucide-react-native';

// Auth screens
import SplashScreen from '../screens/auth/SplashScreen';
import LanguageSelectScreen from '../screens/auth/LanguageSelectScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import VendorLoginScreen from '../screens/auth/VendorLoginScreen';
import RetailerRegisterScreen from '../screens/auth/RetailerRegisterScreen';
import VerificationProgressScreen from '../screens/auth/VerificationProgressScreen';

// Common screens
import HomeScreen from '../screens/common/HomeScreen';
import ProductListScreen from '../screens/common/ProductListScreen';
import ProductDetailScreen from '../screens/common/ProductDetailScreen';
import CartScreen from '../screens/common/CartScreen';
import CheckoutScreen from '../screens/common/CheckoutScreen';
import OrdersScreen, { OrderConfirmationScreen } from '../screens/common/OrdersScreen';
import OrderDetailScreen from '../screens/common/OrderDetailScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';

// Vendor screens
import InventoryScreen from '../screens/vendor/InventoryScreen';

// Retailer screens
import LedgerScreen from '../screens/retailer/LedgerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Shared header back button ───────────────────────────────────
const BackButton = ({ navigation }: { navigation: any }) => (
  <TouchableOpacity
    onPress={() => navigation.goBack()}
    style={styles.backBtn}
    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    activeOpacity={0.7}>
    <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2} />
  </TouchableOpacity>
);

// ── Shared header options builder ───────────────────────────────
const headerOptions = (title: string) => ({
  headerShown: true,
  title,
  headerStyle: { backgroundColor: Colors.bgPrimary },
  headerTintColor: Colors.textPrimary,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: Typography.body },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
});

// ── Vendor Tab Navigator ────────────────────────────────────────
const VendorTab = () => (
  <Tab.Navigator
    screenOptions={{
      lazy: true,
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: styles.tabLabel,
      tabBarItemStyle: styles.tabItem,
    }}>
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: 'Supply Setu',
        tabBarLabel: 'Home',
        tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2} />,
      }}
    />
    <Tab.Screen
      name="Inventory"
      component={InventoryScreen}
      options={{
        title: 'Inventory',
        tabBarLabel: 'Inventory',
        tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} strokeWidth={2} />,
      }}
    />
    <Tab.Screen
      name="Cart"
      component={CartScreen}
      options={{
        title: 'Cart',
        tabBarLabel: 'Cart',
        tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} strokeWidth={2} />,
      }}
    />
    <Tab.Screen
      name="Orders"
      component={OrdersScreen}
      options={{
        title: 'Orders',
        tabBarLabel: 'Orders',
        tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} strokeWidth={2} />,
      }}
    />
    <Tab.Screen
      name="Ledger"
      component={LedgerScreen}
      options={{
        title: 'Ledger',
        tabBarLabel: 'Ledger',
        tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} strokeWidth={2} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        title: 'Profile',
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={2} />,
      }}
    />
  </Tab.Navigator>
);

// ── Retailer Tab Navigator ──────────────────────────────────────
const RetailerTab = () => (
  <Tab.Navigator
    screenOptions={{
      lazy: true,
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: styles.tabLabel,
      tabBarItemStyle: styles.tabItem,
    }}>
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: 'Supply Setu',
        tabBarLabel: 'Home',
        tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2} />,
      }}
    />
    <Tab.Screen
      name="Products"
      component={ProductListScreen}
      options={{
        title: 'Products',
        tabBarLabel: 'Products',
        tabBarIcon: ({ color, size }) => <Package size={size} color={color} strokeWidth={2} />,
      }}
    />
    <Tab.Screen
      name="Cart"
      component={CartScreen}
      options={{
        title: 'Cart',
        tabBarLabel: 'Cart',
        tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} strokeWidth={2} />,
      }}
    />
    <Tab.Screen
      name="Orders"
      component={OrdersScreen}
      options={{
        title: 'Orders',
        tabBarLabel: 'Orders',
        tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} strokeWidth={2} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        title: 'Profile',
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={2} />,
      }}
    />
  </Tab.Navigator>
);

// ── Root Navigator ──────────────────────────────────────────────
const RootNavigator = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { isAuthenticated, user } = useAppSelector(s => s.auth);
  const isVerified = (user as any)?.is_verified || user?.status === 'active';

  if (showSplash) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash">
          {(props) => <SplashScreen {...props} onFinish={() => setShowSplash(false)} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
          <Stack.Screen
            name="RoleSelect"
            component={RoleSelectScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="VendorLogin"
            component={VendorLoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RetailerRegister"
            component={RetailerRegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : !isVerified ? (
        <Stack.Screen name="VerificationProgress" component={VerificationProgressScreen} />
      ) : user?.role === 'vendor' ? (
        <>
          <Stack.Screen name="VendorTab" component={VendorTab} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="RetailerTab" component={RetailerTab} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

// ── App Navigator (with NavigationContainer) ────────────────────
const AppNavigator = () => (
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 88,
    paddingBottom: 24,
    paddingTop: 8,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabItem: {
    paddingVertical: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

export default AppNavigator;
