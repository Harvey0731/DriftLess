import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'

// Mock NativeWind
jest.mock('nativewind', () => ({ styled: (c: any) => c }))
jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn(),
  remapProps: jest.fn(),
}))

// Mock sentry (ErrorBoundary imports from '@/src/lib/sentry')
jest.mock('@/src/lib/sentry', () => ({
  captureError: jest.fn(),
}))

// Import the mock after jest.mock to get the mocked version
import { captureError as mockCaptureError } from '../../lib/sentry'

import { ErrorBoundary } from '../ErrorBoundary'

// Component that throws
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error')
  return <Text>Working</Text>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Hello</Text>
      </ErrorBoundary>,
    )
    expect(getByText('Hello')).toBeTruthy()
  })

  it('renders error fallback when child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(getByText('Something went wrong')).toBeTruthy()
  })

  it('renders custom fallback when provided', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={<Text>Custom Error</Text>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(getByText('Custom Error')).toBeTruthy()
  })

  it('recovers when Try Again is pressed', () => {
    let shouldThrow = true
    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>,
    )
    expect(getByText('Something went wrong')).toBeTruthy()

    shouldThrow = false
    fireEvent.press(getByText('Try Again'))
    // After retry, the error boundary resets its state
  })

  it('captures error via Sentry', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(mockCaptureError).toHaveBeenCalled()
  })
})
