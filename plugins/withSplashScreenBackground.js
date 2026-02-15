/**
 * Config plugin to ensure Android splash screen never shows white.
 * Adds windowBackground, statusBarColor, navigationBarColor to the splash theme.
 * Uses withFinalizedMod to run after styles are written.
 */
const { withFinalizedMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withSplashScreenBackground(config) {
  return withFinalizedMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest?.projectRoot ?? process.cwd();
      const stylesPath = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
        'values',
        'styles.xml'
      );
      if (!fs.existsSync(stylesPath)) return config;

      let contents = fs.readFileSync(stylesPath, 'utf8');
      if (contents.includes('android:windowBackground')) return config;

      const extraItems = [
        '    <item name="android:windowBackground">@color/splashscreen_background</item>',
        '    <item name="android:statusBarColor">@color/splashscreen_background</item>',
        '    <item name="android:navigationBarColor">@color/splashscreen_background</item>',
      ].join('\n');

      contents = contents.replace(
        /(<item name="android:windowSplashScreenBehavior">icon_preferred<\/item>)(\s*)(<\/style>)/,
        `$1\n${extraItems}\n  $3`
      );

      fs.writeFileSync(stylesPath, contents);
      return config;
    },
  ]);
}

module.exports = withSplashScreenBackground;
