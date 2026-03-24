import React, { useState } from 'react'
import { View, Text, Image } from 'react-native'

type AvatarSize = 'sm' | 'md' | 'lg'

interface AvatarProps {
  name: string
  imageUri?: string
  size?: AvatarSize
}

const sizeConfig: Record<AvatarSize, { container: string; text: string; pixels: number }> = {
  sm: { container: 'h-8 w-8', text: 'text-xs', pixels: 32 },
  md: { container: 'h-12 w-12', text: 'text-base', pixels: 48 },
  lg: { container: 'h-16 w-16', text: 'text-xl', pixels: 64 },
}

function getInitials(name: string): string {
  if (!name.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function Avatar({ name, imageUri, size = 'md' }: AvatarProps) {
  const config = sizeConfig[size]
  const initials = getInitials(name)
  const [imageError, setImageError] = useState(false)

  if (imageUri && !imageError) {
    return (
      <Image
        source={{ uri: imageUri }}
        className={`rounded-full ${config.container}`}
        style={{ width: config.pixels, height: config.pixels }}
        accessibilityRole="image"
        accessibilityLabel={`${name}'s avatar`}
        onError={() => setImageError(true)}
      />
    )
  }

  return (
    <View
      className={`items-center justify-center rounded-full bg-[#C4B5FD] ${config.container}`}
      accessibilityRole="image"
      accessibilityLabel={`${name}'s avatar`}
    >
      <Text className={`font-semibold text-[#8B5CF6] ${config.text}`}>{initials}</Text>
    </View>
  )
}
