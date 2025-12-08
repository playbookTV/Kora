/**
 * Monthly Insights Screen
 *
 * Displays monthly spending breakdown and AI observations.
 * Per spec Section 16: "Monthly breakdown" and "AI insights".
 */

import React, { useEffect } from 'react';
import { View, Text, Colors, TouchableOpacity } from 'react-native-ui-lib';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

import { useInsightsStore, CategoryBreakdown } from '@/store/insights-store';
import { useUserStore } from '@/store/user-store';
import { usePatternStore } from '@/store/pattern-store';
import { BorderRadius, Shadows } from '@/constants/design-system';

const BackIcon = () => <Feather name="arrow-left" size={24} color={Colors.textDefault} />;

export default function InsightsScreen() {
  const router = useRouter();
  const { currentInsight, generateMonthlyInsight, isGenerating } = useInsightsStore();
  const { currency } = useUserStore();
  const { pattern } = usePatternStore();

  const currencySymbol = currency === 'NGN' ? '₦' : '£';

  // Generate insights on mount
  useEffect(() => {
    generateMonthlyInsight();
  }, [generateMonthlyInsight]);

  // Format month display
  const getMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Risk score color
  const getRiskColor = (score: number) => {
    if (score < 40) return Colors.success;
    if (score < 70) return Colors.warning;
    return Colors.error;
  };

  if (isGenerating || !currentInsight) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.screenBG }}>
        <StatusBar style="dark" />
        <View flex center>
          <Text body textMuted>Analyzing your spending...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.screenBG }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View row spread centerV paddingH-page paddingV-s4>
        <TouchableOpacity onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <Text h3 textDefault>Insights</Text>
        <View width={24} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Header */}
        <View centerH marginB-s6>
          <Text caption textMuted style={{ letterSpacing: 1.5 }}>
            {getMonthDisplay(currentInsight.month).toUpperCase()}
          </Text>
        </View>

        {/* Total Spent Card */}
        <View
          bg-cardBG
          padding-card
          marginB-s4
          style={[Shadows.small, { borderRadius: BorderRadius.large }]}
        >
          <Text caption textMuted marginB-s2>TOTAL SPENT</Text>
          <Text h1 textDefault>
            {currencySymbol}{currentInsight.totalSpent.toLocaleString()}
          </Text>
          <Text body textMuted marginT-s2>
            ~{currencySymbol}{Math.round(currentInsight.avgDailySpend).toLocaleString()} per day
          </Text>
        </View>

        {/* Stats Row */}
        <View row spread marginB-s6>
          {/* Savings Rate */}
          <View
            flex
            bg-cardBG
            padding-card
            marginR-s2
            style={[Shadows.small, { borderRadius: BorderRadius.large }]}
          >
            <Text caption textMuted marginB-s1>SAVINGS</Text>
            <Text h3 style={{ color: currentInsight.savingsRate >= 10 ? Colors.success : Colors.warning }}>
              {currentInsight.savingsRate.toFixed(0)}%
            </Text>
          </View>

          {/* Risk Score */}
          <View
            flex
            bg-cardBG
            padding-card
            marginL-s2
            style={[Shadows.small, { borderRadius: BorderRadius.large }]}
          >
            <Text caption textMuted marginB-s1>RISK</Text>
            <Text h3 style={{ color: getRiskColor(currentInsight.riskScore) }}>
              {currentInsight.riskScore}
            </Text>
          </View>
        </View>

        {/* AI Observations */}
        {currentInsight.aiObservations.length > 0 && (
          <View marginB-s6>
            <View row centerV marginB-s3>
              <Ionicons name="bulb-outline" size={20} color={Colors.textMuted} />
              <Text h4 textDefault marginL-s2>Kora Notices</Text>
            </View>

            <View
              bg-cardBG
              padding-card
              style={[Shadows.small, { borderRadius: BorderRadius.large }]}
            >
              {currentInsight.aiObservations.map((observation, index) => (
                <View key={index}>
                  <View row>
                    <Text body textMuted style={{ marginRight: 8 }}>•</Text>
                    <Text body textDefault style={{ flex: 1 }}>{observation}</Text>
                  </View>
                  {index < currentInsight.aiObservations.length - 1 && (
                    <View height={12} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        {currentInsight.categoryBreakdown.length > 0 && (
          <View marginB-s6>
            <Text h4 textDefault marginB-s3>Spending Breakdown</Text>

            <View
              bg-cardBG
              padding-card
              style={[Shadows.small, { borderRadius: BorderRadius.large }]}
            >
              {/* Bar Chart */}
              <View marginB-s4>
                <View row style={{ height: 24, borderRadius: BorderRadius.medium, overflow: 'hidden' }}>
                  {currentInsight.categoryBreakdown.map((cat, index) => (
                    <View
                      key={cat.category}
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                        minWidth: cat.percentage > 0 ? 4 : 0,
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* Category List */}
              {currentInsight.categoryBreakdown.map((cat, index) => (
                <CategoryRow
                  key={cat.category}
                  category={cat}
                  currencySymbol={currencySymbol}
                  isLast={index === currentInsight.categoryBreakdown.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Pattern Insights */}
        {pattern.highRiskDays.length > 0 && (
          <View marginB-s6>
            <Text h4 textDefault marginB-s3>Your Patterns</Text>

            <View
              bg-cardBG
              padding-card
              style={[Shadows.small, { borderRadius: BorderRadius.large }]}
            >
              <View row spread marginB-s3>
                <Text body textMuted>High-spend days</Text>
                <Text body textDefault>{pattern.highRiskDays.join(', ')}</Text>
              </View>

              <View row spread marginB-s3>
                <Text body textMuted>Weekend vs Weekday</Text>
                <Text body textDefault>
                  {pattern.avgWeekdaySpend > 0
                    ? `${((pattern.avgWeekendSpend / pattern.avgWeekdaySpend) * 100).toFixed(0)}%`
                    : '-'}
                </Text>
              </View>

              {pattern.currentStreak > 0 && (
                <View row spread>
                  <Text body textMuted>Current streak</Text>
                  <Text body style={{ color: Colors.success }}>
                    {pattern.currentStreak} days under safe spend
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Empty State */}
        {currentInsight.categoryBreakdown.length === 0 && (
          <View center paddingV-s8>
            <Ionicons name="analytics-outline" size={48} color={Colors.textDisabled} />
            <Text body textMuted marginT-s4 center>
              Not enough transactions yet.{'\n'}Keep logging to see insights.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Category Row Component
 */
function CategoryRow({
  category,
  currencySymbol,
  isLast,
}: {
  category: CategoryBreakdown;
  currencySymbol: string;
  isLast: boolean;
}) {
  return (
    <>
      <View row spread centerV paddingV-s2>
        <View row centerV flex>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: category.color,
              marginRight: 12,
            }}
          />
          <Text body textDefault numberOfLines={1} style={{ flex: 1 }}>
            {category.category}
          </Text>
        </View>

        <View row centerV>
          <Text body textDefault marginR-s3>
            {currencySymbol}{category.amount.toLocaleString()}
          </Text>
          <Text caption textMuted style={{ width: 40, textAlign: 'right' }}>
            {category.percentage.toFixed(0)}%
          </Text>
        </View>
      </View>

      {!isLast && <View height={1} bg-divider />}
    </>
  );
}
