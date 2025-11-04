// App.js (النسخة النهائية الكاملة والمعدلة)

import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import 'react-native-gesture-handler';

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, I18nManager, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from './supabaseclient'; 
import * as Linking from 'expo-linking'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart'; 

// --- استيراد الشاشات ---
import SplashScreen from './Splash';
import IndexScreen from './Index'; 
import SignInScreen from './signin';
import SignUpScreen from './signup';
import ForgotPasswordScreen from './forgotpassword';
import EmailVerificationScreen from './emailverification';
import ResetPasswordScreen from './resetpassword';
import BasicInfoScreen from './basicinfo';
import MeasurementsScreen from './measurements';
import GoalScreen from './goal';
import ActivityLevelScreen from './activitylevel';
import ResultsScreen from './results';
import MainUI from './mainui'; 

const Stack = createStackNavigator();

const App = () => {
  const [isAppReady, setAppReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Splash');
  const [appLanguage, setAppLanguage] = useState('en');
  
  // دالة التعامل مع الروابط العميقة (للمصادقة عبر OAuth)
  const handleDeepLink = (url) => {
    if (!url) return;
    const params = url.split('#')[1];
    if (params) {
      const parsedParams = params.split('&').reduce((acc, part) => {
        const [key, value] = part.split('=');
        acc[decodeURIComponent(key)] = decodeURIComponent(value);
        return acc;
      }, {});
      const { access_token, refresh_token } = parsedParams;
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token });
      }
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // --- الخطوة 1: التحقق من اللغة وتطبيقها ---
        const savedLang = await AsyncStorage.getItem('appLanguage');
        const lang = savedLang || 'en';
        setAppLanguage(lang);
        
        const newIsRTL = lang === 'ar';
        if (newIsRTL !== I18nManager.isRTL) {
          I18nManager.forceRTL(newIsRTL);
          RNRestart.Restart();
          return; // أوقف التنفيذ لأن التطبيق سيعاد تشغيله
        }

        // --- الخطوة 2: التحقق من حالة المصادقة والإعدادات ---
        const { data: { session } } = await supabase.auth.getSession();
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        const isOnboardingComplete = session?.user?.user_metadata?.onboarding_complete || false;

        if (session && session.user) {
          setInitialRoute(isOnboardingComplete ? 'MainUI' : 'BasicInfo');
        } else if (hasSeenOnboarding === 'true') {
          setInitialRoute('SignIn');
        } else {
          setInitialRoute('Index');
        }

      } catch (e) {
        console.error("Failed to initialize app:", e);
        setInitialRoute('Index');
      } finally {
        setAppReady(true);
      }
    };

    initializeApp();

    // --- الخطوة 3: إعداد المستمعين (Listeners) ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // هذا الجزء سيعمل بعد تسجيل الدخول/الخروج
    });
    
    const linkSubscription = Linking.addEventListener('url', (event) => handleDeepLink(event.url));
    Linking.getInitialURL().then(url => handleDeepLink(url));
    
    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  if (!isAppReady) {
    // اعرض شاشة تحميل بسيطة أثناء التحقق من اللغة
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.rootContainer}>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName={initialRoute} 
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Index" component={IndexScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            
            <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
            <Stack.Screen name="Measurements" component={MeasurementsScreen} />
            <Stack.Screen name="Goal" component={GoalScreen} />
            <Stack.Screen name="ActivityLevel" component={ActivityLevelScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
            
            <Stack.Screen name="MainUI">
              {(props) => <MainUI {...props} appLanguage={appLanguage} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6FEF6',
  },
});

export default App;