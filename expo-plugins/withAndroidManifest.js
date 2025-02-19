const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withAndroidManifestModification(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults.manifest.application[0]["$"]["tools:replace"] =
      "android:appComponentFactory";
    config.modResults.manifest.application[0]["$"][
      "android:appComponentFactory"
    ] = "androidx.core.app.CoreComponentFactory";

    return config;
  });
};
