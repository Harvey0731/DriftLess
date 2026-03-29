import React from 'react'
import { View, Text, TouchableOpacity, Platform } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface TrustScoreWidgetProps {
  score: number
  onViewBreakdown?: () => void
}

function getInsightText(score: number): string {
  if (score >= 81) return "Your consistency has been exceptional. You're building real trust with yourself."
  if (score >= 61) return 'Your consistency in the "Toolbox" sessions this week has increased your reliability rating by 4 points. Keep the momentum.'
  if (score >= 31) return "You're building momentum. Each promise kept strengthens your foundation."
  return "Every step forward counts. You're rebuilding trust with yourself."
}

/**
 * Pure-View circular progress using the classic two-semicircle clip technique.
 * Works without react-native-svg.
 */
function CircleProgress({ percentage, size }: { percentage: number; size: number }) {
  const half = size / 2
  const thickness = 10
  const bgThickness = 7
  const activeColor = '#4C54BB'
  const bgColor = '#EAE8E5'

  // Clamp 0-100
  const pct = Math.max(0, Math.min(100, percentage))
  // Convert to degrees (0% = 0deg, 100% = 360deg)
  const degrees = (pct / 100) * 360

  // Right half covers 0-180deg, left half covers 180-360deg
  const rightRotation = Math.min(degrees, 180)
  const leftRotation = Math.max(degrees - 180, 0)

  return (
    <View style={{ width: size, height: size }}>
      {/* Background ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: bgThickness,
          borderColor: bgColor,
        }}
      />

      {/* Right half (0-180 degrees) */}
      {pct > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: half,
            width: half,
            height: size,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: size,
              height: size,
              borderRadius: half,
              borderWidth: thickness,
              borderColor: 'transparent',
              borderTopColor: activeColor,
              borderRightColor: activeColor,
              marginLeft: -half,
              transform: [{ rotate: `${rightRotation}deg` }],
            }}
          />
        </View>
      )}

      {/* Left half (180-360 degrees) */}
      {pct > 50 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: half,
            height: size,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: size,
              height: size,
              borderRadius: half,
              borderWidth: thickness,
              borderColor: 'transparent',
              borderBottomColor: activeColor,
              borderLeftColor: activeColor,
              transform: [{ rotate: `${leftRotation}deg` }],
            }}
          />
        </View>
      )}
    </View>
  )
}

function TrustScoreWidget({ score, onViewBreakdown }: TrustScoreWidgetProps) {
  const insight = getInsightText(score)
  const percentage = Math.min(score, 100)

  return (
    <View
      className="mx-5 mt-6 bg-white rounded-2xl p-7"
      style={{
        shadowColor: '#323331',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.06,
        shadowRadius: 40,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(179, 178, 175, 0.05)',
      }}
      accessibilityLabel={`Trust Score: ${score} out of 100`}
    >
      {/* On mobile: stacked vertically (circle centered, text below) */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
          <CircleProgress percentage={percentage} size={140} />
          {/* Center label */}
          <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 38, fontWeight: '800', color: '#323331' }}>{score}</Text>
            <Text style={{ fontSize: 9, color: '#5f5f5d', letterSpacing: 2.5, fontWeight: '600', marginTop: 1, textTransform: 'uppercase' }}>
              Trust Score
            </Text>
          </View>
        </View>
      </View>

      {/* Info section */}
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialIcons name="verified-user" size={22} color="#006B64" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#323331' }}>You're gaining ground</Text>
        </View>

        <Text style={{ fontSize: 14, color: '#5f5f5d', lineHeight: 22, textAlign: 'center', paddingHorizontal: 4 }}>
          {insight}
        </Text>

        <TouchableOpacity
          onPress={onViewBreakdown}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 4 }}
          accessibilityLabel="View detailed breakdown"
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#4C54BB' }}>
            View detailed breakdown
          </Text>
          <MaterialIcons name="arrow-forward" size={16} color="#4C54BB" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default React.memo(TrustScoreWidget)
