# Running Crease on Your iPhone

You have **two options** to run the app on your iPhone connected via wire:

## Option 1: Direct Build & Run (Recommended for Development)

This builds and installs directly on your connected iPhone using Xcode.

### Prerequisites:
- Xcode installed on your Mac
- iPhone connected via USB cable
- Trust the computer on your iPhone when prompted

### Steps:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run on your connected iPhone:**
   ```bash
   npm run ios:device
   ```
   
   Or directly:
   ```bash
   npx expo run:ios --device
   ```

3. **Select your iPhone** from the device list when prompted.

This will:
- Build the app for your iPhone
- Install it directly on your device
- Launch it automatically

## Option 2: EAS Build (For Production/Testing)

This creates a build that you can install via TestFlight or direct install.

### Prerequisites:
- EAS CLI installed: `npm install -g eas-cli`
- Expo account (free): Sign up at [expo.dev](https://expo.dev)

### Steps:

1. **Install EAS CLI globally:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS (if not already done):**
   ```bash
   eas build:configure
   ```

4. **Build for your iPhone:**
   ```bash
   # Development build (for testing)
   npm run build:ios:dev
   
   # Or production build
   npm run build:ios
   ```

5. **Follow the prompts** to select your build profile and options.

6. **Install on device:**
   - After build completes, you'll get a download link
   - Open the link on your iPhone
   - Install the app

## Quick Start (Recommended)

For fastest setup to test on your iPhone:

```bash
# 1. Make sure iPhone is connected and trusted
# 2. Run this command:
npm run ios:device
```

This will automatically:
- Detect your connected iPhone
- Build the app
- Install and launch it

## Troubleshooting

### "No devices found"
- Make sure iPhone is unlocked
- Trust the computer on your iPhone
- Check USB cable connection
- Try unplugging and replugging

### "Xcode not found"
- Install Xcode from Mac App Store
- Open Xcode once to accept license
- Install Command Line Tools: `xcode-select --install`

### "Code signing error"
- Open Xcode
- Go to Preferences → Accounts
- Add your Apple ID
- Select your team in project settings

### Build takes too long
- First build always takes longer (10-15 minutes)
- Subsequent builds are faster
- Make sure you have good internet connection

## Notes

- **Option 1** is faster for development and testing
- **Option 2** is better for sharing with others or production builds
- Both methods require your iPhone to be connected via USB
- The app will stay installed on your iPhone after first build
