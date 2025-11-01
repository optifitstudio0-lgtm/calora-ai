// App.js (النسخة النهائية والمحسنة)

import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import 'react-native-gesture-handler';

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from './supabaseclient'; 
import * as Linking from 'expo-linking'; 

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
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

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
        supabase.auth.setSession({ access_token, refresh_token }).then(({ data }) => {
           setSession(data.session);
        });
      }
    }
  };

  useEffect(() => {
    // جلب الجلسة عند بدء تشغيل التطبيق
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // ✅ التحقق من بيانات Supabase مباشرة
      setIsOnboardingComplete(session?.user?.user_metadata?.onboarding_complete || false);
      setTimeout(() => setLoading(false), 2000); 
    });

    // الاستماع لأي تغيير في حالة تسجيل الدخول/الخروج
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // ✅ التحقق من بيانات Supabase مباشرة عند كل تغيير
      setIsOnboardingComplete(session?.user?.user_metadata?.onboarding_complete || false);
    });
    
    // التعامل مع الروابط العميقة
    const linkSubscription = Linking.addEventListener('url', (event) => handleDeepLink(event.url));
    Linking.getInitialURL().then(url => handleDeepLink(url));
    
    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  // ✅ تحديد الشاشة الابتدائية بناءً على حالة المستخدم الموثوقة من Supabase
  const getInitialRouteName = () => {
    if (session && session.user) {
      return isOnboardingComplete ? 'MainUI' : 'BasicInfo';
    }
    return 'Index';
  };

  return (
    <SafeAreaProvider>
      <View style={styles.rootContainer}>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName={getInitialRouteName()} 
            screenOptions={{ headerShown: false }}
          >
            {/* المستخدم غير مسجل دخول */}
            <Stack.Screen name="Index" component={IndexScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            
            {/* المستخدم مسجل ولكن لم يكمل الإعداد */}
            <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
            <Stack.Screen name="Measurements" component={MeasurementsScreen} />
            <Stack.Screen name="Goal" component={GoalScreen} />
            <Stack.Screen name="ActivityLevel" component={ActivityLevelScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
            
            {/* المستخدم مسجل وأكمل الإعداد */}
            <Stack.Screen name="MainUI" component={MainUI} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#fff' },
});

export default App;