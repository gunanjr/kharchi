// Normal builds use Expo's default Metro config. BRUHME_PREVIEW=1 (browser preview only, see preview/README.md)
// swaps two native-only modules for browser stand-ins so the UI can be viewed and screenshotted on a laptop.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

if (process.env.BRUHME_PREVIEW === '1') {
  const SHIMS = new Map([
    [path.join(__dirname, 'src/db/expoDb'), path.join(__dirname, 'preview/expoDb.web.ts')],
    [path.join(__dirname, 'src/features/native/headless'), path.join(__dirname, 'preview/headless.web.ts')],
  ]);
  const original = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web') {
      let abs = null;
      if (moduleName.startsWith('@/')) abs = path.join(__dirname, 'src', moduleName.slice(2));
      else if (moduleName.startsWith('.')) abs = path.resolve(path.dirname(context.originModulePath), moduleName);
      if (abs && SHIMS.has(abs)) return { type: 'sourceFile', filePath: SHIMS.get(abs) };
    }
    return (original ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
