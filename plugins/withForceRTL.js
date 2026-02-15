/**
 * Config plugin to force RTL layout on first app launch.
 * Modifies MainApplication.kt to call I18nUtil.forceRTL() and allowRTL() in onCreate.
 * Without this, RTL only applies after app restart (known React Native issue).
 */
const { withFinalizedMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withForceRTL(config) {
  return withFinalizedMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest?.projectRoot ?? process.cwd();
      const packageName = config.android?.package ?? 'com.afghandev.namaz';
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

      // Add forceRTL and allowRTL right after super.onCreate()
      const rtlInit = `
    val sharedI18nUtilInstance = I18nUtil.getInstance()
    sharedI18nUtilInstance.allowRTL(this, true)
    sharedI18nUtilInstance.forceRTL(this, true)`;

      contents = contents.replace(
        /override fun onCreate\(\) \{\s*\n\s*super\.onCreate\(\)/,
        `override fun onCreate() {\n    super.onCreate()${rtlInit}`
      );

      fs.writeFileSync(mainAppPath, contents);
      return config;
    },
  ]);
}

module.exports = withForceRTL;
