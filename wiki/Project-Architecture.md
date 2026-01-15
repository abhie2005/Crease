# Project Architecture

This document explains the architecture, design decisions, and code organization of the Crease application.

## Architecture Overview

Crease follows **Clean Architecture** principles with clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                       │
│         (Screens, Components, Routes)            │
├─────────────────────────────────────────────────┤
│              Presentation Layer                  │
│          (Providers, Hooks, State)               │
├─────────────────────────────────────────────────┤
│               Business Logic                     │
│           (Services, Use Cases)                  │
├─────────────────────────────────────────────────┤
│                Data Layer                        │
│         (Firebase, Models, Types)                │
└─────────────────────────────────────────────────┘
```

## Folder Structure

```
crease/
├── app/                          # UI Layer (Expo Router)
│   ├── _layout.tsx              # Root layout + auth guards
│   ├── index.tsx                # Home screen
│   ├── (auth)/                  # Authentication group
│   │   ├── _layout.tsx         
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── profile/                 # Profile management
│   │   ├── index.tsx
│   │   └── setup.tsx
│   ├── match/                   # Match screens
│   │   └── [id].tsx            # Dynamic route
│   ├── admin/                   # Admin features
│   │   └── create-match.tsx
│   └── umpire/                  # Umpire features
│       └── [id].tsx            # Dynamic route
│
├── src/                         # Business Logic & Data
│   ├── components/              # Reusable UI components
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   │
│   ├── firebase/                # Firebase integration
│   │   ├── config.ts           # Firebase initialization
│   │   ├── auth.ts             # Auth helpers
│   │   └── firestore.ts        # Collection references
│   │
│   ├── models/                  # TypeScript types
│   │   ├── User.ts
│   │   └── Match.ts
│   │
│   ├── providers/               # React Context
│   │   └── AuthProvider.tsx
│   │
│   └── services/                # Business logic
│       ├── users.ts
│       └── matches.ts
│
├── assets/                      # Static files
├── .env                         # Environment variables
├── app.config.ts               # Expo configuration
├── babel.config.js             # Babel configuration
├── package.json                # Dependencies
└── tsconfig.json               # TypeScript config
```

## Layer Details

### 1. UI Layer (`app/`)

Uses **Expo Router** for file-based routing.

#### Route Groups

**Authentication Group** `(auth)/`
- Groups login and signup screens
- Parentheses hide the group name from URLs
- Access via `/login` and `/signup` (not `/auth/login`)

**Dynamic Routes** `[id].tsx`
- Create parameterized routes
- Example: `/match/abc123` → `match/[id].tsx` with `id="abc123"`

#### Root Layout (`app/_layout.tsx`)

The most important file for navigation:

```typescript
export default function RootLayout() {
  return (
    <AuthProvider>           // Global auth state
      <RootLayoutNav />      // Navigation with guards
    </AuthProvider>
  );
}
```

**Route Guards** - Automatic navigation based on state:

```typescript
if (!user) {
  // Not logged in → Login screen
  router.replace('/login');
}
else if (user && !userProfile) {
  // Logged in but no profile → Profile setup
  router.replace('/profile/setup');
}
else if (user && userProfile) {
  // Complete profile → Home or requested route
  if (on auth/profile page) {
    router.replace('/');
  }
}
```

### 2. Presentation Layer (`src/providers/`)

#### AuthProvider

Global authentication state management:

```typescript
interface AuthContextType {
  user: User | null;              // Firebase user
  userProfile: UserProfile | null; // Firestore profile
  loading: boolean;                // Initial load state
  refreshUserProfile: () => Promise<void>;
}
```

**How it works:**

1. Subscribes to Firebase `onAuthStateChanged`
2. When user signs in, fetches profile from Firestore
3. Updates context state
4. Components access via `useAuth()` hook
5. Route guards in `_layout.tsx` react to state changes

**Key Features:**

- Persistent auth state (AsyncStorage)
- Automatic profile fetching
- Manual refresh capability
- Loading state management

### 3. Business Logic (`src/services/`)

Service files contain business logic and data operations.

#### User Service (`users.ts`)

```typescript
// Create or update user profile
export async function createOrUpdateUser(
  uid: string,
  data: Partial<User>
): Promise<void>

// Get user profile
export async function getUser(uid: string): Promise<User | null>
```

#### Match Service (`matches.ts`)

```typescript
// Real-time matches subscription
export function subscribeToMatches(
  callback: (matches: Match[]) => void
): Unsubscribe

// Real-time single match subscription
export function subscribeToMatch(
  matchId: string,
  callback: (match: Match | null) => void
): Unsubscribe

// Create new match
export async function createMatch(...): Promise<string>

// Update score with transaction
export async function updateMatchScore(
  matchId: string,
  newScore: Score
): Promise<void>

// Update match status with transaction
export async function updateMatchStatus(
  matchId: string,
  status: MatchStatus
): Promise<void>
```

**Transaction Usage:**

Firestore transactions ensure atomic updates:

```typescript
await runTransaction(db, async (transaction) => {
  const matchRef = matchDoc(matchId);
  const matchSnap = await transaction.get(matchRef);
  
  // Read current data
  const currentData = matchSnap.data();
  
  // Update atomically
  transaction.update(matchRef, {
    score: newScore,
    updatedAt: serverTimestamp()
  });
});
```

This prevents race conditions when multiple umpires score simultaneously.

### 4. Data Layer

#### Firebase Configuration (`src/firebase/config.ts`)

```typescript
// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);
```

**Key Decisions:**

- Uses Firebase v9+ modular SDK (smaller bundle size)
- AsyncStorage persistence for auth (survives app restarts)
- Environment variables for configuration (security)

#### Type Models (`src/models/`)

**User Model:**

```typescript
export type UserRole = 'player' | 'admin' | 'president';

export interface User {
  uid: string;
  name: string;
  studentId: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Match Model:**

```typescript
export type MatchStatus = 'upcoming' | 'live' | 'completed';

export interface Team {
  name: string;
  playerUids: string[];
}

export interface Score {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
}

export interface Match {
  status: MatchStatus;
  createdBy: string;
  umpireUid: string;
  teamA: Team;
  teamB: Team;
  score: Score;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Data Flow

### Authentication Flow

```
1. User enters credentials
   ↓
2. Screen calls Firebase Auth (firebase/auth.ts)
   ↓
3. Firebase Auth triggers onAuthStateChanged
   ↓
4. AuthProvider catches the change
   ↓
5. AuthProvider fetches user profile (services/users.ts)
   ↓
6. AuthProvider updates context state
   ↓
7. Route guard in _layout.tsx reacts
   ↓
8. User redirected to appropriate screen
```

### Real-time Updates Flow

```
1. Component mounts
   ↓
2. Calls subscribeToMatches/Match (services/matches.ts)
   ↓
3. Service sets up Firestore listener (onSnapshot)
   ↓
4. Component receives initial data
   ↓
5. Firestore detects changes
   ↓
6. Listener callback fires
   ↓
7. Component state updates
   ↓
8. UI re-renders automatically
```

### Scoring Flow

```
1. Umpire clicks scoring button
   ↓
2. Screen calls updateMatchScore (services/matches.ts)
   ↓
3. Service starts Firestore transaction
   ↓
4. Transaction reads current match data
   ↓
5. Transaction calculates new score
   ↓
6. Transaction commits atomically
   ↓
7. Firestore triggers listeners
   ↓
8. All subscribed screens update automatically
```

## Design Patterns

### 1. Repository Pattern

Services (`src/services/`) act as repositories, abstracting data access:

```typescript
// Screens don't know about Firestore internals
const match = await getMatch(id);

// Service handles Firestore complexity
export async function getMatch(id: string) {
  const snap = await getDoc(matchDoc(id));
  return snap.data() as Match;
}
```

### 2. Observer Pattern

Real-time listeners use the observer pattern:

```typescript
useEffect(() => {
  // Subscribe to updates
  const unsubscribe = subscribeToMatches((matches) => {
    setMatches(matches);
  });
  
  // Cleanup on unmount
  return unsubscribe;
}, []);
```

### 3. Provider Pattern

React Context for global state:

```typescript
<AuthProvider>
  <App />
</AuthProvider>

// Any component can access
const { user, userProfile } = useAuth();
```

### 4. Transaction Pattern

Atomic updates for critical operations:

```typescript
// Ensures score updates are atomic
await runTransaction(db, async (transaction) => {
  // Read → Modify → Write (atomically)
});
```

## Role-Based Access Control

### Implementation

Authorization checks at multiple levels:

1. **UI Level** - Hide/show buttons:
```typescript
{userProfile?.role === 'admin' && (
  <Button onPress={createMatch}>Create Match</Button>
)}
```

2. **Route Level** - Access control in screens:
```typescript
if (match.umpireUid !== userProfile?.uid) {
  return <UnauthorizedScreen />;
}
```

3. **Backend Level** - Firestore security rules:
```javascript
allow write: if request.auth.uid == resource.data.umpireUid;
```

### Role Matrix

| Feature | Player | Admin | President | Umpire |
|---------|--------|-------|-----------|--------|
| View matches | ✅ | ✅ | ✅ | ✅ |
| View details | ✅ | ✅ | ✅ | ✅ |
| Create match | ❌ | ✅ | ✅ | ❌ |
| Score match | ❌ | ✅* | ✅* | ✅* |
| Edit match | ❌ | ✅ | ✅ | ❌ |

*Only if assigned as umpire

## Performance Optimizations

### 1. Real-time Listeners

- Use `onSnapshot` for real-time updates (not polling)
- Unsubscribe on component unmount (prevent memory leaks)

### 2. Transactions

- Batch related writes together
- Use transactions for score updates (prevent race conditions)

### 3. Auth Persistence

- AsyncStorage caching (instant app startup)
- No re-authentication on app restart

### 4. Code Splitting

- Expo Router lazy-loads routes
- Only load screens when navigated to

## Testing Strategy

### Unit Tests (Planned)

- Test services in isolation
- Mock Firebase calls
- Test business logic

### Integration Tests (Planned)

- Test auth flow end-to-end
- Test scoring system
- Test real-time updates

### Manual Testing

- See `TESTING_GUIDE.md` for current manual test procedures

## Security Considerations

### 1. Environment Variables

- Firebase config in `.env` (not committed)
- Expo exposes `EXPO_PUBLIC_*` variables to client
- No server-side secrets in this file

### 2. Firestore Rules

```javascript
// Users can only write their own profile
allow write: if request.auth.uid == resource.id;

// Only admins can create matches
allow create: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'president'];
```

### 3. Client-Side Validation

- All forms validate input
- TypeScript ensures type safety
- Firebase Auth enforces password strength

## Next Steps

- **[Firebase Setup](Firebase-Setup.md)** - Configure the backend
- **[Live Scoring System](Live-Scoring-System.md)** - Deep dive into real-time scoring
- **[Contribution Guide](Contribution-Guide.md)** - Start contributing

---

**Questions about the architecture?** Open an issue or check the source code comments for more details!
