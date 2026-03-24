// Pre-define globals that expo/src/winter/runtime.native.ts tries to install
// via dynamic require(), which fails in Jest 30's sandboxed runtime.

if (typeof globalThis.__ExpoImportMetaRegistry === 'undefined') {
  Object.defineProperty(globalThis, '__ExpoImportMetaRegistry', {
    value: { url: null },
    writable: true,
    configurable: true,
  });
}

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

if (typeof globalThis.TextDecoderStream === 'undefined') {
  globalThis.TextDecoderStream = class TextDecoderStream {};
}

if (typeof globalThis.TextEncoderStream === 'undefined') {
  globalThis.TextEncoderStream = class TextEncoderStream {};
}
