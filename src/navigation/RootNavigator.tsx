import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AddItemScreen } from '../screens/AddItemScreen';
import { DeductItemScreen } from '../screens/DeductItemScreen';
import { useStockStore } from '../store/useStockStore';
import { StockItem } from '../database/database';
import { Colors } from '../constants/theme';

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  AddItem: { item?: StockItem };
  DeductItem: { item: StockItem };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { settings, loadSettings, loadItems } = useStockStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadSettings();
      await loadItems();
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isOnboarded = settings?.onboarding_complete === 1;

  return (
    <Stack.Navigator
      initialRouteName={isOnboarded ? 'MainTabs' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.bgDark },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="DeductItem"
        component={DeductItemScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
