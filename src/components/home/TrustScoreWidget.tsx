import React from 'react'
import { View, Text } from 'react-native'

interface TrustScoreWidgetProps {
  score: number
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Strong'
  if (score >= 60) return 'Building'
  if (score >= 40) return 'Growing'
  return 'Starting'
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-accent'
  if (score >= 60) return 'text-primary'
  if (score >= 40) return 'text-warning'
  return 'text-textSecondary'
}

function TrustScoreWidget({ score }: TrustScoreWidgetProps) {
  const label = getScoreLabel(score)
  const colorClass = getScoreColor(score)

  return (
    <View
      className="mx-5 mt-2 flex-row items-center"
      accessibilityLabel={`Trust Score: ${score} out of 100, ${label}`}
    >
      <Text className="text-xs text-textSecondary mr-1">Trust Score:</Text>
      <Text className={`text-xs font-semibold ${colorClass}`}>{score}/100</Text>
      <Text className="text-xs text-textSecondary ml-1">({label})</Text>
    </View>
  )
}

export default React.memo(TrustScoreWidget)
