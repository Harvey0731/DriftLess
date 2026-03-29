import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

export type EnergyLevel = 'good' | 'meh' | 'low' | 'need-a-break'

interface EnergyOption {
  key: EnergyLevel
  emoji: string
  label: string
  description: string
}

const ENERGY_OPTIONS: EnergyOption[] = [
  { key: 'good',          emoji: '☀️',  label: 'Good',         description: 'Ready to tackle the day' },
  { key: 'meh',           emoji: '⛅',  label: 'Meh',          description: 'Moderate energy, manageable' },
  { key: 'low',           emoji: '☁️',  label: 'Low',          description: 'Struggling but present' },
  { key: 'need-a-break',  emoji: '⛈️', label: 'Need a Break', description: 'Not a work day' },
]

interface EnergySelectorProps {
  selectedEnergy: EnergyLevel | null
  onSelect: (energy: EnergyLevel) => void
}

export default function EnergySelector({ selectedEnergy, onSelect }: EnergySelectorProps) {
  return (
    <View style={{ gap: 16, width: '100%' }}>
      {ENERGY_OPTIONS.map((option) => {
        const isSelected = selectedEnergy === option.key

        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={({ pressed }) => ({
              width: '100%',
              backgroundColor: isSelected ? '#FFFFFF' : '#F6F3F1',
              borderRadius: 24,
              padding: 28,
              borderWidth: 2,
              borderColor: isSelected ? '#4C54BB' : '#E4E2DF',
              opacity: pressed ? 0.9 : 1,
            })}
            accessibilityRole="radio"
            accessibilityLabel={`${option.label}: ${option.description}`}
            accessibilityState={{ selected: isSelected }}
          >
            {/* Checkmark badge — top right corner, only when selected */}
            {isSelected && (
              <View style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#4C54BB',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name="check" size={14} color="#FFFFFF" />
              </View>
            )}

            {/* Emoji */}
            <Text style={{ fontSize: 44, marginBottom: 20 }}>{option.emoji}</Text>

            {/* Label */}
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#323331',
              marginBottom: 6,
            }}>
              {option.label}
            </Text>

            {/* Description */}
            <Text style={{
              fontSize: 15,
              color: '#5f5f5d',
              lineHeight: 22,
            }}>
              {option.description}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
