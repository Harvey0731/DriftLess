import React from 'react';
import { View, Text, Pressable } from 'react-native';

export interface Task {
  id: string;
  title: string;
  estimatedMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  included: boolean;
}

interface TaskBreakdownProps {
  tasks: Task[];
  onToggle: (taskId: string) => void;
  onMakeSmaller: (taskId: string) => void;
}

function DifficultyIndicator({ difficulty }: { difficulty: Task['difficulty'] }) {
  const config = {
    easy: { label: 'Easy', bgClass: 'bg-green-100', textClass: 'text-green-700' },
    medium: { label: 'Medium', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' },
    hard: { label: 'Hard', bgClass: 'bg-orange-100', textClass: 'text-orange-700' },
  };

  const { label, bgClass, textClass } = config[difficulty];

  return (
    <View className={`rounded-full px-2 py-0.5 ${bgClass}`}>
      <Text className={`text-xs font-medium ${textClass}`}>{label}</Text>
    </View>
  );
}

export default function TaskBreakdown({ tasks, onToggle, onMakeSmaller }: TaskBreakdownProps) {
  return (
    <View className="gap-3">
      {tasks.map((task) => (
        <View
          key={task.id}
          className={`rounded-2xl p-4 ${
            task.included ? 'bg-white border border-gray-200' : 'bg-gray-50 border border-gray-100'
          }`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1 gap-3">
              {/* Checkbox */}
              <Pressable
                onPress={() => onToggle(task.id)}
                className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                  task.included
                    ? 'bg-purple-500 border-purple-500'
                    : 'bg-white border-gray-300'
                }`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.included }}
                accessibilityLabel={`Include task: ${task.title}`}
              >
                {task.included && (
                  <Text className="text-white text-xs font-bold">{'✓'}</Text>
                )}
              </Pressable>

              {/* Task title */}
              <Text
                className={`text-base font-medium flex-1 ${
                  task.included ? 'text-gray-800' : 'text-gray-400'
                }`}
                numberOfLines={2}
              >
                {task.title}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between ml-9">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-gray-500">{task.estimatedMinutes} min</Text>
              <DifficultyIndicator difficulty={task.difficulty} />
            </View>

            <Pressable
              onPress={() => onMakeSmaller(task.id)}
              className="bg-purple-50 rounded-lg px-3 py-1.5"
              accessibilityRole="button"
              accessibilityLabel={`Make task smaller: ${task.title}`}
            >
              <Text className="text-purple-600 text-xs font-medium">Make it smaller</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}
