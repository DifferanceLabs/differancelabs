# Optional native iOS app later

The delivered version is a hosted PWA. Keep using it from Home Screen for as long as it meets the business's needs. It requires neither Apple Developer Program membership nor a Mac. The connected development computer is Windows; no native project, signing certificate or Apple purchase was created.

Current Apple guidance was checked September 5, 2026. Recheck regional pricing and distribution rules before buying anything.

| Option | Account / build computer | Maintenance and fit |
| --- | --- | --- |
| Home Screen PWA | Safari on each iPhone/iPad; Windows can develop/deploy | No native signing expiration or App Store submission. Online server saves and ordinary app session expiry still apply. Recommended for this version. |
| Personal Team native testing | Ordinary Apple Account and access to Mac/Xcode | Free provisioning is temporary. Apple's current comparison lists up to 3 registered devices, 3 apps per device and 10 App IDs, with seven-day provisioning/App ID/device expiry. Rebuild/reinstall after expiry. Frequent renewal is inconvenient for regular classes. |
| Paid Ad Hoc | Apple Developer Program; Mac/Xcode or suitable macOS build/signing service | Private installation on registered devices without a public App Store listing. Profiles/certificates expire and signed builds must be renewed/reinstalled. |
| TestFlight | Paid developer membership; Mac/Xcode or suitable macOS build/signing service for builds | Beta distribution with builds available for up to 90 days. Upload replacements regularly; external testing requires beta review. Not a permanent deployment. |

[Apple account comparison](https://developer.apple.com/help/account/basics/about-your-developer-account/) currently says three Personal Team devices without promising a larger total across platforms. Plan for that stated limit; do not promise permanent free sideloading on arbitrary iPads/iPhones or extra free devices based on platform assumptions.

For paid Ad Hoc, Apple currently permits up to **100 devices per product family per membership year**. Removing a device during that year does not simply free a consumed slot; review/reset the device list at renewal. [Devices overview](https://developer.apple.com/help/account/devices/devices-overview/).

An Account Holder or Admin creates an Ad Hoc profile in **Certificates, Identifiers & Profiles → Profiles → + → Distribution: Ad Hoc**, chooses the app's matching App ID, distribution certificate and registered devices, names/generates the profile, and downloads it for Xcode. Archive and export a properly signed IPA for those devices using the matching profile. [Apple Ad Hoc procedure](https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile/).

Installation can be performed through Apple's supported development/registered-device workflow, including Xcode or Apple Configurator on a Mac. Record the actual certificate/profile expiration dates from the signed build; membership renewal alone does not re-sign an installed app. Renew the membership and credentials as needed, generate a fresh profile, rebuild/export and reinstall before expiration. Confirm Developer Mode/device trust requirements for the specific OS/build method. [Apple registered-device distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-to-registered-devices).

TestFlight supports up to 100 internal App Store Connect testers and 10,000 external testers. Internal testers need appropriate App Store Connect access. The first build for external testing goes through TestFlight App Review; later builds may also require review. Testers install TestFlight and accept an invitation. Each build's 90-day window makes it a beta tool, with an ongoing replacement obligation. [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).

Apple currently lists **US $99 per membership year**, charged in local currency where available. Regional prices/tax can differ; verify the checkout for the owner's region before recommending or authorizing a purchase. Enrollment/account verification may require the owner personally. [Apple enrollment](https://developer.apple.com/programs/enroll/).

## Ordered conversion checklist — future work only

1. Reconfirm a native-only requirement that justifies the extra signing and maintenance. Preserve the hosted HTTPS API, server authorization and PostgreSQL data model.
2. Arrange access to a Mac with supported Xcode, or a macOS CI/build/signing service that supports the selected distribution method. Windows alone cannot run Xcode or produce Apple's native archive through Xcode.
3. Choose the developer account/team and distribution route. Register a unique bundle ID and appropriate capabilities. Do not invent a team ID, certificate or provisioning profile now.
4. Create the wrapper project in an isolated new folder. A small wrapper such as Capacitor could reuse the web UI, but this repository does not yet contain or depend on a native wrapper.
5. Adapt authentication deliberately. A wrapper's bundled origin and cookie store differ from Safari. Use a system browser and a properly registered return/deep-link or reviewed device exchange; preserve one-use launch tokens, current grants, secure native secret storage, and anti-CSRF/origin protections. Never broadly allow arbitrary origins to make the wrapper work.
6. On macOS, install the selected wrapper dependencies, generate its iOS project, open it in Xcode, choose the real team/bundle ID and signing settings, then build on physical devices. These commands/configuration cannot be finalized before the native project, framework version and developer setup exist.
7. Personal Team: connect/register allowed devices in Xcode and run the app; schedule rebuild/reinstall within seven days. Ad Hoc: register each device identifier, sign/archive/export the IPA, then install using a supported route. TestFlight: create the App Store Connect app, archive/upload, satisfy processing/compliance and beta review, then invite testers.
8. Repeat all handoff, revocation, shared-record, uncertain-save, photo, print/share, background/foreground, and expiry tests in the real wrapper on each supported device.
9. Document signing ownership, secure certificate/private-key storage, profile expiration, renewal/reinstall responsibility and a fallback to the working PWA. Native updates must remain compatible with the live database.

Third-party sideload helpers do not remove Apple's signing, account, device or renewal limits. No jailbreak, borrowed enterprise certificate or regional-distribution workaround is needed or recommended here.
