// Expo config plugin: adopt the UIScene lifecycle on iOS.
//
// Building with the iOS 27 SDK (Xcode 27) and launching without a
// UIApplicationSceneManifest traps on the main thread at scene creation
// (___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption, SIGTRAP,
// white screen for ~1 s). The Expo 56 bare template still creates its window
// in AppDelegate, so this plugin moves window creation into a SceneDelegate
// and declares the scene manifest. It is idempotent.
const { withInfoPlist, withAppDelegate } = require("expo/config-plugins");

const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;

const SCENE_DELEGATE = `
// UIScene adoption (see plugins/with-ios-scene-lifecycle.js).
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }
    let window = UIWindow(windowScene: windowScene)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions)
    self.window = window
    appDelegate.window = window
    for context in connectionOptions.urlContexts {
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
    }
  }
}
`;

function patchAppDelegate(contents) {
  if (contents.includes("class SceneDelegate")) return contents;
  if (!WINDOW_BLOCK.test(contents)) {
    throw new Error(
      "with-ios-scene-lifecycle: AppDelegate.swift window block not found; template changed",
    );
  }
  return (
    contents
      .replace(
        WINDOW_BLOCK,
        "    // Window creation moved to SceneDelegate (UIScene lifecycle).\n    self.launchOptions = launchOptions\n",
      )
      .replace(
        "  var window: UIWindow?\n",
        "  var window: UIWindow?\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n",
      ) + SCENE_DELEGATE
  );
}

module.exports = function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return c;
  });
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== "swift") {
      throw new Error("with-ios-scene-lifecycle: expected a Swift AppDelegate");
    }
    c.modResults.contents = patchAppDelegate(c.modResults.contents);
    return c;
  });
};
