import React from 'react';
import { View, Text, Pressable } from 'react-native';

export type EnergyLevel = 'good' | 'meh' | 'low' | 'need-a-break';

interface EnergyOption {
  key: EnergyLevel;
  label: string;
  description: string;
  bgClass: string;
  selectedBgClass: string;
}

const ENERGY_OPTIONS: EnergyOption[] = [
  {
    key: 'good',
    label: 'Good',
    description: 'Ready to focus',
    bgClass: 'bg-green-50',
    selectedBgClass: 'bg-green-100',
  },
  {
    key: 'meh',
    label: 'Meh',
    description: 'Could go either way',
    bgClass: 'bg-yellow-50',
    selectedBgClass: 'bg-yellow-100',
  },
  {
    key: 'low',
    label: 'Low',
    description: 'Running on empty',
    bgClass: 'bg-orange-50',
    selectedBgClass: 'bg-orange-100',
  },
  {
    key: 'need-a-break',
    label: 'Need a Break',
    description: 'Not today',
    bgClass: 'bg-blue-50',
    selectedBgClass: 'bg-blue-100',
  },
];

interface EnergySelectorProps {
  selectedEnergy: EnergyLevel | null;
  onSelect: (energy: EnergyLevel) => void;
}

export default function EnergySelector({ selectedEnergy, onSelect }: EnergySelectorProps) {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-4">
      {ENERGY_OPTIONS.map((option) => {
        const isSelected = selectedEnergy === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            className={`w-[48%] rounded-2xl p-5 ${
              isSelected ? option.selectedBgClass : option.bgClass
            } ${isSelected ? 'border-2 border-purple-500' : 'border-2 border-transparent'}`}
            style={isSelected ? { transform: [{ scale: 1.03 }] } : undefined}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}: ${option.description}`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              className={`text-lg font-bold mb-1 ${
                isSelected ? 'text-purple-700' : 'text-gray-800'
              }`}
            >
              {option.label}
            </Text>
            <Text className="text-sm text-gray-500">{option.description}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
