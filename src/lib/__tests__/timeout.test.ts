import { withTimeout, TimeoutError, DEFAULT_TIMEOUT_MS } from '../timeout'

describe('TimeoutError', () => {
  it('creates error with correct name and message', () => {
    const err = new TimeoutError(5000)
    expect(err.name).toBe('TimeoutError')
    expect(err.message).toBe('Request timed out after 5000ms')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(TimeoutError)
  })
})

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('resolves with the value if promise completes before timeout', async () => {
    const promise = Promise.resolve('data')
    const result = await withTimeout(promise, 5000)
    expect(result).toBe('data')
  })

  it('rejects with original error if promise rejects before timeout', async () => {
    const promise = Promise.reject(new Error('DB error'))
    await expect(withTimeout(promise, 5000)).rejects.toThrow('DB error')
  })

  it('rejects with TimeoutError when promise does not settle in time', async () => {
    const neverResolves = new Promise<string>(() => {})
    const racePromise = withTimeout(neverResolves, 3000)

    jest.advanceTimersByTime(3000)

    await expect(racePromise).rejects.toThrow(TimeoutError)
    await expect(racePromise).rejects.toThrow('Request timed out after 3000ms')
  })

  it('clears the timer after promise resolves (no timer leak)', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    const promise = Promise.resolve(42)
    await withTimeout(promise, 10000)

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('clears the timer after promise rejects (no timer leak)', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    const promise = Promise.reject(new Error('fail'))
    await withTimeout(promise, 10000).catch(() => {})

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('works with PromiseLike objects (not just native Promises)', async () => {
    const thenable: PromiseLike<number> = {
      then(onFulfilled) {
        return Promise.resolve(99).then(onFulfilled)
      },
    }
    const result = await withTimeout(thenable, 5000)
    expect(result).toBe(99)
  })
})

describe('DEFAULT_TIMEOUT_MS', () => {
  it('is 10 seconds', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(10_000)
  })
})
