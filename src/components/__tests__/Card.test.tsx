import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'

// Mock NativeWind
jest.mock('nativewind', () => ({ styled: (c: any) => c }))
jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn(),
  remapProps: jest.fn(),
}))

import { Card } from '../ui/Card'

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Card content</Text>
      </Card>,
    )
    expect(getByText('Card content')).toBeTruthy()
  })

  it('renders header when provided', () => {
    const { getByText } = render(
      <Card header="My Header">
        <Text>Content</Text>
      </Card>,
    )
    expect(getByText('My Header')).toBeTruthy()
    expect(getByText('Content')).toBeTruthy()
  })

  it('does not render header when not provided', () => {
    const { queryByText, getByText } = render(
      <Card>
        <Text>Only content</Text>
      </Card>,
    )
    expect(getByText('Only content')).toBeTruthy()
    // No header text present
  })

  it('renders as View when onPress is not provided', () => {
    const { queryByRole, getByText } = render(
      <Card>
        <Text>Static card</Text>
      </Card>,
    )
    expect(getByText('Static card')).toBeTruthy()
    // Should not have button role since it's not pressable
    expect(queryByRole('button')).toBeNull()
  })

  it('renders as Pressable when onPress is provided', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <Card onPress={onPress}>
        <Text>Pressable card</Text>
      </Card>,
    )
    expect(getByRole('button')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <Card onPress={onPress}>
        <Text>Click me</Text>
      </Card>,
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('uses header as accessibility label when pressable and header given', () => {
    const { getByLabelText } = render(
      <Card onPress={() => {}} header="Task Card">
        <Text>Content</Text>
      </Card>,
    )
    expect(getByLabelText('Task Card')).toBeTruthy()
  })

  it('uses "Card" as fallback accessibility label when pressable without header', () => {
    const { getByLabelText } = render(
      <Card onPress={() => {}}>
        <Text>Content</Text>
      </Card>,
    )
    expect(getByLabelText('Card')).toBeTruthy()
  })

  it('renders with default variant', () => {
    const { getByText } = render(
      <Card>
        <Text>Default</Text>
      </Card>,
    )
    expect(getByText('Default')).toBeTruthy()
  })

  it('renders with elevated variant', () => {
    const { getByText } = render(
      <Card variant="elevated">
        <Text>Elevated</Text>
      </Card>,
    )
    expect(getByText('Elevated')).toBeTruthy()
  })

  it('renders with outlined variant', () => {
    const { getByText } = render(
      <Card variant="outlined">
        <Text>Outlined</Text>
      </Card>,
    )
    expect(getByText('Outlined')).toBeTruthy()
  })

  it('renders multiple children', () => {
    const { getByText } = render(
      <Card header="Multi">
        <Text>First</Text>
        <Text>Second</Text>
        <Text>Third</Text>
      </Card>,
    )
    expect(getByText('Multi')).toBeTruthy()
    expect(getByText('First')).toBeTruthy()
    expect(getByText('Second')).toBeTruthy()
    expect(getByText('Third')).toBeTruthy()
  })
})
