/**
 * P5-02 — Navigation Setup
 * Stack + Bottom Tab navigators; role-aware tree.
 * Unauthenticated: RoleSelect → VendorLogin | RetailerRegister → OTP
 * Vendor: Home, Products, Cart, Orders, Profile
 * Retailer: Home, Products, Cart, Orders, Ledger, Profile
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useAppSelector} from '../hooks/useRedux';
import {Colors, Typography} from '../theme';

// Auth screens
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import VendorLoginScreen from '../screens/auth/VendorLoginScreen';
import RetailerRegisterScreen from '../screens/auth/RetailerRegisterScreen';

// Common screens
import HomeScreen from '../screens/common/HomeScreen';
import ProductListScreen from '../screens/common/ProductListScreen';
import ProductDetailScreen from '../screens/common/ProductDetailScreen';
import CartScreen from '../screens/common/CartScreen';
import CheckoutScreen from '../screens/common/CheckoutScreen';
import OrdersScreen, {OrderConfirmationScreen} from '../screens/common/OrdersScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';

// Retailer screens
import LedgerScreen from '../screens/retailer/LedgerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Tab Icon component ─────────────────────────────────────────
interface TabIconProps {label: string; icon: string; focused: boolean}
const TabIcon: React.FC<TabIconProps> = ({icon, focused}) => (
  <Text style={{fontSize: 22, opacity: focused ? 1 : 0.5}}>{icon}</Text>
);

// ── Vendor Tab Navigator ───────────────────────────────────────
const VendorTab = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: true,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: styles.tabLabel,
    }}>
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: 'AMB Platform',
        tabBarIcon: ({focused}) => <TabIcon icon="🏠" label="Home" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Products"
      component={ProductListScreen}
      options={{tabBarIcon: ({focused}) => <TabIcon icon="📦" label="Products" focused={focused} />}}
    />
    <Tab.Screen
      name="Cart"
      component={CartScreen}
      options={{tabBarIcon: ({focused}) => <TabIcon icon="🛒" label="Cart" focused={focused} />}}
    />
    <Tab.Screen
      name="Orders"
      component={OrdersScreen}
      options={{tabBarIcon: ({focused}) => <TabIcon icon="📋" label="Orders" focused={focused} />}}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{tabBarIcon: ({focused}) => <TabIcon icon="👤" label="Profile" focused={focused} />}}
    />
  </Tab.Navigator>
);

// ── Retailer Tab Navigator ─────────────────────────────────────
const RetailerTab = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: true,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: Colors.secondary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: styles.tabLabel,
    }}>
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: 'AMB Platform',
        tabBarIcon: ({focused}) => <TabIcon icon="🏠" label="Home" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Products"
      component={ProductListScreen}
      options={{tabBarIcon: ({focused}) => <TabIcon icon="📦" label="Products" focused={focused} />}}
    />
    <Tab.Screen
      name="Cart"
      component={CartScreen}
      options={{tabBarIcon: ({focused}) => <TabIcon icon="🛒" label="Cart" focused={focused} />}}
    />
    <Tab.Screen
      name="Orders"
      component={OrdersScreen}
      options={{tabBarIcon: ({focused}) => <TabIcon icon="📋" label="Orders" focused={focused} />}}
    />
    <Tab.Screen
      name="Ledger"
      component={LedgerScreen}
      options={{tabBarIcon: ({focused}) => <TabIcon icon="📒" label="Ledger" focused={focused} />}}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{tabBarIcon: ({focused}) => <TabIcon icon="👤" label="Profile" focused={focused} />}}
    />
  </Tab.Navigator>
);

// ── Root Navigator ─────────────────────────────────────────────
const RootNavigator = () => {
  const {isAuthenticated, user} = useAppSelector(s => s.auth);

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {!isAuthenticated ? (
        // Unauthenticated stack
        <>
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="VendorLogin" component={VendorLoginScreen} />
          <Stack.Screen name="RetailerRegister" component={RetailerRegisterScreen} />
        </>
      ) : user?.role === 'vendor' ? (
        // Vendor stack
        <>
          <Stack.Screen name="VendorTab" component={VendorTab} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{headerShown: true, title: 'Product'}} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{headerShown: true, title: 'Checkout'}} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} options={{headerShown: false}} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{headerShown: true, title: 'Notifications'}} />
        </>
      ) : (
        // Retailer stack
        <>
          <Stack.Screen name="RetailerTab" component={RetailerTab} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{headerShown: true, title: 'Product'}} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{headerShown: true, title: 'Checkout'}} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} options={{headerShown: false}} />
          <Stack.Screen name="OrderDetail" component={OrdersScreen} options={{headerShown: true, title: 'Order Detail'}} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{headerShown: true, title: 'Notifications'}} />
        </>
      )}
    </Stack.Navigator>
  );
};

// ── App Navigator (with NavigationContainer) ───────────────────
const AppNavigator = () => (
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
);

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
});

export default AppNavigator;
