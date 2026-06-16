const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Some pods (e.g. react-native-view-shot 5.1.0) hardcode a low `s.platform`
// in their podspec, which their privacy-manifest resource bundle inherits.
// Expo's `react_native_post_install` only bumps *pod* targets, not the
// resource-bundle targets, so those keep the stale value and Xcode 26 warns:
//   Pods/...-RNViewShotPrivacyInfo: iOS@9.0 deployment version mismatch
// This plugin appends a loop to the generated Podfile's existing post_install
// block that raises every Pods target below MIN_TARGET up to MIN_TARGET.
const MARKER = "# rd: bump resource-bundle deployment targets";
const MIN_TARGET = "15.1";

const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current && current.to_f < ${MIN_TARGET}
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'
        end
      end
    end`;

module.exports = function withResourceBundleDeploymentTarget(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");

      if (!contents.includes(MARKER)) {
        const patched = contents.replace(
          /(react_native_post_install\([\s\S]*?\n {4}\))/,
          `$1\n${SNIPPET}`,
        );
        if (patched === contents) {
          throw new Error(
            "[withResourceBundleDeploymentTarget] could not find react_native_post_install call to anchor the deployment-target bump",
          );
        }
        fs.writeFileSync(podfile, patched);
      }

      return cfg;
    },
  ]);
};
