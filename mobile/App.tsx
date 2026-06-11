import React, {useEffect, useState} from 'react';
import {StatusBar, View} from 'react-native';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import NetInfo from '@react-native-community/netinfo';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {store, persistor} from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import {OfflineBanner} from './src/components';
import {Colors} from './src/theme';

const AppContent: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsub;
  }, []);

  return (
    <View style={{flex: 1, backgroundColor: Colors.bgPrimary}}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgSecondary} />
      {!isOnline && <OfflineBanner />}
      <AppNavigator />
    </View>
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
