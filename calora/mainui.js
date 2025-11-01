// mainui.js (الكود الكامل بعد الإصلاح)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, Dimensions, Image, Platform, TextInput, FlatList, ActivityIndicator, Alert, Modal, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSequence, withDelay, useAnimatedProps } from 'react-native-reanimated';
import * as Progress from 'react-native-progress';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStackNavigator } from '@react-navigation/stack';
import Svg, { Path, Circle } from 'react-native-svg';
import { Pedometer } from 'expo-sensors';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

// --- Screen Imports ---
import ProfileScreen from './profile';
import CameraScreen from './camera';
import WorkoutLogScreen from './workoutlog';
import WaterScreen from './watertracker';
import WeightScreen from './weighttracker';
import StepsScreen from './steps';
import ReportsScreen from './reports';
import FoodLogDetailScreen from './foodlogdetail';
import { searchEgyptianFoodsWithImages, supabase } from './supabaseclient';

// --- استيراد الشاشات الحقيقية من ملفاتك ---
import EditProfileScreen from './editprofile';
import SettingsScreen from './setting'; // تم التأكد من اسم الملف
import AboutScreen from './about';
// -------------------------------------------


// --- START: تعريف مهمة الخلفية ---
const STEPS_NOTIFICATION_TASK = 'steps-notification-task';

TaskManager.defineTask(STEPS_NOTIFICATION_TASK, async () => {
    try {
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const settingsRaw = await AsyncStorage.getItem('reminderSettings');
        const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
        
        if (!settings.stepsGoal) {
            return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        const todaySentKey = `@steps_goal_sent_${start.toISOString().slice(0, 10)}`;
        const hasSentToday = await AsyncStorage.getItem(todaySentKey);
        if (hasSentToday) {
            return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        const savedGoal = await AsyncStorage.getItem('stepsGoal');
        const goal = savedGoal ? parseInt(savedGoal, 10) : 10000;
        const { steps } = await Pedometer.getStepCountAsync(start, end);

        if (steps >= goal) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "🎉 هدف الخطوات مكتمل!",
                    body: `رائع! لقد حققت هدفك اليومي وهو ${goal.toLocaleString()} خطوة.`,
                    sound: true,
                },
                trigger: null,
            });
            await AsyncStorage.setItem(todaySentKey, 'true');
            return BackgroundFetch.BackgroundFetchResult.NewData;
        }
        
        return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
        console.error("Error in background task:", error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});
// --- END: نهاية تعريف مهمة الخلفية ---

const lightTheme = {
    primary: '#388E3C', background: '#E8F5E9', card: '#FFFFFF', textPrimary: '#212121', textSecondary: '#757575', progressUnfilled: '#D6EAD7', disabled: '#BDBDBD', carbs: '#007BFF', protein: '#FF7043', fat: '#FFC107', fiber: '#4CAF50', sugar: '#9C27B0', sodium: '#2196F3', overLimit: '#D32F2F', tabBarBackground: '#FFFFFF', tabBarIndicator: '#4CAF50', tabBarIcon: '#222327', white: '#FFFFFF', readOnlyBanner: '#FFA000', indicatorDot: '#1B5E20', statusBar: 'dark-content',
};
const darkTheme = {
    primary: '#66BB6A', background: '#121212', card: '#1E1E1E', textPrimary: '#FFFFFF', textSecondary: '#B0B0B0', progressUnfilled: '#2C2C2C', disabled: '#424242', carbs: '#42A5F5', protein: '#FF8A65', fat: '#FFCA28', fiber: '#81C784', sugar: '#BA68C8', sodium: '#64B5F6', overLimit: '#EF9A9A', tabBarBackground: '#1E1E1E', tabBarIndicator: '#81C784', tabBarIcon: '#E0E0E0', white: '#FFFFFF', readOnlyBanner: '#D48604', indicatorDot: '#A5D6A7', statusBar: 'light-content',
};
const translations = {
    ar: {
        remainingCalories: 'سعر حراري متبقي', readOnlyBanner: 'أنت تعرض يوماً سابقاً. السجل للقراءة فقط.', mealSectionsTitle: 'أقسام الوجبات', mealSectionsDesc: 'هذا هو السجل التفصيلي لليوم.', breakfast: 'الفطور', lunch: 'الغداء', dinner: 'العشاء', snacks: 'وجبات خفيفة', add_to_meal: '+ أضف إلى {meal}', protein: 'بروتين', carbs: 'كربوهيدرات', fat: 'دهون', fiber: 'ألياف', sugar: 'سكر', sodium: 'صوديوم', g_unit: 'جم', mg_unit: 'مجم', kcal_unit: 'kcal', weight: 'الوزن', water: 'الماء', workouts: 'التمارين', steps: 'الخطوات', not_logged: 'لم يسجل', unsupported: 'غير مدعوم', kg_unit: 'كجم', burned_cal: 'سعر حراري', goal: 'الهدف: ', dailyLogTitle: 'سجل وجبات اليوم', add_to: 'إضافة إلى', search_placeholder: 'ابحث عن كشري، ملوخية، تفاح...', no_results: 'لا توجد نتائج بحث.', local_food: 'أكلة محلية 🇪🇬', error: 'خطأ', search_error_msg: 'الرجاء إدخال اسم طعام للبحث.', fetch_error_msg: 'حدث خطأ أثناء جلب تفاصيل الطعام.', save_error_msg: 'حدث خطأ أثناء حفظ البيانات.', diaryTab: 'يومياتي', reportsTab: 'تقارير', cameraTab: 'كاميرا', profileTab: 'حسابي', weightTrackerTitle: 'تتبع الوزن', waterTrackerTitle: 'تتبع الماء', workoutLogTitle: 'سجل التمارين', stepsReportTitle: 'تقرير الخطوات', foodLogDetailTitle: 'تفاصيل سجل الوجبات', weekdays: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'], p_macro: 'ب: ', c_macro: 'ك: ', f_macro: 'د: ', fib_macro: 'أ: ', sug_macro: 'س: ', sod_macro: 'ص: ',
        editProfile: 'تعديل الملف الشخصي', settings: 'الإعدادات', about: 'حول التطبيق',
    },
    en: {
        remainingCalories: 'Calories Remaining', readOnlyBanner: "You are viewing a past day. The log is read-only.", mealSectionsTitle: 'Meal Sections', mealSectionsDesc: 'This is the detailed log for the day.', breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks', add_to_meal: '+ Add to {meal}', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fiber: 'Fiber', sugar: 'Sugar', sodium: 'Sodium', g_unit: 'g', mg_unit: 'mg', kcal_unit: 'kcal', weight: 'Weight', water: 'Water', workouts: 'Workouts', steps: 'Steps', not_logged: 'Not logged', unsupported: 'Unsupported', kg_unit: 'kg', burned_cal: 'calories', goal: 'Goal: ', dailyLogTitle: "Today's Food Log", add_to: 'Add to', search_placeholder: 'Search for koshari, molokhia, apple...', no_results: 'No search results found.', local_food: 'Local Food 🇪🇬', error: 'Error', search_error_msg: 'Please enter a food name to search.', fetch_error_msg: 'An error occurred while fetching food details.', save_error_msg: 'An error occurred while saving data.', diaryTab: 'Diary', reportsTab: 'Reports', cameraTab: 'Camera', profileTab: 'Profile', weightTrackerTitle: 'Weight Tracker', waterTrackerTitle: 'Water Tracker', workoutLogTitle: 'Workout Log', stepsReportTitle: 'Steps Report', foodLogDetailTitle: 'Food Log Details', weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], p_macro: 'P: ', c_macro: 'C: ', f_macro: 'F: ', fib_macro: 'Fib: ', sug_macro: 'Sug: ', sod_macro: 'Sod: ',
        editProfile: 'Edit Profile', settings: 'Settings', about: 'About',
    }
};
const SPOONACULAR_API_KEY = '8752a2c73388456888fef7aac64bcba6';
const NUTRIENT_GOALS = { fiber: 30, sugar: 50, sodium: 2300 };
const EMPTY_DAY_DATA = { food: 0, exercise: 0, breakfast: [], lunch: [], dinner: [], snacks: [], water: 0, weight: 0, exercises: [] };

const describeArc = (x, y, radius, startAngle, endAngle) => { 'worklet'; const clampedEndAngle = Math.min(endAngle, 359.999); const start = { x: x + radius * Math.cos((startAngle - 90) * Math.PI / 180.0), y: y + radius * Math.sin((startAngle - 90) * Math.PI / 180.0), }; const end = { x: x + radius * Math.cos((clampedEndAngle - 90) * Math.PI / 180.0), y: y + radius * Math.sin((clampedEndAngle - 90) * Math.PI / 180.0), }; const largeArcFlag = clampedEndAngle - startAngle <= 180 ? '0' : '1'; const d = ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y,].join(' '); return d; };

const LeafAnimation = ({ trigger }) => { const opacity = useSharedValue(0); const translateY = useSharedValue(-20); const rotate = useSharedValue(0); useEffect(() => { opacity.value = 0; translateY.value = -20; rotate.value = Math.random() > 0.5 ? -10 : 10; opacity.value = withSequence(withTiming(0.7, { duration: 400 }), withDelay(800, withTiming(0, { duration: 600 }))); translateY.value = withTiming(70, { duration: 2200 }); rotate.value = withTiming(rotate.value > 0 ? 25 : -25, { duration: 2200 }); }, [trigger]); const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }, { rotateZ: `${rotate.value}deg` }], })); return (<Animated.View style={[styles.leafAnimationContainer, animatedStyle]}><Image source={require('./assets/leafbar.png')} style={styles.leafImage} /></Animated.View>); };
const calculateMacroGoals = (totalCalories) => { const caloriesPerGram = { protein: 4, carbs: 4, fat: 9 }; const macroSplit = { protein: 0.30, carbs: 0.40, fat: 0.30 }; return { protein: Math.round((totalCalories * macroSplit.protein) / caloriesPerGram.protein), carbs: Math.round((totalCalories * macroSplit.carbs) / caloriesPerGram.carbs), fat: Math.round((totalCalories * macroSplit.fat) / caloriesPerGram.fat), }; };
const formatDateKey = (date) => { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
const AnimatedPath = Animated.createAnimatedComponent(Path);
async function registerForPushNotificationsAsync() { if (Platform.OS === 'android') { await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C', }); } if (Device.isDevice) { const { status: existingStatus } = await Notifications.getPermissionsAsync(); let finalStatus = existingStatus; if (existingStatus !== 'granted') { const { status } = await Notifications.requestPermissionsAsync(); finalStatus = status; } if (finalStatus !== 'granted') { console.log('User did not grant notification permissions.'); return; } } else { console.log('Must use physical device for Push Notifications'); } }

const DateNavigator = ({ selectedDate, onDateSelect, referenceToday, theme, t, isRTL, language }) => {
    const handlePrevWeek = () => { const newDate = new Date(selectedDate); newDate.setDate(selectedDate.getDate() - 7); onDateSelect(newDate); };
    const handleNextWeek = () => { const newDate = new Date(selectedDate); newDate.setDate(selectedDate.getDate() + 7); onDateSelect(newDate); };
    const weekDays = t('weekdays'); const dates = []; const dayIndex = selectedDate.getDay(); const startDate = new Date(selectedDate); startDate.setDate(selectedDate.getDate() - dayIndex); startDate.setHours(0, 0, 0, 0); for (let i = 0; i < 7; i++) { const date = new Date(startDate); date.setDate(startDate.getDate() + i); dates.push(date); }
    const isSelected = (date) => date.toDateString() === selectedDate.toDateString(); const monthYearString = selectedDate.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' }); const todayWeekStart = new Date(referenceToday); todayWeekStart.setDate(referenceToday.getDate() - referenceToday.getDay()); todayWeekStart.setHours(0, 0, 0, 0); const isNextDisabled = startDate.getTime() >= todayWeekStart.getTime();
    return ( <View style={styles.dateNavContainer(theme)}><View style={styles.dateNavHeader(isRTL)}><TouchableOpacity onPress={isRTL ? handlePrevWeek : handleNextWeek} style={styles.arrowButton} disabled={!isRTL && isNextDisabled} ><Ionicons name="chevron-back-outline" size={24} color={!isRTL && isNextDisabled ? theme.disabled : theme.primary} /></TouchableOpacity><Text style={styles.dateNavMonthText(theme)}>{monthYearString}</Text><TouchableOpacity onPress={isRTL ? handleNextWeek : handlePrevWeek} style={styles.arrowButton} disabled={isRTL && isNextDisabled} ><Ionicons name="chevron-forward-outline" size={24} color={isRTL && isNextDisabled ? theme.disabled : theme.primary} /></TouchableOpacity></View><View style={styles.weekContainer(isRTL)}>{weekDays.map((day, index) => <Text key={index} style={styles.weekDayText(theme)}>{day}</Text>)}</View><View style={styles.datesContainer(isRTL)}>{dates.map((date, index) => { const normalizedDate = new Date(date); normalizedDate.setHours(0, 0, 0, 0); const isFutureDate = normalizedDate > referenceToday; return ( <TouchableOpacity key={index} onPress={() => onDateSelect(date)} disabled={isFutureDate}><View style={[ styles.dateCircle, isSelected(date) ? styles.activeCircle(theme) : styles.inactiveCircle(theme) ]}><Text style={[styles.dateText(theme), isSelected(date) && styles.activeText(theme), isFutureDate && styles.disabledDateText(theme)]}>{date.getDate()}</Text></View></TouchableOpacity> ); })}</View></View> );
};

const SummaryCard = ({ data, dailyGoal, theme, t }) => { const SIZE = Dimensions.get('window').width * 0.5; const STROKE_WIDTH = 18; const INDICATOR_SIZE = 24; const RADIUS = SIZE / 2; const CENTER_RADIUS = RADIUS - STROKE_WIDTH / 2; const remaining = Math.round(dailyGoal - data.food + (data.exercise || 0)); const progressValue = dailyGoal > 0 ? Math.min(data.food / dailyGoal, 1) : 0; const animatedProgress = useSharedValue(0); useEffect(() => { animatedProgress.value = withTiming(progressValue, { duration: 1000 }); }, [progressValue]); const animatedPathProps = useAnimatedProps(() => { const angle = animatedProgress.value * 360; if (angle < 0.1) { return { d: '' }; } return { d: describeArc(SIZE / 2, SIZE / 2, CENTER_RADIUS, 0, angle), }; }); const indicatorAnimatedStyle = useAnimatedStyle(() => { const angleRad = (animatedProgress.value * 360 - 90) * (Math.PI / 180); const x = (SIZE / 2) + CENTER_RADIUS * Math.cos(angleRad); const y = (SIZE / 2) + CENTER_RADIUS * Math.sin(angleRad); return { transform: [{ translateX: x }, { translateY: y }], }; }); return (<View style={[styles.card(theme), { alignItems: 'center' }]}><View style={[styles.summaryCircleContainer, { width: SIZE, height: SIZE }]}><Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}><Circle cx={SIZE / 2} cy={SIZE / 2} r={CENTER_RADIUS} stroke={theme.progressUnfilled} strokeWidth={STROKE_WIDTH} fill="transparent" /><AnimatedPath animatedProps={animatedPathProps} stroke={theme.primary} strokeWidth={STROKE_WIDTH} fill="transparent" strokeLinecap="round" /></Svg><Animated.View style={[styles.progressIndicatorDot(theme), { width: INDICATOR_SIZE, height: INDICATOR_SIZE, borderRadius: INDICATOR_SIZE / 2, marginLeft: -(INDICATOR_SIZE / 2), marginTop: -(INDICATOR_SIZE / 2), }, indicatorAnimatedStyle]} /><View style={styles.summaryTextContainer}><Text style={styles.remainingCaloriesText(theme)}>{remaining}</Text><Text style={styles.remainingLabel(theme)}>{t('remainingCalories')}</Text></View></View></View>); };
const NutrientRow = ({ label, consumed, goal, color, unit = 'جم', isLimit = false, theme, isRTL }) => { const isOverLimit = isLimit && consumed > goal; const progressColor = isOverLimit ? theme.overLimit : color; return (<View style={styles.nutrientRowContainer}><View style={styles.nutrientRowHeader(isRTL)}><Text style={styles.nutrientRowLabel(theme)}>{label}</Text><Text style={styles.nutrientRowValue(theme)}>{Math.round(consumed)} / {goal} {unit}</Text></View><Progress.Bar progress={goal > 0 ? consumed / goal : 0} width={null} color={progressColor} unfilledColor={`${progressColor}30`} borderWidth={0} height={8} borderRadius={4} /></View>); };
const NutrientSummaryCard = ({ data, theme, t, isRTL }) => { const nutrients = [{ label: t('protein'), consumed: data.protein.consumed, goal: data.protein.goal, color: theme.protein, unit: t('g_unit') }, { label: t('carbs'), consumed: data.carbs.consumed, goal: data.carbs.goal, color: theme.carbs, unit: t('g_unit') }, { label: t('fat'), consumed: data.fat.consumed, goal: data.fat.goal, color: theme.fat, unit: t('g_unit') }, { label: t('fiber'), consumed: data.fiber.consumed, goal: data.fiber.goal, color: theme.fiber, unit: t('g_unit') }, { label: t('sugar'), consumed: data.sugar.consumed, goal: data.sugar.goal, color: theme.sugar, unit: t('g_unit'), isLimit: true }, { label: t('sodium'), consumed: data.sodium.consumed, goal: data.sodium.goal, color: theme.sodium, unit: t('mg_unit'), isLimit: true },]; return (<View style={styles.card(theme)}>{nutrients.map((nutrient, index) => (<NutrientRow key={index} {...nutrient} theme={theme} isRTL={isRTL} />))}</View>); };
const FoodLogItem = ({ item, theme, t, isRTL, showMacros = true }) => { let imageSource = null; if (item.capturedImageUri) { imageSource = { uri: item.capturedImageUri }; } else if (item.image && (item.image.startsWith('http') || item.image.startsWith('data:'))) { imageSource = { uri: item.image }; } else if (item.image) { imageSource = { uri: `https://spoonacular.com/cdn/ingredients_100x100/${item.image}` }; } return (<View style={styles.foodLogItemContainer(theme, isRTL)}>{imageSource ? (<Image source={imageSource} style={styles.foodLogItemImage(isRTL)} />) : (<View style={styles.foodLogItemImagePlaceholder(theme, isRTL)}><Ionicons name="restaurant-outline" size={24} color={theme.primary} /></View>)}<View style={styles.foodLogItemDetails}><View style={styles.foodLogItemHeader(isRTL)}><Text style={styles.foodLogItemName(theme, isRTL)} numberOfLines={1}>{item.name}</Text><Text style={styles.foodLogItemCalories(theme, isRTL)}>{Math.round(item.calories)} {t('kcal_unit')}</Text></View>{showMacros && (<View style={styles.foodLogItemMacros(isRTL)}><Text style={styles.macroText(theme, isRTL)}><Text style={{ color: theme.protein }}>{t('p_macro')}</Text>{Math.round(item.p || 0)}g</Text><Text style={styles.macroText(theme, isRTL)}><Text style={{ color: theme.carbs }}>{t('c_macro')}</Text>{Math.round(item.c || 0)}g</Text><Text style={styles.macroText(theme, isRTL)}><Text style={{ color: theme.fat }}>{t('f_macro')}</Text>{Math.round(item.f || 0)}g</Text><Text style={styles.macroText(theme, isRTL)}><Text style={{ color: theme.fiber }}>{t('fib_macro')}</Text>{Math.round(item.fib || 0)}g</Text><Text style={styles.macroText(theme, isRTL)}><Text style={{ color: theme.sugar }}>{t('sug_macro')}</Text>{Math.round(item.sug || 0)}g</Text><Text style={styles.macroText(theme, isRTL)}><Text style={{ color: theme.sodium }}>{t('sod_macro')}</Text>{Math.round(item.sod || 0)}mg</Text></View>)}</View></View>); };
const DailyFoodLog = ({ items, onPress, theme, t, isRTL }) => { const isEmpty = !items || items.length === 0; const MAX_PREVIEW_IMAGES = 4; const getImageSource = (item) => { if (item.capturedImageUri) return { uri: item.capturedImageUri }; if (item.image && (item.image.startsWith('http') || item.image.startsWith('data:'))) return { uri: item.image }; if (item.image) return { uri: `https://spoonacular.com/cdn/ingredients_100x100/${item.image}` }; return null; }; return (<TouchableOpacity onPress={onPress} activeOpacity={0.8}><View style={[styles.card(theme), styles.dailyLogCard]}><View style={styles.dailyLogContentContainer(isRTL)}><Text style={styles.sectionTitle(theme, isRTL)}>{t('dailyLogTitle')}</Text><View style={styles.dailyLogLeftContainer(isRTL)}>{!isEmpty ? (<View style={styles.foodPreviewContainer(isRTL)}>{items.length > MAX_PREVIEW_IMAGES && (<View style={[styles.previewCounterCircle(theme), { zIndex: 0 }]}><Text style={styles.previewCounterText(theme)}>+{items.length - MAX_PREVIEW_IMAGES}</Text></View>)}{items.slice(0, MAX_PREVIEW_IMAGES).map((item, index) => { const imageSource = getImageSource(item); const zIndex = MAX_PREVIEW_IMAGES - index; const marginStyle = isRTL ? { marginRight: -18, zIndex } : { marginLeft: -18, zIndex }; return imageSource ? (<Image key={`${item.id}-${index}`} source={imageSource} style={[styles.previewImage(theme), marginStyle]} />) : (<View key={`${item.id}-${index}`} style={[styles.previewImage(theme), styles.previewImagePlaceholder(theme), marginStyle]}><Ionicons name="restaurant-outline" size={16} color={theme.primary} /></View>); })}</View>) : (<Ionicons name={isRTL ? "chevron-back-outline" : "chevron-forward-outline"} size={24} color={theme.textSecondary} />)}</View></View></View></TouchableOpacity>); };
const MealLoggingSection = ({ title, iconName, items, onAddPress, mealKey, isEditable, theme, t, isRTL }) => { const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0); const totalMacros = items.reduce((totals, item) => { totals.p += item.p || 0; totals.c += item.c || 0; totals.f += item.f || 0; totals.fib += item.fib || 0; totals.sug += item.sug || 0; totals.sod += item.sod || 0; return totals; }, { p: 0, c: 0, f: 0, fib: 0, sug: 0, sod: 0 }); return (<View style={styles.card(theme)}><View style={styles.mealSectionHeader(isRTL)}><View style={styles.mealSectionHeaderLeft(isRTL)}><Ionicons name={iconName} size={24} color={theme.primary} style={styles.mealIcon(isRTL)} /><Text style={styles.mealSectionTitle(theme)}>{title}</Text></View><Text style={styles.mealSectionTotalCalories(theme)}>{Math.round(totalCalories)} {t('kcal_unit')}</Text></View>{items && items.length > 0 && items.map((item, index) => (<FoodLogItem key={`${item.id}-${index}`} item={item} showMacros={false} theme={theme} t={t} isRTL={isRTL} />))}{items && items.length > 0 && (<View style={styles.mealMacrosContainer(theme, isRTL)}><View style={styles.macroSummaryItem(isRTL)}><Text style={styles.macroSummaryText(theme)}>{t('fat')}: {Math.round(totalMacros.f)} {t('g_unit')}</Text></View><View style={styles.macroSummaryItem(isRTL)}><Text style={styles.macroSummaryText(theme)}>{t('carbs')}: {Math.round(totalMacros.c)} {t('g_unit')}</Text></View><View style={styles.macroSummaryItem(isRTL)}><Text style={styles.macroSummaryText(theme)}>{t('protein')}: {Math.round(totalMacros.p)} {t('g_unit')}</Text></View><View style={styles.macroSummaryItem(isRTL)}><Text style={styles.macroSummaryText(theme)}>{t('sugar')}: {Math.round(totalMacros.sug)} {t('g_unit')}</Text></View><View style={styles.macroSummaryItem(isRTL)}><Text style={styles.macroSummaryText(theme)}>{t('fiber')}: {Math.round(totalMacros.fib)} {t('g_unit')}</Text></View><View style={styles.macroSummaryItem(isRTL)}><Text style={styles.macroSummaryText(theme)}>{t('sodium')}: {Math.round(totalMacros.sod)} {t('mg_unit')}</Text></View></View>)}<TouchableOpacity style={[styles.smartAddButton(theme), !isEditable && styles.disabledButton(theme)]} onPress={() => onAddPress(mealKey)} disabled={!isEditable} ><Text style={styles.smartAddButtonText(theme)}>{t('add_to_meal', {meal: title})}</Text></TouchableOpacity></View>); };
const AddFoodModal = ({ visible, onClose, onFoodSelect, mealKey, theme, t, isRTL }) => { const [query, setQuery] = useState(''); const [results, setResults] = useState([]); const [loading, setLoading] = useState(false); const [fetchingDetailsId, setFetchingDetailsId] = useState(null); const mealTranslations = { breakfast: t('breakfast'), lunch: t('lunch'), dinner: t('dinner'), snacks: t('snacks') }; const mealTitle = mealTranslations[mealKey] || '...'; const handleClose = () => { setQuery(''); setResults([]); setLoading(false); setFetchingDetailsId(null); onClose(); }; const searchSpoonacular = async (searchQuery) => { try { const response = await fetch(`https://api.spoonacular.com/food/ingredients/search?query=${searchQuery}&number=15&apiKey=${SPOONACULAR_API_KEY}`); const data = await response.json(); return data.results ? data.results.map(item => ({ ...item, source: 'spoonacular' })) : []; } catch (error) { console.error("Spoonacular Search API Error:", error); return []; } }; const handleSearch = async () => { if (!query.trim()) { Alert.alert(t('error'), t('search_error_msg')); return; } setLoading(true); setResults([]); try { const [egyptianResults, spoonacularResults] = await Promise.all([searchEgyptianFoodsWithImages(query), searchSpoonacular(query)]); setResults([...egyptianResults, ...spoonacularResults]); } catch (error) { Alert.alert(t('error'), t('fetch_error_msg')); } finally { setLoading(false); } }; const handleSelectFood = async (selectedItem) => { if (selectedItem.source === 'local') { onFoodSelect(selectedItem); handleClose(); return; } setFetchingDetailsId(selectedItem.id); try { const response = await fetch(`https://api.spoonacular.com/food/ingredients/${selectedItem.id}/information?amount=100&unit=g&apiKey=${SPOONACULAR_API_KEY}`); const data = await response.json(); if (data.nutrition && data.nutrition.nutrients) { const nutrition = data.nutrition.nutrients; const finalFoodItem = { id: data.id, name: data.name, quantity: '100g', calories: Math.round(nutrition.find(n => n.name === 'Calories')?.amount || 0), p: Math.round(nutrition.find(n => n.name === 'Protein')?.amount || 0), c: Math.round(nutrition.find(n => n.name === 'Carbohydrates')?.amount || 0), f: Math.round(nutrition.find(n => n.name === 'Fat')?.amount || 0), fib: Math.round(nutrition.find(n => n.name === 'Fiber')?.amount || 0), sug: Math.round(nutrition.find(n => n.name === 'Sugar')?.amount || 0), sod: Math.round(nutrition.find(n => n.name === 'Sodium')?.amount || 0), image: selectedItem.image, }; onFoodSelect(finalFoodItem); handleClose(); } else { Alert.alert(t('error'), t('fetch_error_msg')); } } catch (error) { console.error("Spoonacular Details API Error:", error); Alert.alert(t('error'), t('fetch_error_msg')); } finally { setFetchingDetailsId(null); } }; return (<Modal visible={visible} onRequestClose={handleClose} animationType="slide" transparent={true}><View style={styles.modalOverlay}><View style={styles.modalView(theme)}><View style={styles.modalHeader(theme, isRTL)}><Text style={styles.modalTitle(theme)}>{t('add_to')} {mealTitle}</Text><TouchableOpacity onPress={handleClose}><Ionicons name="close-circle" size={30} color={theme.primary} /></TouchableOpacity></View><View style={styles.searchContainer(theme, isRTL)}><TextInput style={styles.searchInput(theme, isRTL)} placeholder={t('search_placeholder')} value={query} onChangeText={setQuery} placeholderTextColor={theme.textSecondary} returnKeyType="search" onSubmitEditing={handleSearch} /><TouchableOpacity style={styles.searchButton(theme)} onPress={handleSearch}><Ionicons name="search" size={24} color={theme.white} /></TouchableOpacity></View>{loading ? (<ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />) : (<FlatList data={results} keyExtractor={(item, index) => `${item.id}-${index}`} renderItem={({ item }) => (<TouchableOpacity style={styles.resultItem(theme, isRTL)} onPress={() => handleSelectFood(item)} disabled={fetchingDetailsId !== null}><View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}><Text style={styles.foodName(theme)}>{item.name}</Text>{item.source === 'local' && <Text style={{color: theme.primary, fontSize: 12}}>{t('local_food')}</Text>}</View>{fetchingDetailsId === item.id ? (<ActivityIndicator size="small" color={theme.primary} style={{ [isRTL ? 'marginRight' : 'marginLeft']: 15 }} />) : (<Ionicons name="add-circle-outline" size={28} color={theme.primary} style={{ [isRTL ? 'marginRight' : 'marginLeft']: 15 }} />)}</TouchableOpacity>)} ListEmptyComponent={!loading && query.length > 0 ? <Text style={styles.emptyText(theme)}>{t('no_results')}</Text> : null} />)}</View></View></Modal>);};
const SmallWeightCard = ({ weight, onPress, theme, t, isRTL }) => (<TouchableOpacity style={styles.smallCard(theme)} onPress={onPress}><View style={styles.smallCardHeader(isRTL)}><View style={[styles.smallCardIconContainer(theme)]}><Ionicons name="barbell-outline" size={20} color={theme.primary} /></View><Text style={styles.smallCardTitle(theme)}>{t('weight')}</Text></View><Text style={styles.smallCardValue(theme, isRTL)}>{weight > 0 ? `${weight} ${t('kg_unit')}` : t('not_logged')}</Text></TouchableOpacity>);
const SmallWaterCard = ({ water, waterGoal, onPress, theme, t, isRTL }) => { const DISPLAY_DROPS = 15; const filledDrops = Math.min(water || 0, DISPLAY_DROPS); const totalDropsToDisplay = Math.min(waterGoal || DISPLAY_DROPS, DISPLAY_DROPS); const drops = Array.from({ length: totalDropsToDisplay }, (_, i) => i); return (<TouchableOpacity style={styles.smallCard(theme)} onPress={onPress}><View style={styles.smallCardHeader(isRTL)}><View style={[styles.smallCardIconContainer(theme)]}><Ionicons name="water-outline" size={20} color={theme.primary} /></View><Text style={styles.smallCardTitle(theme)}>{t('water')}</Text></View><View style={styles.waterVisualizerContainer(isRTL)}>{drops.map(index => (<Ionicons key={index} name={index < filledDrops ? 'water' : 'water-outline'} size={22} color={index < filledDrops ? '#007BFF' : theme.disabled} style={styles.waterDropIcon} />))}</View></TouchableOpacity>); };
const SmallWorkoutCard = ({ totalCaloriesBurned = 0, onPress, theme, t, isRTL }) => { return ( <TouchableOpacity style={styles.smallCard(theme)} onPress={onPress}><View style={styles.smallCardHeader(isRTL)}><View style={[styles.smallCardIconContainer(theme)]}><MaterialCommunityIcons name="run-fast" size={20} color={theme.primary} /></View><Text style={styles.smallCardTitle(theme)}>{t('workouts')}</Text></View><View style={styles.smallCardContent(isRTL)}><Text style={styles.smallCardValue(theme, isRTL)}>{totalCaloriesBurned > 0 ? `🔥 ${Math.round(totalCaloriesBurned)}` : t('not_logged')}</Text>{totalCaloriesBurned > 0 && <Text style={styles.smallCardSubValue(theme, isRTL)}>{t('burned_cal')}</Text> }</View></TouchableOpacity> ); };
const SmallStepsCard = ({ navigation, theme, t, isRTL }) => { const [status, setStatus] = useState('checking'); const [currentStepCount, setCurrentStepCount] = useState(0); const [stepsGoal, setStepsGoal] = useState(10000); useFocusEffect(useCallback(() => { const subscribe = async () => { const savedGoal = await AsyncStorage.getItem('stepsGoal'); if (savedGoal) setStepsGoal(parseInt(savedGoal, 10)); const isAvailable = await Pedometer.isAvailableAsync(); if (!isAvailable) { setStatus('unavailable'); return; } const { status: permissionStatus } = await Pedometer.requestPermissionsAsync(); if (permissionStatus !== 'granted') { setStatus('denied'); return; } const end = new Date(); const start = new Date(); start.setHours(0, 0, 0, 0); try { const pastStepCountResult = await Pedometer.getStepCountAsync(start, end); if (pastStepCountResult) setCurrentStepCount(pastStepCountResult.steps); setStatus('available'); } catch (error) { console.error("Pedometer error:", error); setStatus('unavailable'); } }; subscribe(); }, [])); const renderContent = () => { if (status === 'checking') return <ActivityIndicator style={{ marginTop: 20 }} color={theme.primary} />; if (status === 'unavailable' || status === 'denied') return <Text style={[styles.smallCardValue(theme, isRTL), { fontSize: 20, marginTop: 15 }]}>{t('unsupported')}</Text>; const progress = stepsGoal > 0 ? currentStepCount / stepsGoal : 0; return (<View style={styles.stepsCardContent}><View style={styles.stepsCardCircleContainer}><Progress.Circle size={80} progress={progress} showsText={false} color={theme.primary} unfilledColor={theme.progressUnfilled} borderWidth={0} thickness={8} /><View style={styles.stepsCardTextContainer}><Text style={styles.stepsCardCountText(theme)}>{currentStepCount.toLocaleString()}</Text></View></View><Text style={styles.stepsCardGoalText(theme)}>{t('goal')}{stepsGoal.toLocaleString()}</Text></View>); }; return (<TouchableOpacity style={styles.smallCard(theme)} onPress={() => navigation.navigate('Steps')}><View style={styles.smallCardHeader(isRTL)}><View style={[styles.smallCardIconContainer(theme)]}><MaterialCommunityIcons name="walk" size={20} color={theme.primary} /></View><Text style={styles.smallCardTitle(theme)}>{t('steps')}</Text></View>{renderContent()}</TouchableOpacity>); };
const DashboardGrid = ({ weight, water, waterGoal, totalExerciseCalories, onWeightPress, onWaterPress, onWorkoutPress, navigation, theme, t, isRTL }) => (<View style={styles.dashboardGridContainer}><SmallWeightCard weight={weight} onPress={onWeightPress} theme={theme} t={t} isRTL={isRTL} /><SmallWaterCard water={water} waterGoal={waterGoal} onPress={onWaterPress} theme={theme} t={t} isRTL={isRTL} /><SmallWorkoutCard totalCaloriesBurned={totalExerciseCalories} onPress={onWorkoutPress} theme={theme} t={t} isRTL={isRTL} /><SmallStepsCard navigation={navigation} theme={theme} t={t} isRTL={isRTL} /></View>);

function DiaryScreen({ navigation, route, setHasProgress, theme, t, isRTL, language }) { 
    const referenceToday = new Date(); 
    referenceToday.setHours(0, 0, 0, 0); 
    const [selectedDate, setSelectedDate] = useState(referenceToday); 
    const [dailyData, setDailyData] = useState(EMPTY_DAY_DATA); 
    
    const passedGoal = route.params?.dailyGoal;

    const [dailyGoal, setDailyGoal] = useState(2000); 

    const [macroGoals, setMacroGoals] = useState({ protein: 0, carbs: 0, fat: 0 }); 
    const [isFoodModalVisible, setFoodModalVisible] = useState(false); 
    const [currentMealKey, setCurrentMealKey] = useState(null); 
    const [waterGoal, setWaterGoal] = useState(8); 
    const isToday = formatDateKey(selectedDate) === formatDateKey(new Date()); 
    
    const loadAllData = useCallback(async () => { 
        try { 
            let goalToSet = 2000;
    
            if (passedGoal) {
                goalToSet = passedGoal;
                const profileJson = await AsyncStorage.getItem('userProfile');
                const profileData = profileJson ? JSON.parse(profileJson) : {};
                profileData.dailyGoal = passedGoal;
                await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
            } else {
                const profileJson = await AsyncStorage.getItem('userProfile'); 
                const savedProfile = profileJson ? JSON.parse(profileJson) : null;
    
                if (savedProfile && savedProfile.dailyGoal) {
                    goalToSet = savedProfile.dailyGoal;
                } else {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user?.user_metadata?.daily_goal) {
                        goalToSet = user.user_metadata.daily_goal;
                        const profileToSave = savedProfile || {};
                        profileToSave.dailyGoal = goalToSet;
                        await AsyncStorage.setItem('userProfile', JSON.stringify(profileToSave));
                    }
                }
            }
            
            setDailyGoal(goalToSet);
            
            const settingsJson = await AsyncStorage.getItem('waterSettings'); 
            setWaterGoal(settingsJson ? (JSON.parse(settingsJson).goal || 8) : 8);
    
            const dateKey = formatDateKey(selectedDate); 
            const dayJson = await AsyncStorage.getItem(dateKey); 
            let currentDayData = dayJson ? JSON.parse(dayJson) : { ...EMPTY_DAY_DATA }; 
    
            const weightHistoryJson = await AsyncStorage.getItem('weightHistory'); 
            const weightHistory = weightHistoryJson ? JSON.parse(weightHistoryJson) : []; 
            if (weightHistory.length > 0) { 
                weightHistory.sort((a, b) => new Date(a.date) - new Date(b.date)); 
                const endOfDay = new Date(selectedDate); 
                endOfDay.setHours(23, 59, 59, 999); 
                const weightForDate = weightHistory.filter(entry => new Date(entry.date) <= endOfDay).pop(); 
                currentDayData.displayWeight = weightForDate ? weightForDate.weight : 0; 
            } else { 
                currentDayData.displayWeight = 0; 
            } 
            setDailyData(currentDayData); 
    
        } catch (e) { 
            console.error("Failed to load data on focus:", e); 
            setDailyData(EMPTY_DAY_DATA); 
            setDailyGoal(2000);
        } 
    }, [selectedDate, passedGoal]);

    useFocusEffect(useCallback(() => { loadAllData(); }, [loadAllData])); 
    
    const saveData = async (dataToSave) => { try { const dateKey = formatDateKey(selectedDate); await AsyncStorage.setItem(dateKey, JSON.stringify(dataToSave)); } catch (e) { console.error("Failed to save data:", e); Alert.alert(t('error'), t('save_error_msg')); } }; 
    const handleAddItem = (mealKey, foodItem) => { if (!mealKey || !foodItem) return; const updatedMealArray = [...(dailyData[mealKey] || []), foodItem]; const updatedData = { ...dailyData, [mealKey]: updatedMealArray }; saveData(updatedData); setDailyData(updatedData); }; 
    const handleOpenModal = (mealKey) => { setCurrentMealKey(mealKey); setFoodModalVisible(true); }; 
    const handleFoodSelectedFromModal = (foodItem) => { handleAddItem(currentMealKey, foodItem); }; 
    useEffect(() => { if (dailyGoal > 0) { setMacroGoals(calculateMacroGoals(dailyGoal)); } }, [dailyGoal]); 
    const allFoodItems = [...(dailyData.breakfast || []), ...(dailyData.lunch || []), ...(dailyData.dinner || []), ...(dailyData.snacks || []),]; 
    const calculatedTotals = allFoodItems.reduce((acc, item) => { return { food: acc.food + (item.calories || 0), protein: acc.protein + (item.p || 0), carbs: acc.carbs + (item.c || 0), fat: acc.fat + (item.f || 0), fiber: acc.fiber + (item.fib || 0), sugar: acc.sugar + (item.sug || 0), sodium: acc.sodium + (item.sod || 0), }; }, { food: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }); 
    const totalExerciseCalories = (dailyData.exercises || []).reduce((sum, ex) => sum + (ex.calories || 0), 0); 
    useEffect(() => { const progressMade = calculatedTotals.food > 0 || totalExerciseCalories > 0; setHasProgress(progressMade); }, [calculatedTotals.food, totalExerciseCalories, setHasProgress]); 
    
    return ( <SafeAreaView style={styles.rootContainer(theme)}><StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} /><AddFoodModal visible={isFoodModalVisible} onClose={() => setFoodModalVisible(false)} onFoodSelect={handleFoodSelectedFromModal} mealKey={currentMealKey} theme={theme} t={t} isRTL={isRTL} /><ScrollView contentContainerStyle={styles.container}><DateNavigator selectedDate={selectedDate} onDateSelect={setSelectedDate} referenceToday={referenceToday} theme={theme} t={t} isRTL={isRTL} language={language} />{!isToday && (<View style={styles.readOnlyBanner(theme, isRTL)}><Ionicons name="information-circle-outline" size={20} color={theme.white} style={{ [isRTL ? 'marginLeft' : 'marginRight']: 8 }} /><Text style={styles.readOnlyBannerText(theme, isRTL)}>{t('readOnlyBanner')}</Text></View>)}<SummaryCard data={{ food: calculatedTotals.food, exercise: totalExerciseCalories }} dailyGoal={dailyGoal} theme={theme} t={t} /><NutrientSummaryCard data={{ protein: { consumed: calculatedTotals.protein, goal: macroGoals.protein }, carbs: { consumed: calculatedTotals.carbs, goal: macroGoals.carbs }, fat: { consumed: calculatedTotals.fat, goal: macroGoals.fat }, fiber: { consumed: calculatedTotals.fiber, goal: NUTRIENT_GOALS.fiber }, sugar: { consumed: calculatedTotals.sugar, goal: NUTRIENT_GOALS.sugar }, sodium: { consumed: calculatedTotals.sodium, goal: NUTRIENT_GOALS.sodium }, }} theme={theme} t={t} isRTL={isRTL} /><DashboardGrid weight={dailyData.displayWeight || 0} water={dailyData.water || 0} waterGoal={waterGoal} totalExerciseCalories={totalExerciseCalories} onWeightPress={() => navigation.navigate('Weight')} onWaterPress={() => navigation.navigate('Water', { dateKey: formatDateKey(selectedDate) })} onWorkoutPress={() => navigation.navigate('WorkoutLog', { dateKey: formatDateKey(selectedDate) })} navigation={navigation} theme={theme} t={t} isRTL={isRTL} /><DailyFoodLog items={allFoodItems} onPress={() => navigation.navigate('FoodLogDetail', { items: allFoodItems, dateString: selectedDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) })} theme={theme} t={t} isRTL={isRTL} /><View style={styles.sectionHeaderContainer(isRTL)}><Text style={styles.sectionTitle(theme, isRTL)}>{t('mealSectionsTitle')}</Text><Text style={styles.sectionDescription(theme, isRTL)}>{t('mealSectionsDesc')}</Text></View><MealLoggingSection title={t('breakfast')} iconName="sunny-outline" items={dailyData.breakfast || []} onAddPress={handleOpenModal} mealKey="breakfast" isEditable={isToday} theme={theme} t={t} isRTL={isRTL} /><MealLoggingSection title={t('lunch')} iconName="partly-sunny-outline" items={dailyData.lunch || []} onAddPress={handleOpenModal} mealKey="lunch" isEditable={isToday} theme={theme} t={t} isRTL={isRTL} /><MealLoggingSection title={t('dinner')} iconName="moon-outline" items={dailyData.dinner || []} onAddPress={handleOpenModal} mealKey="dinner" isEditable={isToday} theme={theme} t={t} isRTL={isRTL} /><MealLoggingSection title={t('snacks')} iconName="nutrition-outline" items={dailyData.snacks || []} onAddPress={handleOpenModal} mealKey="snacks" isEditable={isToday} theme={theme} t={t} isRTL={isRTL} /></ScrollView></SafeAreaView> ); 
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const INDICATOR_DIAMETER = 70;

const MagicLineTabBar = ({ state, descriptors, navigation, theme, t }) => {
    const TAB_COUNT = state.routes.length; const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT; const translateX = useSharedValue(0); const [profileImage, setProfileImage] = useState(null); const previousIndex = useRef(state.index);
    useEffect(() => { const isSwitchingTabs = previousIndex.current !== state.index; if (isSwitchingTabs) { translateX.value = withTiming(state.index * TAB_WIDTH, { duration: 500 }); } else { translateX.value = state.index * TAB_WIDTH; } previousIndex.current = state.index; }, [state.index, TAB_WIDTH]);
    useFocusEffect(useCallback(() => { const loadProfileImage = async () => { try { const jsonValue = await AsyncStorage.getItem('userProfile'); if (jsonValue != null) { const data = JSON.parse(jsonValue); setProfileImage(data.profileImage || null); } else { setProfileImage(null); } } catch (e) { console.error("Failed to load profile image for tab bar:", e); } }; loadProfileImage(); }, []));
    const indicatorAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
    return ( <View style={styles.tabBarContainer(theme)}><View style={styles.animationWrapper}><LeafAnimation trigger={state.index} /></View><Animated.View style={[styles.indicatorContainer, { width: TAB_WIDTH }, indicatorAnimatedStyle]}><View style={[styles.indicator(theme), { backgroundColor: theme.tabBarIndicator }]}><View style={[styles.cutout, styles.cutoutLeft(theme)]} /><View style={[styles.cutout, styles.cutoutRight(theme)]} /></View></Animated.View>{state.routes.map((route, index) => { const { options } = descriptors[route.key]; const isFocused = state.index === index; const onPress = () => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!isFocused && !event.defaultPrevented) { navigation.navigate(route.name); } }; const iconAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: withTiming(isFocused ? -32 : 0, { duration: 500 }) }] })); const textAnimatedStyle = useAnimatedStyle(() => ({ opacity: withTiming(isFocused ? 1 : 0, { duration: 500 }), transform: [{ translateY: withTiming(isFocused ? 10 : 20, { duration: 500 }) }] })); const isProfileTab = route.name === 'ProfileStack'; return ( <TouchableOpacity key={route.key} style={[styles.tabItem, { width: TAB_WIDTH }]} onPress={onPress}><Animated.View style={iconAnimatedStyle}>{isProfileTab ? ( <Image source={profileImage ? { uri: profileImage } : require('./assets/profile.png')} style={styles.profileTabIcon} /> ) : ( <Ionicons name={options.tabBarIconName || 'alert-circle-outline'} size={28} color={theme.tabBarIcon} /> )}</Animated.View><Animated.Text style={[styles.tabText(theme), textAnimatedStyle]}>{options.tabBarLabel}</Animated.Text></TouchableOpacity> ); })}</View> );
};

const Tab = createBottomTabNavigator();
const DiaryStack = createStackNavigator();
const ReportsStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const commonStackOptions = (theme) => ({ 
  headerStyle: { backgroundColor: theme.card, elevation: 0, shadowOpacity: 0 }, 
  headerTintColor: theme.textPrimary, 
  headerTitleStyle: { fontWeight: 'bold' }, 
  headerTitleAlign: 'center',
  cardStyle: { flex: 1, backgroundColor: theme.background }, 
});

function DiaryStackNavigator({ setHasProgress, theme, t, isRTL, language }) { 
  return ( 
    <DiaryStack.Navigator screenOptions={commonStackOptions(theme)}>
      <DiaryStack.Screen name="DiaryHome" options={{ headerShown: false }}>
        {props => <DiaryScreen {...props} setHasProgress={setHasProgress} theme={theme} t={t} isRTL={isRTL} language={language} />}
      </DiaryStack.Screen>
      <DiaryStack.Screen name="Weight" component={WeightScreen} options={{ title: t('weightTrackerTitle') }} />
      <DiaryStack.Screen name="Water" component={WaterScreen} options={{ title: t('waterTrackerTitle') }} />
      <DiaryStack.Screen name="WorkoutLog" component={WorkoutLogScreen} options={{ title: t('workoutLogTitle') }} />
      <DiaryStack.Screen name="Steps" component={StepsScreen} options={{ title: t('stepsReportTitle') }} />
      <DiaryStack.Screen name="FoodLogDetail" component={FoodLogDetailScreen} options={{ title: t('foodLogDetailTitle') }} />
    </DiaryStack.Navigator> 
  ); 
}

function ReportsStackNavigator({ theme, t }) { 
  return ( 
    <ReportsStack.Navigator screenOptions={commonStackOptions(theme)}>
      <ReportsStack.Screen name="ReportsHome" component={ReportsScreen} options={{ headerShown: false }} />
    </ReportsStack.Navigator> 
  ); 
}

// ✅ *** [تعديل 1] ***: تعديل `ProfileStackNavigator` لاستقبال وتمرير دالة تغيير المظهر
function ProfileStackNavigator({ theme, t, onThemeChange }) {
  return (
    <ProfileStack.Navigator screenOptions={commonStackOptions(theme)}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Settings" options={{ headerShown: false }}>
        {props => <SettingsScreen {...props} onThemeChange={onThemeChange} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
    </ProfileStack.Navigator>
  );
}

function MainUIScreen() {
  const [theme, setTheme] = useState(lightTheme);
  const [language, setLanguage] = useState('ar');
  const [isRTL, setIsRTL] = useState(true);
  const [hasProgress, setHasProgress] = useState(false);

  // ✅ *** [تعديل 2] ***: إضافة دالة للتحكم في تغيير المظهر وحفظه
  const handleThemeChange = async (isDark) => {
    const newTheme = isDark ? darkTheme : lightTheme;
    setTheme(newTheme); // تحديث المظهر في الحالة الرئيسية فوراً
    try {
      await AsyncStorage.setItem('isDarkMode', String(isDark));
    } catch (e) {
      console.error('Failed to save theme setting.', e);
    }
  };

  const t = useCallback((key, params) => { let string = translations[language]?.[key] || translations['en'][key] || key; if (params) { Object.keys(params).forEach(pKey => { string = string.replace(`{${pKey}}`, params[pKey]); }); } return string; }, [language]);
  const loadSettings = async () => { try { const savedTheme = await AsyncStorage.getItem('isDarkMode'); setTheme(savedTheme === 'true' ? darkTheme : lightTheme); const savedLang = await AsyncStorage.getItem('appLanguage'); const currentLang = savedLang || 'ar'; setLanguage(currentLang); setIsRTL(currentLang === 'ar'); } catch (e) { console.error('Failed to load settings.', e); } };
  useFocusEffect(useCallback(() => { loadSettings(); }, []));
  
  useEffect(() => {
    const setupNotificationsAndBackgroundTasks = async () => {
      try {
        await registerForPushNotificationsAsync();
        Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, }), });
        const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(STEPS_NOTIFICATION_TASK);
        if (!isTaskRegistered) {
          await BackgroundFetch.registerTaskAsync(STEPS_NOTIFICATION_TASK, { minimumInterval: 15 * 60, stopOnTerminate: false, startOnBoot: true, });
        }
      } catch (error) {
        console.error("Error setting up notifications or background tasks:", error);
      }
    };
    setupNotificationsAndBackgroundTasks();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        const route = props.state.routes[props.state.index];
        const routeName = getFocusedRouteNameFromRoute(route);
        const screensToHideTabBar = ['Weight', 'Water', 'WorkoutLog', 'Steps', 'FoodLogDetail', 'EditProfile', 'Settings', 'About'];
        if (screensToHideTabBar.includes(routeName)) { return null; }
        return <MagicLineTabBar {...props} theme={theme} t={t} />;
      }}
    >
      <Tab.Screen name="DiaryStack" options={{ tabBarLabel: t('diaryTab'), tabBarIconName: 'journal-outline' }}>
          {props => <DiaryStackNavigator {...props} theme={theme} t={t} isRTL={isRTL} language={language} setHasProgress={setHasProgress} />}
      </Tab.Screen>
      <Tab.Screen name="ReportsStack" options={{ tabBarLabel: t('reportsTab'), tabBarIconName: 'stats-chart-outline' }}>
          {props => <ReportsStackNavigator {...props} theme={theme} t={t} />}
      </Tab.Screen>
      <Tab.Screen name="Camera" component={CameraScreen} options={{ tabBarLabel: t('cameraTab'), tabBarIconName: 'camera-outline' }} />
      <Tab.Screen name="ProfileStack" options={{ tabBarLabel: t('profileTab') }}>
        {/* ✅ *** [تعديل 3] ***: تمرير الدالة الجديدة إلى مكدس شاشات الحساب الشخصي */}
        {props => <ProfileStackNavigator {...props} theme={theme} t={t} onThemeChange={handleThemeChange} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = { 
    rootContainer: (theme) => ({ flex: 1, backgroundColor: theme.background }), 
    container: { paddingHorizontal: 20, paddingBottom: 80 }, 
    card: (theme) => ({ backgroundColor: theme.card, borderRadius: 20, padding: 20, marginBottom: 15 }), 
    dateNavContainer: (theme) => ({ marginVertical: 10, backgroundColor: theme.card, borderRadius: 20, paddingVertical: 15, paddingHorizontal: 10 }), 
    dateNavHeader: (isRTL) => ({ flexDirection: isRTL ? 'row' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 }), 
    arrowButton: { padding: 5 }, 
    dateNavMonthText: (theme) => ({ fontSize: 18, fontWeight: 'bold', color: theme.textPrimary }), 
    weekContainer: (isRTL) => ({ flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: 'space-around', marginBottom: 10 }), 
    weekDayText: (theme) => ({ fontSize: 14, color: theme.textSecondary, fontWeight: '500' }), 
    datesContainer: (isRTL) => ({ flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: 'space-around' }), 
    dateCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    activeCircle: (theme) => ({ backgroundColor: theme.primary, borderWidth: 0 }),
    inactiveCircle: (theme) => ({ borderWidth: 0 }),
    dateText: (theme) => ({ fontSize: 16, color: theme.textPrimary, fontWeight: '600' }), 
    activeText: (theme) => ({ color: theme.white }), 
    disabledDateText: (theme) => ({ color: theme.disabled }), 
    summaryCircleContainer: { justifyContent: 'center', position: 'relative' }, 
    summaryTextContainer: { position: 'absolute', alignItems: 'center', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' }, 
    remainingCaloriesText: (theme) => ({ fontSize: 42, fontWeight: 'bold', color: theme.textPrimary }), 
    remainingLabel: (theme) => ({ fontSize: 14, color: theme.textSecondary }), 
    progressIndicatorDot: (theme) => ({ position: 'absolute', top: 0, left: 0, backgroundColor: theme.indicatorDot, borderWidth: 3, borderColor: theme.card }), 
    sectionHeaderContainer: (isRTL) => ({ marginTop: 15, marginBottom: 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }), 
    sectionTitle: (theme, isRTL) => ({ fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, textAlign: isRTL ? 'right' : 'left', marginBottom: 0, flexShrink: 1 }), 
    sectionDescription: (theme, isRTL) => ({ fontSize: 14, color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }), 
    mealSectionHeader: (isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, }), 
    mealSectionHeaderLeft: (isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }), 
    mealIcon: (isRTL) => ({ [isRTL ? 'marginLeft' : 'marginRight']: 10 }), 
    mealSectionTitle: (theme) => ({ fontSize: 22, fontWeight: 'bold', color: theme.textPrimary }), 
    mealSectionTotalCalories: (theme) => ({ fontSize: 16, color: theme.textSecondary, fontWeight: '600' }), 
    mealMacrosContainer: (theme, isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.background, flexWrap: 'wrap' }), 
    macroSummaryItem: (isRTL) => ({ [isRTL ? 'marginLeft' : 'marginRight']: 20, marginBottom: 5 }), 
    macroSummaryText: (theme) => ({ fontSize: 13, color: theme.textSecondary, fontWeight: '600' }), 
    smartAddButton: (theme) => ({ marginTop: 15, paddingVertical: 15, borderRadius: 15, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', width: '100%' }), 
    smartAddButtonText: (theme) => ({ color: theme.white, fontSize: 18, fontWeight: 'bold' }), 
    disabledButton: (theme) => ({ backgroundColor: theme.disabled }), 
    readOnlyBanner: (theme, isRTL) => ({ backgroundColor: theme.readOnlyBanner, borderRadius: 10, padding: 10, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 15 }), 
    readOnlyBannerText: (theme, isRTL) => ({ color: theme.white, fontSize: 14, fontWeight: 'bold', flex: 1, textAlign: isRTL ? 'right' : 'left' }), 
    tabBarContainer: (theme) => ({ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, flexDirection: 'row', backgroundColor: theme.tabBarBackground }), 
    tabItem: { height: 70, justifyContent: 'center', alignItems: 'center' }, 
    tabText: (theme) => ({ position: 'absolute', color: theme.tabBarIcon, fontSize: 12, fontWeight: '400' }), 
    indicatorContainer: { position: 'absolute', top: -35, left: 0, height: INDICATOR_DIAMETER, alignItems: 'center' }, 
    indicator: (theme) => ({ width: INDICATOR_DIAMETER, height: INDICATOR_DIAMETER, borderRadius: INDICATOR_DIAMETER / 2, borderWidth: 6, borderColor: theme.background }), 
    cutout: { position: 'absolute', top: '50%', width: 20, height: 20, backgroundColor: 'transparent', shadowOpacity: 1, shadowRadius: 0 }, 
    cutoutLeft: (theme) => ({ left: -22, borderTopRightRadius: 20, shadowColor: theme.background, shadowOffset: { width: 1, height: -10 } }), 
    cutoutRight: (theme) => ({ right: -22, borderTopLeftRadius: 20, shadowColor: theme.background, shadowOffset: { width: -1, height: -10 } }), 
    profileTabIcon: { width: 32, height: 32, borderRadius: 16 }, 
    animationWrapper: { position: 'absolute', top: 0, left: 0, right: 0, height: 70, overflow: 'hidden', }, 
    leafAnimationContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', pointerEvents: 'none', }, 
    leafImage: { width: '100%', height: 50, resizeMode: 'cover', }, 
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }, 
    modalView: (theme) => ({ width: '90%', maxHeight: '80%', backgroundColor: theme.background, borderRadius: 20, padding: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, overflow: 'hidden' }), 
    modalHeader: (theme, isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: theme.card }), 
    modalTitle: (theme) => ({ fontSize: 20, fontWeight: 'bold', color: theme.textPrimary }), 
    searchContainer: (theme, isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', padding: 15, backgroundColor: theme.card }), 
    searchInput: (theme, isRTL) => ({ flex: 1, height: 50, backgroundColor: theme.background, borderRadius: 10, paddingHorizontal: 15, fontSize: 16, textAlign: isRTL ? 'right' : 'left', color: theme.textPrimary }), 
    searchButton: (theme) => ({ width: 50, height: 50, backgroundColor: theme.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10 }), 
    resultItem: (theme, isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, padding: 20, borderBottomWidth: 1, borderBottomColor: theme.background }), 
    foodName: (theme) => ({ fontSize: 16, color: theme.textPrimary }), 
    emptyText: (theme) => ({ textAlign: 'center', marginTop: 50, fontSize: 16, color: theme.textSecondary }), 
    dashboardGridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, flexWrap: 'wrap', rowGap: 15, }, 
    smallCard: (theme) => ({ width: '48.5%', backgroundColor: theme.card, borderRadius: 20, padding: 15, minHeight: 120, justifyContent: 'space-between', }), 
    smallCardHeader: (isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', }), 
    smallCardIconContainer: (theme) => ({ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.progressUnfilled }), 
    smallCardTitle: (theme) => ({ fontSize: 16, fontWeight: '600', color: theme.textPrimary, marginLeft: 8, marginRight: 8 }), 
    smallCardValue: (theme, isRTL) => ({ fontSize: 28, fontWeight: 'bold', color: theme.textPrimary, textAlign: isRTL ? 'right' : 'left', }), 
    smallCardSubValue: (theme, isRTL) => ({ fontSize: 14, color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left', marginTop: -5, }), 
    smallCardContent: (isRTL) => ({ alignItems: isRTL ? 'flex-end' : 'flex-start' }), 
    waterVisualizerContainer: (isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', rowGap: 5, }), 
    waterDropIcon: { marginHorizontal: 1, }, 
    stepsCardContent: { flex: 1, justifyContent: 'center', alignItems: 'center' }, 
    stepsCardCircleContainer: { justifyContent: 'center', alignItems: 'center', marginVertical: 5, }, 
    stepsCardTextContainer: { position: 'absolute', }, 
    stepsCardCountText: (theme) => ({ fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, }), 
    stepsCardGoalText: (theme) => ({ fontSize: 13, color: theme.textSecondary, marginTop: 2, }), 
    nutrientRowContainer: { marginBottom: 15, }, 
    nutrientRowHeader: (isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, }), 
    nutrientRowLabel: (theme) => ({ fontSize: 16, color: theme.textPrimary, fontWeight: '600', }), 
    nutrientRowValue: (theme) => ({ fontSize: 14, color: theme.textSecondary, }), 
    foodLogItemContainer: (theme, isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.background, }), 
    foodLogItemImage: (isRTL) => ({ width: 50, height: 50, borderRadius: 10, [isRTL ? 'marginLeft' : 'marginRight']: 15, }), 
    foodLogItemImagePlaceholder: (theme, isRTL) => ({ width: 50, height: 50, borderRadius: 10, [isRTL ? 'marginLeft' : 'marginRight']: 15, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', }), 
    foodLogItemDetails: { flex: 1, }, 
    foodLogItemHeader: (isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, }), 
    foodLogItemName: (theme, isRTL) => ({ fontSize: 16, fontWeight : '600', color: theme.textPrimary, flex: 1, textAlign: isRTL ? 'right' : 'left', }), 
    foodLogItemCalories: (theme, isRTL) => ({ fontSize: 14, fontWeight: '500', color: theme.primary, [isRTL ? 'marginRight' : 'marginLeft']: 8, }), 
    foodLogItemMacros: (isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6, }), 
    macroText: (theme, isRTL) => ({ fontSize: 13, color: theme.textSecondary, [isRTL ? 'marginLeft' : 'marginRight']: 15, marginBottom: 4, }), 
    dailyLogCard: { paddingVertical: 18, paddingHorizontal: 15, }, 
    dailyLogContentContainer: (isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', }), 
    dailyLogLeftContainer: (isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', }), 
    foodPreviewContainer: (isRTL) => ({ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', }), 
    previewImage: (theme) => ({ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: theme.card, backgroundColor: '#f0f0f0', }), 
    previewImagePlaceholder: (theme) => ({ justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }), 
    previewCounterCircle: (theme) => ({ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.progressUnfilled, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.card, }), 
    previewCounterText: (theme) => ({ color: theme.primary, fontWeight: 'bold', fontSize: 12, }),
};

export default MainUIScreen;