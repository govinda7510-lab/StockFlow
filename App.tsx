import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, I18nManager } from 'react-native';

// Initialize i18n before anything else
import './src/localization/i18n';

import { initDatabase } from './src/database/database';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Colors } from './src/constants/theme';
import { useStockStore } from './src/store/useStockStore';
import { isRTL } from './src/localization/i18n';

const AppContent: React.FC = () => {
  const { settings } = useStockStore();

  useEffect(() => {
    // Apply RTL layout direction based on saved language
    if (settings?.language) {
      const rtl = isRTL(settings.language);
      if (I18nManager.isRTL !== rtl) {
        I18nManager.forceRTL(rtl);
        // Note: RTL change requires app restart to take full effect
      }
    }
  }, [settings?.language]);

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={Colors.bgDark} />
      <RootNavigator />
    </NavigationContainer>
  );
};

export default function App() {
  useEffect(() => {
    // Initialize database on app start
    initDatabase().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppContent />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
});
