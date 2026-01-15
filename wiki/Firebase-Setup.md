# Firebase Setup

This guide walks you through setting up Firebase for the Crease application.

## Overview

Crease uses Firebase for:
- **Authentication** - User sign up, login, and session management
- **Cloud Firestore** - Real-time NoSQL database for matches and user profiles
- **Security Rules** - Backend authorization and data protection

## Create Firebase Project

### 1. Go to Firebase Console

Visit https://console.firebase.google.com/

### 2. Create New Project

1. Click **"Add project"** or **"Create a project"**
2. **Project name**: `crease` (or your preferred name)
3. Click **Continue**
4. **Google Analytics**: Optional (you can disable for development)
5. Click **Create project**
6. Wait for setup to complete (~30 seconds)
7. Click **Continue**

### 3. Add Web App

1. On the project overview page, click the **Web icon** (`</>`)
2. **App nickname**: `Crease Web`
3. **Firebase Hosting**: Leave unchecked
4. Click **Register app**
5. You'll see your Firebase configuration object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

6. **Copy these values** - you'll need them for the `.env` file
7. Click **Continue to console**

## Enable Authentication

### 1. Navigate to Authentication

1. In the left sidebar, click **Authentication** (or **Build → Authentication**)
2. Click **Get started**

### 2. Enable Email/Password Sign-In

1. Click the **Sign-in method** tab
2. Click **Email/Password** provider
3. Toggle **Enable** switch to ON
4. Click **Save**

**Optional:** Enable **Email link (passwordless sign-in)** if you want passwordless login (not currently implemented in Crease)

### 3. Add Test User (Optional)

1. Go to **Users** tab
2. Click **Add user**
3. Enter email and password
4. Click **Add user**

You can use this account for testing.

## Set Up Cloud Firestore

### 1. Create Firestore Database

1. In the left sidebar, click **Firestore Database** (or **Build → Firestore Database**)
2. Click **Create database**

### 2. Choose Security Rules

Select **Start in test mode** for development:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2024, 3, 1);
    }
  }
}
```

**⚠️ Important:** Test mode allows all reads and writes for 30 days. We'll set up proper security rules next.

### 3. Choose Location

Select a Firestore location closest to your users:
- `us-central1` (Iowa) - Default
- `europe-west1` (Belgium)
- `asia-northeast1` (Tokyo)

**Note:** This cannot be changed later!

Click **Enable**.

### 4. Set Up Collections

Firestore will automatically create collections when you write data, but you can manually create them:

1. Click **Start collection**
2. **Collection ID**: `users`
3. Click **Next**
4. Add a dummy document (will be replaced by real data):
   - **Document ID**: `dummy`
   - **Field**: `placeholder` (string) = `"delete_me"`
5. Click **Save**

Repeat for `matches` collection (optional, will be auto-created).

## Configure Security Rules

### 1. Open Rules Editor

1. Go to **Firestore Database**
2. Click **Rules** tab

### 2. Replace with Production Rules

Replace the test mode rules with these production-ready rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             getUserData().role in ['admin', 'president'];
    }
    
    function isUmpire(matchData) {
      return isAuthenticated() && 
             request.auth.uid == matchData.umpireUid;
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone authenticated can read any profile
      allow read: if isAuthenticated();
      
      // Users can only create/update their own profile
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      
      // Only admins can change roles
      allow update: if isAdmin() && 
                       request.resource.data.diff(resource.data)
                       .affectedKeys().hasOnly(['role']);
      
      // Prevent deletion
      allow delete: if false;
    }
    
    // Matches collection
    match /matches/{matchId} {
      // Anyone authenticated can read matches
      allow read: if isAuthenticated();
      
      // Only admins can create matches
      allow create: if isAdmin();
      
      // Only admins and assigned umpire can update
      allow update: if isAdmin() || isUmpire(resource.data);
      
      // Only admins can delete
      allow delete: if isAdmin();
    }
  }
}
```

### 3. Publish Rules

Click **Publish** button.

### Rule Explanation

**Users Collection:**
- ✅ Any authenticated user can read any profile
- ✅ Users can create/update only their own profile
- ✅ Admins can change user roles
- ❌ No one can delete users

**Matches Collection:**
- ✅ Any authenticated user can read matches
- ✅ Only admins/presidents can create matches
- ✅ Admins and assigned umpires can update matches
- ✅ Only admins can delete matches

## Configure App Environment

### 1. Create `.env` File

In your project root, create `.env`:

```bash
cd /path/to/crease
touch .env
```

### 2. Add Firebase Configuration

Edit `.env` and add your Firebase config from step 3 of "Create Firebase Project":

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Important:**
- Use `EXPO_PUBLIC_` prefix (required by Expo SDK 50+)
- Don't add quotes around values
- Don't commit this file to Git (already in `.gitignore`)

### 3. Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Clear cache and restart
npx expo start --clear
```

## Verify Setup

### 1. Check Firebase Connection

Run the app and check the Expo terminal for:

```
✓ Firebase initialized
✓ Auth configured  
✓ Firestore connected
```

### 2. Test Authentication

1. Open the app
2. Click **Sign Up**
3. Enter email and password
4. If successful, you'll see the profile setup screen

### 3. Check Firestore

1. Go to Firebase Console → Firestore
2. Check `users` collection
3. You should see a new document with your user ID

### 4. Test Real-time Updates

1. In the app, create a match (as admin)
2. In Firebase Console, go to `matches` collection
3. Manually edit the match status
4. The app should update instantly!

## Firestore Data Structure

### Users Collection (`users/{uid}`)

```
users/
  ├── {uid}/
  │     ├── uid: string
  │     ├── name: string
  │     ├── studentId: string
  │     ├── role: "player" | "admin" | "president"
  │     ├── createdAt: timestamp
  │     └── updatedAt: timestamp
```

**Example:**
```json
{
  "uid": "abc123xyz",
  "name": "John Doe",
  "studentId": "STU12345",
  "role": "player",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Matches Collection (`matches/{matchId}`)

```
matches/
  ├── {matchId}/
  │     ├── status: "upcoming" | "live" | "completed"
  │     ├── createdBy: string (uid)
  │     ├── umpireUid: string (uid)
  │     ├── teamA: map
  │     │   ├── name: string
  │     │   └── playerUids: array<string>
  │     ├── teamB: map
  │     │   ├── name: string
  │     │   └── playerUids: array<string>
  │     ├── score: map
  │     │   ├── runs: number
  │     │   ├── wickets: number
  │     │   ├── overs: number
  │     │   └── balls: number
  │     ├── createdAt: timestamp
  │     └── updatedAt: timestamp
```

**Example:**
```json
{
  "status": "live",
  "createdBy": "admin_uid",
  "umpireUid": "umpire_uid",
  "teamA": {
    "name": "Mumbai Indians",
    "playerUids": ["player1", "player2"]
  },
  "teamB": {
    "name": "Chennai Super Kings",
    "playerUids": ["player3", "player4"]
  },
  "score": {
    "runs": 45,
    "wickets": 2,
    "overs": 7,
    "balls": 3
  },
  "createdAt": "2024-01-15T14:00:00Z",
  "updatedAt": "2024-01-15T15:23:15Z"
}
```

## Indexing (Optional)

For better query performance, you can add indexes:

### Composite Indexes

1. Go to **Firestore → Indexes** tab
2. Click **Add index**
3. Collection: `matches`
4. Fields to index:
   - `status` Ascending
   - `createdAt` Descending
5. Query scope: Collection
6. Click **Create**

This optimizes queries like:
```typescript
query(
  matchesCollection(), 
  where('status', '==', 'live'),
  orderBy('createdAt', 'desc')
)
```

## Billing & Quotas

### Free Tier Limits (Spark Plan)

- **Firestore reads:** 50,000/day
- **Firestore writes:** 20,000/day
- **Firestore deletes:** 20,000/day
- **Storage:** 1 GB
- **Network:** 10 GB/month

For development, free tier is sufficient.

### Monitor Usage

1. Go to **Usage and billing** in Firebase Console
2. Check **Firestore** usage
3. Set up budget alerts if needed

## Troubleshooting

### "Permission denied" errors

**Problem:** Security rules blocking operations

**Solutions:**
1. Check you're authenticated (`request.auth != null`)
2. Verify rules are published
3. Check user has correct role in Firestore
4. Test rules in **Rules Playground** tab

### "Firebase not initialized"

**Problem:** Missing or incorrect `.env` configuration

**Solutions:**
1. Verify `.env` file exists in project root
2. Check all `EXPO_PUBLIC_FIREBASE_*` variables are set
3. Restart Expo with `--clear` flag
4. Check Firebase config in console matches `.env`

### Real-time updates not working

**Problem:** Listeners not set up correctly

**Solutions:**
1. Check internet connection
2. Verify Firestore rules allow reads
3. Check listener cleanup (unsubscribe on unmount)
4. Look for errors in Expo terminal

### Can't create admin user

**Problem:** New users default to "player" role

**Solutions:**
1. Sign up normally
2. Go to Firebase Console → Firestore → users
3. Find your user document
4. Edit `role` field to `"admin"` or `"president"`
5. Restart app

## Best Practices

### Security

✅ **Do:**
- Use environment variables for config
- Implement proper security rules
- Validate data on client and server
- Use transactions for critical updates

❌ **Don't:**
- Commit Firebase config to public repos
- Use admin SDK in client app
- Allow unauthenticated writes
- Store sensitive data in Firestore without encryption

### Performance

✅ **Do:**
- Use real-time listeners for live data
- Unsubscribe from listeners on unmount
- Index frequently queried fields
- Use transactions for atomic updates

❌ **Don't:**
- Poll Firestore repeatedly
- Fetch all documents at once
- Read more data than needed
- Ignore offline persistence

### Cost Optimization

✅ **Do:**
- Cache data when possible
- Use limit() on queries
- Batch related operations
- Monitor usage dashboard

❌ **Don't:**
- Fetch unnecessary fields
- Create infinite listeners
- Ignore read quotas
- Store large files in Firestore

## Next Steps

Now that Firebase is configured:

1. **Test the app** - See [TESTING_GUIDE.md](../TESTING_GUIDE.md)
2. **Understand real-time system** - Read [Live Scoring System](Live-Scoring-System.md)
3. **Start developing** - Check [Contribution Guide](Contribution-Guide.md)

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase React Native](https://rnfirebase.io/) (alternative library)

---

**Firebase setup complete!** Your backend is ready for development. 🚀
