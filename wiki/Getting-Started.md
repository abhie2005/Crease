# Getting Started

This guide will help you set up the Crease development environment on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```
   Download from: https://nodejs.org/

2. **npm** (comes with Node.js)
   ```bash
   npm --version  # Should be 8.0.0 or higher
   ```

3. **Git**
   ```bash
   git --version
   ```
   Download from: https://git-scm.com/

4. **Expo CLI** (optional, but recommended)
   ```bash
   npm install -g expo-cli
   ```

5. **Watchman** (for macOS users)
   ```bash
   brew install watchman
   ```

### Development Environment

Choose one or more:

- **iOS Simulator** (macOS only)
  - Install Xcode from Mac App Store
  - Install Command Line Tools: `xcode-select --install`
  
- **Android Emulator**
  - Install Android Studio
  - Set up Android SDK and emulator
  
- **Physical Device**
  - Install Expo Go app from App Store / Play Store
  - Or set up for native builds (see DEVICE_SETUP.md)

### Firebase Account

- Create a free Firebase account at https://firebase.google.com/
- See [Firebase Setup](Firebase-Setup.md) for detailed configuration

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/crease.git
cd crease
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React Native and Expo dependencies
- Firebase SDK
- Navigation and routing libraries
- Development tools

### 3. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Firebase configuration:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Important:** Never commit the `.env` file to version control. It's already in `.gitignore`.

### 4. Configure Firebase

Follow the [Firebase Setup](Firebase-Setup.md) guide to:
- Create a Firebase project
- Enable Authentication (Email/Password)
- Create Firestore database
- Set up security rules

## Running the App

### Development Mode

Start the Expo development server:

```bash
npm start
```

This opens the Expo Developer Tools in your browser.

### iOS Simulator (macOS only)

```bash
npm run ios
```

Or press `i` in the terminal after running `npm start`.

### Android Emulator

```bash
npm run android
```

Or press `a` in the terminal after running `npm start`.

### Physical Device

#### Method 1: Expo Go (Development)

1. Install Expo Go on your device
2. Run `npm start`
3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

#### Method 2: Native Build (Production-like)

For iOS with Developer Mode enabled:

```bash
npm run ios:device
```

See `DEVICE_SETUP.md` for detailed instructions.

## Verify Installation

### 1. Check the App Launches

The app should open and show the login screen:

```
┌─────────────────┐
│     Crease      │
│                 │
│  Sign in to     │
│   continue      │
│                 │
│  [Email Input]  │
│  [Pass Input]   │
│  [Sign In]      │
│                 │
│  Don't have an  │
│  account?       │
│  Sign Up        │
└─────────────────┘
```

### 2. Test Account Creation

1. Click "Sign Up"
2. Enter email and password
3. Complete profile setup
4. Should redirect to home screen with "No matches yet"

### 3. Check Firebase Connection

In the Expo terminal, you should see:
```
✓ Firebase initialized
✓ Auth configured
✓ Firestore connected
```

If you see errors, check:
- Firebase configuration in `.env`
- Internet connection
- Firebase project is active

## Project Structure

After installation, your project structure should look like:

```
crease/
├── app/                      # Expo Router screens
│   ├── (auth)/              # Authentication screens
│   ├── profile/             # Profile screens
│   ├── match/               # Match screens
│   ├── admin/               # Admin screens
│   ├── umpire/              # Umpire screens
│   └── index.tsx            # Home screen
├── src/
│   ├── components/          # Reusable UI components
│   ├── firebase/            # Firebase configuration
│   ├── models/              # TypeScript types
│   ├── providers/           # React Context providers
│   └── services/            # Business logic
├── assets/                  # Images and static files
├── .env                     # Environment variables (create this)
├── app.config.ts            # Expo configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript configuration
```

## Common Issues

### "Metro bundler not responding"

**Solution:**
```bash
# Clear cache and restart
npx expo start --clear
```

### "Cannot find module 'expo-router'"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### "Firebase configuration missing"

**Solution:**
- Check `.env` file exists
- Verify all `EXPO_PUBLIC_FIREBASE_*` variables are set
- Restart Expo with `npx expo start --clear`

### "No apps connected"

**Solution:**
- For simulator: Make sure it's running before starting Expo
- For device: Check that both device and computer are on same WiFi
- Try `npm run ios` or `npm run android` to auto-launch

### iOS Simulator not opening

**Solution:**
```bash
# List available simulators
xcrun simctl list devices

# Open simulator manually
open -a Simulator

# Then run: npm run ios
```

### Android Emulator issues

**Solution:**
- Open Android Studio
- Go to AVD Manager
- Start an emulator manually
- Then run: `npm run android`

## Development Tools

### Recommended VS Code Extensions

- **ES7+ React/Redux/React-Native snippets** - Code snippets
- **Prettier** - Code formatting
- **ESLint** - Code linting
- **React Native Tools** - Debugging
- **TypeScript** - Enhanced TypeScript support

### Debugging

1. **Console Logs**: Use `console.log()` - appears in Expo terminal

2. **React Native Debugger**: 
   - Press `j` in Expo terminal to open Chrome debugger

3. **Expo DevTools**: 
   - Shake device or press `Ctrl+M` (Android) / `Cmd+D` (iOS)

4. **Error Overlay**: 
   - Red screen shows errors automatically in development

## Next Steps

Now that your development environment is set up:

1. **Understand the Architecture** - Read [Project Architecture](Project-Architecture.md)
2. **Configure Firebase** - Complete [Firebase Setup](Firebase-Setup.md)
3. **Create Test Data** - Follow [TESTING_GUIDE.md](../TESTING_GUIDE.md)
4. **Start Developing** - See [Contribution Guide](Contribution-Guide.md)

## Getting Help

If you encounter issues:

1. Check this documentation
2. Search existing GitHub issues
3. Open a new issue with:
   - Your environment (OS, Node version, etc.)
   - Steps to reproduce
   - Error messages
   - Screenshots if applicable

---

**Ready to dive deeper?** Check out [Project Architecture](Project-Architecture.md) to understand how Crease is built!
