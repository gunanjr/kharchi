import raw from './app.json';

/**
 * Single source of truth for the (placeholder) product name: edit src/config/app.json
 * (JSON so that app.config.ts, which cannot import sibling .ts files, can share it), then run `npx expo prebuild --clean`.
 */
export const appConfig = raw as {
  appName: string;
  slug: string;
  scheme: string;
  androidPackage: string;
  iosBundleId: string;
  defaultCurrency: string;
  privacyPolicyUrl: string;
  supportEmail: string;
};
