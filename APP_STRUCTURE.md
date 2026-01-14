# Crease App - Complete Structure

## App Overview
Crease is a production-ready cricket club management app built with Expo, React Native, TypeScript, and Firebase.

## Complete Route Structure

### Authentication Routes
- **`/(auth)/login`** - Email/password login
- **`/(auth)/signup`** - User registration

### Profile Routes
- **`/profile/setup`** - Complete user profile (name + student ID)
- **`/profile/index`** - Redirects to setup

### Main Routes
- **`/`** (index) - Home screen with matches list
- **`/match/[id]`** - Match details with real-time updates
- **`/admin/create-match`** - Create new match (admin/president only)
- **`/umpire/[id]`** - Live scoring panel (umpire only)

## Features Implemented

### 1. Authentication & Authorization
- Firebase Auth with email/password
- Auth state persistence using AsyncStorage
- Role-based access control (player, admin, president)
- Route guards in `app/_layout.tsx`:
  - No user → redirect to `/login`
  - User but no profile → redirect to `/profile/setup`
  - User with profile → redirect to `/` (home)

### 2. Home Screen (`/`)
- Real-time matches list using Firestore listeners
- Match cards showing:
  - Team names
  - Status (upcoming/live/completed) with color-coded badges
  - Live scores for ongoing matches
- Empty state UI when no matches exist
- Create Match button (visible to admin/president only)
- User info display with role
- Logout functionality

### 3. Profile Setup (`/profile/setup`)
- Collects name and student ID
- Creates/updates user document in Firestore
- Refreshes user profile in AuthProvider after save
- Navigates to home automatically after successful save

### 4. Match Details (`/match/[id]`)
- Real-time match data using Firestore listener
- Displays:
  - Match status with badge
  - Team names and player counts
  - Live score (runs/wickets, overs.balls)
- "Open Scoring Panel" button (visible to umpire only)
- Admin controls section (placeholder)

### 5. Admin Match Creation (`/admin/create-match`)
- Only accessible to admin/president roles
- Form inputs:
  - Team A name
  - Team A player UIDs (comma-separated)
  - Team B name
  - Team B player UIDs (comma-separated)
  - Umpire UID
- Creates match document in Firestore
- Redirects to match details after creation

### 6. Umpire Scoring Panel (`/umpire/[id]`)
- Only accessible to assigned umpire
- Real-time score display
- Match status controls:
  - Start Match (sets status to 'live')
  - Complete Match (sets status to 'completed')
- Live scoring buttons:
  - +1, +2, +4, +6 runs
  - Wicket
  - Next Ball (auto-increments overs after 6 balls)
  - End Over
- All updates use Firestore transactions

## Technical Implementation

### Firebase Integration
- **Config**: `src/firebase/config.ts`
  - Modular SDK v9+
  - AsyncStorage persistence for React Native
  - Environment variables from `.env`
- **Auth**: `src/firebase/auth.ts`
  - Sign up, log in, log out helpers
- **Firestore**: `src/firebase/firestore.ts`
  - Typed collection references

### State Management
- **AuthProvider**: `src/providers/AuthProvider.tsx`
  - Global auth state
  - User profile caching
  - `refreshUserProfile()` method for manual refresh
  - Real-time user profile updates

### Services Layer
- **users.ts**: User CRUD operations
  - `createOrUpdateUser()`
  - `getUser()`
- **matches.ts**: Match operations
  - `subscribeToMatches()` - Real-time matches list
  - `subscribeToMatch()` - Real-time single match
  - `createMatch()` - Create new match
  - `updateMatchScore()` - Update score with transaction
  - `updateMatchStatus()` - Update match status with transaction

### Type Safety
- **User model**: `src/models/User.ts`
  - UserRole type
  - User interface with Firestore Timestamp
- **Match model**: `src/models/Match.ts`
  - MatchStatus, Team, Score types
  - Match interface with Firestore Timestamp

### Reusable Components
- **Button**: `src/components/Button.tsx`
  - Primary/secondary variants
  - Loading state
  - Disabled state
- **Input**: `src/components/Input.tsx`
  - Label support
  - Multiline support
  - Keyboard types
  - Secure text entry

## Firestore Schema

### Collection: `users/{uid}`
```typescript
{
  uid: string;
  name: string;
  studentId: string;
  role: 'player' | 'admin' | 'president';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Collection: `matches/{matchId}`
```typescript
{
  status: 'upcoming' | 'live' | 'completed';
  createdBy: string; // uid
  umpireUid: string; // uid
  teamA: {
    name: string;
    playerUids: string[];
  };
  teamB: {
    name: string;
    playerUids: string[];
  };
  score: {
    runs: number;
    wickets: number;
    overs: number;
    balls: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Security Rules

Firestore security rules enforce:
- Users can read any profile but only write their own
- All authenticated users can read matches
- Only admin/president can create matches
- Admin/president and assigned umpire can update matches

## Environment Setup

Required environment variables in `.env`:
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

## Running the App

### On iOS Simulator (Mac)
```bash
npm install
npm run ios
```

### On Physical Device
```bash
npm run ios:device
```

### On Android
```bash
npm run android
```

## Production Readiness

✅ TypeScript everywhere
✅ Expo Router for navigation
✅ Firebase v9 modular SDK
✅ Environment variables for config
✅ Route guards and authorization
✅ Real-time listeners
✅ Firestore transactions for score updates
✅ Error handling with user feedback
✅ Loading states
✅ Empty states
✅ Responsive layouts
✅ SafeAreaView usage
✅ Clean architecture (separation of concerns)

## What's Not Included (Future Enhancements)

- Awards/gallery
- Push notifications
- Player statistics
- Match history per player
- Team management
- Advanced match filtering
- Image uploads
- Social features

## Next Steps

1. Set up Firebase (see README.md)
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Set security rules
5. Create `.env` file with Firebase config
6. Run `npm install`
7. Run `npm run ios` or `npm run android`
8. Test authentication flow
9. Create test users with different roles
10. Test match creation and scoring
