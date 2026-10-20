# Browser preview (design work only)

Not part of the app. Lets the UI be viewed and screenshotted on a laptop, where there is no phone simulator.

    npm install --no-save react-native-web react-dom @expo/metro-runtime sql.js
    BRUHME_PREVIEW=1 npx expo start --web --port 8101

Open http://localhost:8101 at a phone-sized window (390 x 844). Query flags: `?onboarding` shows first-run, `?empty` skips demo data,
`?theme=dark` or `?theme=light` forces the theme. `metro.config.js` swaps `src/db/expoDb` and `src/features/native/headless`
for the stand-ins in this folder, only when BRUHME_PREVIEW=1 and only on web. Native builds never see them.
