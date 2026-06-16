import React, { useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { store, persistor } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme';

import OfflineScreen from './src/screens/common/OfflineScreen';
import { useNotifications } from './src/hooks/useNotifications';

const AppContent: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);

  useNotifications();

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsub;
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgPrimary }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgSecondary} />
      {isOnline ? (
        <AppNavigator />
      ) : (
        <OfflineScreen onRetry={() => setIsOnline(true)} />
      )}
    </SafeAreaView>
  );
};

const App: React.FC = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </PersistGate>
  </Provider>
);

export default App;
