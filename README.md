# Crease

A React Native mobile app built with Expo and TypeScript for managing cricket matches, scoring, and team administration.

## Features

- **Authentication**: Email/password authentication using Firebase Auth
- **Profile Management**: User profile setup with name and student ID
- **Matches**: View matches list with real-time updates
- **Match Details**: View detailed match information
- **Admin Features**: Create matches (admin/president only)
- **Umpire Scoring**: Live scoring interface for umpires

## Tech Stack

- **Expo** (~50.0.0)
- **Expo Router** (~3.4.0) for file-based routing
- **React Native** (0.73.2)
- **TypeScript** (^5.1.3)
- **Firebase** (^10.7.1) - Modular SDK v9+
  - Firebase Auth
  - Cloud Firestore

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase project with Authentication and Firestore enabled

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:**
   
   Create a `.env` file in the root directory (or set environment variables) with the following:
   
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

   **Note:** These values can be found in your Firebase project settings under "Your apps" > "SDK setup and configuration" > "Config".

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on your device:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your physical device

## Environment Variables

The following environment variables are required for Firebase configuration:

- `EXPO_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase Auth domain (usually `{project-id}.firebaseapp.com`)
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase Storage bucket (usually `{project-id}.appspot.com`)
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase Messaging sender ID
- `EXPO_PUBLIC_FIREBASE_APP_ID` - Firebase App ID

These are loaded from `process.env` in `app.config.ts` and passed to the Firebase initialization.

## Project Structure

```
/
├── app/                    # Expo Router routes
│   ├── (auth)/            # Auth group routes
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── profile/
│   │   └── setup.tsx
│   ├── _layout.tsx        # Root layout with AuthProvider
│   └── index.tsx          # Home screen
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   ├── firebase/          # Firebase configuration
│   │   ├── config.ts      # Firebase initialization
│   │   ├── auth.ts        # Auth helpers
│   │   └── firestore.ts   # Firestore references
│   ├── models/            # TypeScript types
│   │   ├── User.ts
│   │   └── Match.ts
│   ├── providers/         # Context providers
│   │   └── AuthProvider.tsx
│   └── services/          # Firestore CRUD operations
│       ├── users.ts
│       └── matches.ts
├── app.config.ts          # Expo config with Firebase env vars
├── package.json
└── tsconfig.json
```

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
  createdBy: string;        // uid
  umpireUid: string;        // uid
  teamA: { name: string, playerUids: string[] };
  teamB: { name: string, playerUids: string[] };
  score: { runs: number, wickets: number, overs: number, balls: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Authentication Flow

1. User signs up or logs in
2. If user has no profile document in Firestore, they are redirected to `/profile/setup`
3. Once profile is created, user can access the home screen
4. Route guarding is handled automatically by `AuthProvider` in `app/_layout.tsx`

## Development

- The app uses Expo Router for navigation (file-based routing)
- All Firebase operations use the modular SDK (v9+)
- TypeScript is used throughout for type safety
- Real-time updates are implemented using Firestore listeners
- Score updates use Firestore transactions for consistency

## License

MIT

# Crease
