---
description: Deploy Mobile App to iOS (EAS Build)
---

# Prerequisites
-   **Apple Developer Account** ($99/year) is **REQUIRED** for iOS deployment (even for internal testing).
-   **EAS CLI** installed.

# Steps

1.  **Install EAS CLI** (if not installed)
    ```powershell
    npm install -g eas-cli
    ```

2.  **Login to Expo**
    ```powershell
    eas login
    ```

3.  **Configure EAS** (Run inside `mobile` directory)
    ```powershell
    cd mobile
    eas build:configure
    ```
    -   Select `iOS`.

4.  **Create a Development Build** (For testing on your device with full features like Background Geofencing)
    ```powershell
    eas build --profile development --platform ios
    ```
    -   Follow the prompts to log in to your Apple Account.
    -   EAS will generate a **Provisioning Profile** for your device.

5.  **Install on iPhone**
    -   Scan the QR code generated at the end of the build.
    -   Or go to the link provided.

# Production Build (App Store)
To submit to the App Store:
```powershell
eas build --profile production --platform ios
```
-   Upload the `.ipa` file to App Store Connect using "Transporter" app on Mac or EAS Submit.
