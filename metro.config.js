const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Supabase realtime-js bundles `ws` (Node.js WebSocket) which depends on
// Node.js built-ins like `stream`, `bufferutil`, `utf-8-validate`.
// React Native provides its own global WebSocket, so we stub these out.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Stub out Node.js-only modules used by supabase realtime
  if (
    moduleName === 'ws' ||
    moduleName === 'stream' ||
    moduleName === 'bufferutil' ||
    moduleName === 'utf-8-validate'
  ) {
    return { type: 'empty' }
  }
  // Stub out native-only modules that are no longer installed
  if (
    moduleName === 'react-native-nitro-modules' ||
    moduleName === 'react-native-mmkv' ||
    moduleName === 'react-native-purchases' ||
    moduleName === '@sentry/react-native'
  ) {
    return { type: 'empty' }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css' })
