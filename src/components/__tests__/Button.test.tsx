import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'

// Mock NativeWind
jest.mock('nativewind', () => ({ styled: (c: any) => c }))
jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn(),
  remapProps: jest.fn(),
}))

import { Button } from '../ui/Button'

describe('Button', () => {
  it('renders with title text', () => {
    const { getByText } = render(
      <Button title="Press Me" onPress={() => {}} />,
    )
    expect(getByText('Press Me')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <Button title="Click" onPress={onPress} />,
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <Button title="Click" onPress={onPress} disabled />,
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('does not call onPress when loading', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <Button title="Submit" onPress={onPress} loading />,
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('shows loading indicator when loading', () => {
    const { getByLabelText, queryByText } = render(
      <Button title="Submit" onPress={() => {}} loading />,
    )
    expect(getByLabelText('Loading')).toBeTruthy()
    // Title text is not rendered when loading
    expect(queryByText('Submit')).toBeNull()
  })

  it('shows title text when not loading', () => {
    const { getByText, queryByLabelText } = render(
      <Button title="Submit" onPress={() => {}} />,
    )
    expect(getByText('Submit')).toBeTruthy()
    expect(queryByLabelText('Loading')).toBeNull()
  })

  it('renders primary variant by default', () => {
    const { getByText } = render(
      <Button title="Primary" onPress={() => {}} />,
    )
    expect(getByText('Primary')).toBeTruthy()
  })

  it('renders secondary variant', () => {
    const { getByText } = render(
      <Button title="Secondary" onPress={() => {}} variant="secondary" />,
    )
    expect(getByText('Secondary')).toBeTruthy()
  })

  it('renders ghost variant', () => {
    const { getByText } = render(
      <Button title="Ghost" onPress={() => {}} variant="ghost" />,
    )
    expect(getByText('Ghost')).toBeTruthy()
  })

  it('renders danger variant', () => {
    const { getByText } = render(
      <Button title="Danger" onPress={() => {}} variant="danger" />,
    )
    expect(getByText('Danger')).toBeTruthy()
  })

  it('renders accent variant', () => {
    const { getByText } = render(
      <Button title="Accent" onPress={() => {}} variant="accent" />,
    )
    expect(getByText('Accent')).toBeTruthy()
  })

  it('has correct accessibility role', () => {
    const { getByRole } = render(
      <Button title="Action" onPress={() => {}} />,
    )
    expect(getByRole('button')).toBeTruthy()
  })

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(
      <Button title="Save Changes" onPress={() => {}} />,
    )
    expect(getByLabelText('Save Changes')).toBeTruthy()
  })

  it('sets disabled accessibility state when disabled', () => {
    const { getByRole } = render(
      <Button title="Disabled" onPress={() => {}} disabled />,
    )
    const button = getByRole('button')
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    )
  })

  it('sets busy accessibility state when loading', () => {
    const { getByRole } = render(
      <Button title="Loading" onPress={() => {}} loading />,
    )
    const button = getByRole('button')
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true }),
    )
  })

  it('renders icon when provided', () => {
    const icon = <Text testID="test-icon">*</Text>
    const { getByTestId } = render(
      <Button title="With Icon" onPress={() => {}} icon={icon} />,
    )
    expect(getByTestId('test-icon')).toBeTruthy()
  })

  it('does not render icon when loading', () => {
    const icon = <Text testID="test-icon">*</Text>
    const { queryByTestId } = render(
      <Button title="With Icon" onPress={() => {}} icon={icon} loading />,
    )
    expect(queryByTestId('test-icon')).toBeNull()
  })
})
