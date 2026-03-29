import React from 'react'
import { View, Text } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { formatTimer } from '../../utils/time'

const SIZE = 280
const TRACK_WIDTH = 2
const RING_WIDTH = 8
const RADIUS = SIZE / 2 - RING_WIDTH * 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface TimerDisplayProps {
  elapsedSeconds: number
  plannedMinutes: number
  isPaused: boolean
}

export default function TimerDisplay({ elapsedSeconds, plannedMinutes, isPaused }: TimerDisplayProps) {
  const total = Math.max(plannedMinutes * 60, 1)
  const ratio = Math.min(elapsedSeconds / total, 1)
  const dashOffset = CIRCUMFERENCE * (1 - ratio)

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      {/* SVG progress ring */}
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4C54BB" />
            <Stop offset="100%" stopColor="#B8BCFF" />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="transparent"
          stroke="#B3B2AF"
          strokeOpacity={0.25}
          strokeWidth={TRACK_WIDTH}
        />

        {/* Progress arc */}
        {ratio > 0 && (
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="transparent"
            stroke="url(#timerGradient)"
            strokeWidth={RING_WIDTH}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation={-90}
            originX={SIZE / 2}
            originY={SIZE / 2}
          />
        )}
      </Svg>

      {/* Time text */}
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 72,
            fontWeight: '500',
            letterSpacing: -2,
            color: isPaused ? '#A7ADFF' : '#323331',
            lineHeight: 80,
          }}
        >
          {formatTimer(elapsedSeconds)}
        </Text>
        {isPaused && (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#4C54BB',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            Paused
          </Text>
        )}
      </View>
    </View>
  )
}
