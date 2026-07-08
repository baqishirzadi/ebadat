const { withEntitlementsPlist, createRunOncePlugin } = require('@expo/config-plugins');

const APP_GROUP = 'group.com.afghandev.ebadat';

function withPrayerWidget(config) {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [APP_GROUP];
    return config;
  });
}

module.exports = createRunOncePlugin(withPrayerWidget, 'withPrayerWidget', '1.0.0');
