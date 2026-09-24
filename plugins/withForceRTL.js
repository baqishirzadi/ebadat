/**
 * Config plugin that seeds RTL layout on the very first app launch.
 * Modifies MainApplication.kt to call I18nUtil.allowRTL()/forceRTL() in onCreate,
 * because otherwise RTL only applies after a restart (known React Native issue).
 *
 * The seed is guarded on the stored preference being absent: once the user has a
 * stored direction, JS owns it, so picking English can turn RTL back off.
 */
const { withFinalizedMod, withPlugins } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const IOS_SEED = `  /// Seeds RTL on the very first launch only (the app defaults to Dari). After
  /// that the stored value is owned by JS so picking English can turn RTL off.
  private func seedInitialLayoutDirection() {
    let defaults = UserDefaults.standard
    guard defaults.object(forKey: "RCTI18nUtil_forceRTL") == nil else { return }
    defaults.set(true, forKey: "RCTI18nUtil_allowRTL")
    defaults.set(true, forKey: "RCTI18nUtil_forceRTL")
  }

`;

function withForceRTLIos(config) {
  return withFinalizedMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest?.projectRoot ?? process.cwd();
      const appDelegatePath = path.join(
        projectRoot,
        'ios',
        config.modRequest?.projectName ?? 'abadt',
        'AppDelegate.swift'
      );

      if (!fs.existsSync(appDelegatePath)) return config;

      let contents = fs.readFileSync(appDelegatePath, 'utf8');
      if (contents.includes('seedInitialLayoutDirection')) return config;

      contents = contents.replace(
        /(\n\s*let delegate = ReactNativeDelegate\(\))/,
        '\n    seedInitialLayoutDirection()\n$1'
      );
      contents = contents.replace(/(\n  \/\/ Linking API)/, `\n${IOS_SEED}$1`);

      fs.writeFileSync(appDelegatePath, contents);
      return config;
    },
  ]);
}

function withForceRTLAndroid(config) {
  return withFinalizedMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest?.projectRoot ?? process.cwd();
      const packageName = config.android?.package ?? 'com.afghandev.ebadat';
      const packagePath = packageName.replace(/\./g, path.sep);
      const mainAppPath = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        packagePath,
        'MainApplication.kt'
      );

      if (!fs.existsSync(mainAppPath)) return config;

      let contents = fs.readFileSync(mainAppPath, 'utf8');
      if (contents.includes('I18nUtil')) return config;

      // Add import after existing imports
      const importLine = 'import com.facebook.react.modules.i18nmanager.I18nUtil';
      if (!contents.includes(importLine)) {
        contents = contents.replace(
          /(import com\.facebook\.react\.common\.assets\.ReactFontManager)/,
          `$1\nimport com.facebook.react.modules.i18nmanager.I18nUtil`
        );
      }

      // Seed the direction right after super.onCreate(), first launch only.
      const rtlInit = `
    // Seed RTL on first launch only (the app defaults to Dari). After that the
    // stored value is owned by JS so switching to English can turn RTL off.
    val i18nPrefs = getSharedPreferences(
      "com.facebook.react.modules.i18nmanager.I18nUtil",
      android.content.Context.MODE_PRIVATE
    )
    if (!i18nPrefs.contains("RCTI18nUtil_forceRTL")) {
      val sharedI18nUtilInstance = I18nUtil.getInstance()
      sharedI18nUtilInstance.allowRTL(this, true)
      sharedI18nUtilInstance.forceRTL(this, true)
    }`;

      contents = contents.replace(
        /override fun onCreate\(\) \{\s*\n\s*super\.onCreate\(\)/,
        `override fun onCreate() {\n    super.onCreate()${rtlInit}`
      );

      fs.writeFileSync(mainAppPath, contents);
      return config;
    },
  ]);
}

function withForceRTL(config) {
  return withForceRTLIos(withForceRTLAndroid(config));
}

module.exports = withForceRTL;
