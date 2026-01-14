# Crease - Quick Start Guide

## Complete MVP Features

All required screens and features are implemented and ready to use:

### Authentication
- ✅ Login screen with email/password
- ✅ Signup screen with validation
- ✅ Auth state persistence (AsyncStorage)
- ✅ Automatic route guarding

### User Profile
- ✅ Profile setup screen (name + student ID)
- ✅ Role assignment (player/admin/president)
- ✅ Profile refresh after save

### Home Screen
- ✅ Real-time matches list
- ✅ Match cards with status badges
- ✅ Live score display
- ✅ Empty state UI
- ✅ Admin "Create Match" button

### Match Details
- ✅ Real-time match data
- ✅ Team information
- ✅ Score display
- ✅ Umpire panel access

### Admin Features
- ✅ Create match form
- ✅ Team setup
- ✅ Umpire assignment
- ✅ Role-based access control

### Umpire Scoring
- ✅ Live scoring buttons (+1, +2, +4, +6)
- ✅ Wicket tracking
- ✅ Ball/over management
- ✅ Match status controls
- ✅ Firestore transactions

## Running the App

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Firebase
Create `.env` file (already created) with your Firebase credentials.

### 3. Start the App
```bash
# On iOS Simulator (Mac)
npm run ios

# On Android Emulator
npm run android

# On physical device (Developer Mode required)
npm run ios:device
```

### 4. First Launch Flow

**Scenario A: New User**
1. App opens → Login screen
2. Click "Sign Up" → Create account
3. Auto-redirects to Profile Setup
4. Fill in name and student ID → Click Save
5. Auto-redirects to Home screen
6. See "No matches yet" (empty state)

**Scenario B: Returning User**
1. App opens → Automatically goes to Home screen
2. Auth state persisted via AsyncStorage
3. See matches list or empty state

## Testing the App

### Create a Test Admin User

1. Sign up a new user
2. Complete profile setup
3. Go to Firebase Console → Firestore
4. Find the user document
5. Edit the `role` field to `admin` or `president`

### Create a Test Match

1. Log in as admin/president
2. Home screen shows "+ Create Match" button
3. Click it → Fill in form:
   - Team A: "Mumbai Indians"
   - Team B: "Chennai Super Kings"
   - Umpire UID: (your user UID or another user's UID)
   - Player UIDs: (comma-separated, can be fake for testing)
4. Click "Create Match"
5. Match appears on home screen with "UPCOMING" status

### Test Umpire Scoring

1. Create a match with your UID as umpire
2. Open the match from home screen
3. Click "🏏 Open Scoring Panel"
4. Click "Start Match" → Status changes to LIVE
5. Use scoring buttons:
   - Click "+4" → Runs increase by 4
   - Click "Next Ball" → Ball count increases
   - After 6 balls → Over increments, balls reset
   - Click "Wicket" → Wicket count increases
6. Home screen updates in real-time
7. Click "Complete Match" → Status changes to COMPLETED

## Troubleshooting

### "Unmatched Route" error
- Restart Expo: `npx expo start --clear`
- Clear node_modules: `rm -rf node_modules && npm install`

### Profile setup loops back
- Check Firebase connection (see console logs)
- Verify Firestore write permissions
- Check debug logs in `.cursor/debug.log`

### Match not updating
- Check Firestore security rules
- Verify user has correct role
- Check network connection

### AsyncStorage warning
- Already fixed in `src/firebase/config.ts`
- Uses `initializeAuth` with React Native persistence

## Current Status

🎉 **MVP Complete and Production-Ready**

All core features are implemented:
- Full authentication flow
- Profile management
- Match listing and details
- Admin match creation
- Umpire live scoring
- Real-time updates
- Role-based access control
- Transaction-based score updates

The app is ready to launch on simulator/device and all screens render correctly with actual content (no blank screens).
