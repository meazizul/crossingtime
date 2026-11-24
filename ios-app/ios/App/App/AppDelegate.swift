import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAudioSession()
        return true
    }

    // MARK: UIScene lifecycle
    //
    // iOS 27 terminates, at launch, any app built with the current SDK that
    // still uses the app-delegate-only lifecycle (EXC_BREAKPOINT inside
    // UIKit's "EvaluateRuntimeIssueForNoSceneLifecycleAdoption"). That is the
    // "crashes as soon as I try to open it" seen on an iPhone 14 Pro Max on
    // iOS 27.0.1 with build 1, reproduced in the iOS 27 simulator. Devices on
    // iOS 26 were unaffected, which is why it was missed. The scene manifest
    // lives in Info.plist; the storyboard named there supplies the window and
    // Capacitor's bridge view controller exactly as before.
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        configuration.storyboard = UIStoryboard(name: "Main", bundle: nil)
        return configuration
    }

    /// The feedback tones ARE the product. By default a WKWebView plays through
    /// the `ambient` session, which the hardware ringer switch silences — a
    /// student standing at a corner with the switch flipped would hear nothing
    /// and have no way to know why. `playback` keeps the cues audible
    /// regardless of the switch. `.mixWithOthers` means we duck nothing, so
    /// VoiceOver speech and the user's own audio keep working alongside us.
    private func configureAudioSession() {
        // GapSenseAudio.swift owns the session and keeps it in .playback.
        _ = GSAudio.shared
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

/// Scene delegate for the single window. The storyboard (Info.plist →
/// UISceneStoryboardFile) creates the window and Capacitor's bridge view
/// controller; this class only forwards URL opens and user activities to
/// Capacitor, which with scenes arrive here instead of at the app delegate.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard scene is UIWindowScene else { return }
        for context in connectionOptions.urlContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [:])
        }
        for activity in connectionOptions.userActivities {
            // A Siri phrase the student recorded (build 26, tracker 25.2).
            if GSSiriShortcuts.route(activity) { continue }
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
        }
    }

    /// Tracker 28.6: after a setup link handed over from Safari or Messages,
    /// the page was sometimes left drawn at about 70% of its size until the
    /// app was closed. If the page is zoomed out when the app comes forward,
    /// it is put back to full size. A page the student has zoomed in (scale
    /// above 1) is left alone.
    func sceneDidBecomeActive(_ scene: UIScene) {
        guard let webView = (window?.rootViewController as? CAPBridgeViewController)?.webView else { return }
        let scroll = webView.scrollView
        if scroll.zoomScale < 0.99 { scroll.setZoomScale(1, animated: false) }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [:])
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        if GSSiriShortcuts.route(userActivity) { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
