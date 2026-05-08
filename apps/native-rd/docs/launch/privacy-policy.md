# Privacy Policy - rollercoaster.dev

**Last updated:** 2026-05-06

This policy applies to the **rollercoaster.dev mobile app** for iOS and Android.

rollercoaster.dev is local-first. Goals, steps, evidence, badges, and preferences stay on your device unless you choose to export or share them.

The app does not use accounts, analytics, advertising identifiers, or usage tracking.

## Summary

The app stores your work locally on your device.

Limited crash and error diagnostics may be sent to Sentry when the app crashes or hits an error. These reports are used only to find and fix bugs and are configured to avoid personal data and user-created app content.

## What stays on your device

The app stores the following data locally on your device:

- **Goals** - titles, descriptions, status, completion dates
- **Steps** - titles, order, status, completion dates
- **Evidence** - photos, text notes, voice memos, videos, links, and files you attach to goals or steps
- **Badges** - Open Badges 3.0 credentials generated when you complete a goal
- **Badge keys** - cryptographic keys and identifiers used to sign your badges
- **Preferences** - your chosen theme, density, animation settings, and first-launch state

App content is stored in a local SQLite database managed by Evolu. Badge signing keys are stored in your device's secure storage.

User-created app content is not intentionally sent to Sentry.

## What data leaves your device

The app may send limited crash and error diagnostics to Sentry in TestFlight, preview, and production builds.

We use Sentry only for crash and error reporting. We do not use it for analytics, advertising, session replay, product tracking, or performance monitoring.

Crash reports may include technical diagnostic data needed to debug crashes, such as:

- App version
- OS version
- Device model or device class
- Stack traces
- Error type and error message
- Timestamp

Sentry events are configured to avoid personal data:

- No user identity is set in Sentry
- Default personal information collection is disabled
- No screenshots
- No view hierarchy
- No session replay
- No performance tracing
- No app-start tracking
- No user-interaction tracing
- No console logs
- Console, navigation, storage, and request breadcrumbs are dropped or scrubbed
- Request URLs are reduced to host-only
- Request headers, cookies, bodies, query strings, event extras, and user fields are removed before sending

This means crash diagnostics may leave your device, but they are configured not to include your goals, steps, evidence, badges, preferences, account details, advertising identifiers, or usage history.

## Personal data on badges

Badges do not require a name, email address, account, or public profile. Current badges identify the badge subject with a locally generated cryptographic identifier, not with personal contact information.

A future version may let you optionally add identity details, such as a display name, full name, email address, website, or profile image. If added, this information will remain under your control:

- It will be optional.
- It will be stored locally unless you choose an opt-in sync or sharing feature.
- It will not be added to badges by default.
- You will be shown what identity fields are included before a badge is signed, exported, or shared.
- Existing exported or shared badge copies may not be recallable, because recipients can keep their own copies.

## What we do not collect

The app does not collect or transmit your user-created app content. The app also does not collect:

- User accounts or registration details
- Email addresses
- Analytics events
- Usage tracking
- Advertising identifiers
- Social graph data
- Location tracking
- Cloud copies of your goals, steps, evidence, badges, or preferences

## Device permissions

The app requests device permissions only when you choose to use the related feature.

| Permission    | Why                                                          | When                                             |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| Camera        | Take photos or record videos as evidence for your goals      | Only when you choose photo or video capture      |
| Photo Library | Select existing photos as evidence                           | Only when you tap "Choose Photo"                 |
| Microphone    | Record voice memos or audio with video evidence              | Only when you choose voice memo or video capture |
| Files         | Select a file as evidence through the system document picker | Only when you tap "Choose File"                  |

These permissions are requested at the moment you first use each feature, not at app launch. You can revoke any permission at any time in your device settings.

Captured media and selected files are stored locally on your device unless you choose to export or share them.

## Sync

The current app does not provide cloud sync.

A future version may offer optional end-to-end encrypted sync between your devices using Evolu's sync protocol. If implemented:

- Sync will be opt-in, not automatic.
- Data will be end-to-end encrypted.
- The sync server will not be able to read your data.
- You will be able to disable sync and delete synced data.
- This privacy policy will be updated before sync is released.

## Third-party services

The app uses Sentry as a third-party service provider for crash and error diagnostics only.

The app does not integrate with third-party analytics, advertising, or tracking services.

The app is distributed through the Apple App Store and Google Play Store. Those platforms may collect their own data under their own privacy policies. Their privacy practices are separate from the app's behavior.

- Apple Privacy Policy: https://www.apple.com/legal/privacy/
- Google Privacy Policy: https://policies.google.com/privacy

## Privacy checks before release

Before Sentry-enabled builds are promoted to TestFlight or the App Store, we perform privacy verification to check that Sentry events are scrubbed as described in this policy.

## Children's privacy

The app is not designed to collect personal data from children. The app does not use accounts, analytics, advertising identifiers, or usage tracking.

Crash diagnostics may still be sent if the app crashes or hits an error. Those reports are configured to avoid personal data and user-created app content.

## Data deletion

Your goals, steps, evidence, badges, and preferences are stored locally on your device. To delete them:

- Delete individual goals, steps, or evidence within the app.
- Uninstall the app to remove all app data from your device.

Crash diagnostics sent to Sentry are separate from your local app content. Because the app does not use accounts and Sentry events are scrubbed, we may not be able to connect a crash report back to a specific person or device.

## Changes to this policy

If this policy changes, the updated version will be posted at this URL with a new "Last updated" date.

Material changes, such as introducing sync or new data transmission, will be clearly communicated before release.

## Contact

If you have questions about this privacy policy:

- Email: hello@rollercoaster.dev
- GitHub: https://github.com/rollercoaster-dev

## Jurisdiction

This app is developed in Germany.

German and EU data protection rules, including the GDPR, may apply where crash diagnostics are considered personal data. Sentry acts as a third-party processor/service provider for crash diagnostics.

You can contact us about privacy rights or questions at hello@rollercoaster.dev.
