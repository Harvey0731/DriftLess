import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BAD_DAY_CATEGORIES,
  DEFAULT_BAD_DAY_ACTIONS,
} from '@/src/utils/constants';

type Category = (typeof BAD_DAY_CATEGORIES)[number];
type CommitState = 'idle' | 'committed' | 'couldnt';

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  'Very Easy': { bg: 'bg-green-100', text: 'text-green-700' },
  Easy: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

const SIMPLER_FALLBACKS: Record<string, string> = {
  Physical: 'taking three deep breaths',
  Work: 'opening one app on your phone',
  Comfort: 'wrapping yourself in a blanket',
  Tomorrow: 'setting just one alarm',
};

export default function BadDayToolboxScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<Category>('Physical');
  const [committedActionIndex, setCommittedActionIndex] = useState<number | null>(null);
  const [commitState, setCommitState] = useState<CommitState>('idle');

  const actions = DEFAULT_BAD_DAY_ACTIONS[selectedCategory];

  function handleCategoryChange(category: Category) {
    setSelectedCategory(category);
    setCommittedActionIndex(null);
    setCommitState('idle');
  }

  function handleCommit(index: number) {
    setCommittedActionIndex(index);
    setCommitState('committed');
  }

  function handleDone() {
    router.back();
  }

  function handleCouldnt() {
    setCommitState('couldnt');
  }

  function handleReset() {
    setCommittedActionIndex(null);
    setCommitState('idle');
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Bad Day Toolbox',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F9FAFB' },
          headerTintColor: '#8B5CF6',
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
            It's okay. Let's find something small.
          </Text>
          <Text className="text-base text-gray-500 text-center">
            Pick a category that feels right.
          </Text>
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          className="mb-6"
        >
          {BAD_DAY_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <Pressable
                key={category}
                onPress={() => handleCategoryChange(category)}
                className={`px-5 py-3 rounded-full ${
                  isSelected
                    ? 'bg-purple-500'
                    : 'bg-white border border-gray-200'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={category}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Simpler fallback message after "Couldn't Do It" */}
        {commitState === 'couldnt' && (
          <View className="mx-6 mb-6 bg-purple-50 border border-purple-200 rounded-2xl p-5">
            <Text className="text-base text-purple-800 leading-6 text-center">
              That's okay. Maybe try just {SIMPLER_FALLBACKS[selectedCategory]}?
            </Text>
            <Pressable onPress={handleReset} className="mt-4 self-center">
              <Text className="text-sm text-purple-500 underline">
                Show me other options
              </Text>
            </Pressable>
          </View>
        )}

        {/* Action cards */}
        {commitState !== 'couldnt' && (
          <View className="px-6">
            {actions.map((action, index) => {
              const isCommitted =
                committedActionIndex === index && commitState === 'committed';
              const difficultyStyle = DIFFICULTY_COLORS[action.difficulty] ?? {
                bg: 'bg-gray-100',
                text: 'text-gray-700',
              };

              return (
                <View
                  key={index}
                  className={`bg-white rounded-2xl p-5 mb-4 border ${
                    isCommitted
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Title row with difficulty badge */}
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-base font-semibold text-gray-800 flex-1 mr-3">
                      {action.title}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full ${difficultyStyle.bg}`}
                    >
                      <Text
                        className={`text-xs font-medium ${difficultyStyle.text}`}
                      >
                        {action.difficulty}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text className="text-sm text-gray-500 mb-2">
                    {action.description}
                  </Text>

                  {/* Time estimate */}
                  <Text className="text-xs text-gray-400 mb-4">
                    {action.time}
                  </Text>

                  {/* Buttons */}
                  {isCommitted ? (
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={handleDone}
                        className="flex-1 bg-green-500 rounded-xl py-3 items-center active:opacity-80"
                        accessibilityRole="button"
                        accessibilityLabel="Done"
                      >
                        <Text className="text-white font-semibold text-sm">
                          Done
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleCouldnt}
                        className="flex-1 bg-gray-100 rounded-xl py-3 items-center active:opacity-80"
                        accessibilityRole="button"
                        accessibilityLabel="Couldn't Do It"
                      >
                        <Text className="text-gray-600 font-semibold text-sm">
                          Couldn't Do It
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    committedActionIndex === null && (
                      <Pressable
                        onPress={() => handleCommit(index)}
                        className="bg-purple-500 rounded-xl py-3 items-center active:opacity-80"
                        accessibilityRole="button"
                        accessibilityLabel={`I'll do: ${action.title}`}
                      >
                        <Text className="text-white font-semibold text-sm">
                          I'll Do This
                        </Text>
                      </Pressable>
                    )
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
