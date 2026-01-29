# Testing Guide - How to Test All Features

## Current Status
✅ **App is working correctly!**

The "No matches yet" message you're seeing is the **empty state** - it's what shows when there are no matches in the database yet.

## How to Test the App

### Option 1: Change Your Role to Admin (Recommended)

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: "crease-d88ac"
3. **Go to Firestore Database** (left sidebar)
4. **Find your user document**:
   - Click on `users` collection
   - Find the document with your user ID
   - Click on it
5. **Edit the `role` field**:
   - Click the pencil icon next to `role: "player"`
   - Change it to `"admin"` or `"president"`
   - Click **Update**
6. **Restart the app** (close and reopen)
7. **You'll now see** the "+ Create Match" button on the home screen!

### Option 2: Create Matches Manually in Firestore

1. **Go to Firestore Database** in Firebase Console
2. **Click "+ Start collection"** (if matches collection doesn't exist)
3. **Collection ID**: `matches`
4. **Add a document** with these fields:

```
Document ID: (auto-generate)

Fields:
- status: "upcoming" (string)
- createdBy: "YOUR_USER_UID" (string)
- umpireUid: "YOUR_USER_UID" (string)
- teamA: (map)
  - name: "Mumbai Indians" (string)
  - playerUids: [] (array)
- teamB: (map)
  - name: "Royal Challangers Banglore" (string)
  - playerUids: [] (array)
- score: (map)
  - runs: 0 (number)
  - wickets: 0 (number)
  - overs: 0 (number)
  - balls: 0 (number)
- createdAt: (timestamp - click "ADD FIELD" → timestamp → now)
- updatedAt: (timestamp - click "ADD FIELD" → timestamp → now)
```

5. **Click Save**
6. **Go back to the app** - the match will appear automatically!

## Testing All Features

### 1. Test Home Screen ✓
- Already working! Empty state shows correctly

### 2. Test Admin Features
After changing role to admin:

1. **Home screen** will show "+ Create Match" button
2. **Click it** to go to create match screen
3. **Fill in the form**:
   - Team A Name: "Mumbai Indians"
   - Team A Player UIDs: (leave empty or add fake UIDs)
   - Team B Name: "Royal Challangers Banglore"  
   - Team B Player UIDs: (leave empty or add fake UIDs)
   - Umpire UID: YOUR_USER_UID (get it from Firebase Console)
4. **Click "Create Match"**
5. **Match appears** on home screen instantly!

### 3. Test Match Details
1. **Click any match** from the home screen
2. **See match details**:
   - Team names
   - Status badge
   - Team information
3. **If you're the umpire**, you'll see "🏏 Open Scoring Panel" button

### 4. Test Umpire Scoring
1. **Create a match** with your UID as umpire
2. **Open the match** from home screen
3. **Click "🏏 Open Scoring Panel"**
4. **Click "Start Match"** - status changes to LIVE
5. **Try scoring buttons**:
   - Click "+4" - runs increase to 4
   - Click "Next Ball" - balls increase to 1
   - Click "+6" - runs increase to 10
   - Click "Next Ball" 5 more times - after 6 balls, overs increment!
   - Click "Wicket" - wickets increase
6. **Go back to home screen** - score updates in real-time!
7. **Click "Complete Match"** - status changes to COMPLETED

## Quick Test Script

Here's the fastest way to test everything:

```bash
1. Log out from the app
2. Sign up with a new account (e.g., admin@test.com / password123)
3. Complete profile setup
4. Go to Firebase Console → Firestore → users → find your new user
5. Change role to "admin"
6. Restart the app
7. Click "+ Create Match"
8. Fill in:
   - Team A: "Test Team A"
   - Team B: "Test Team B"
   - Umpire UID: (copy your UID from Firebase Console)
9. Click Create Match
10. Click the new match
11. Click "🏏 Open Scoring Panel"
12. Click "Start Match"
13. Play with the scoring buttons!
14. Go back to home screen - watch it update in real-time!
```

## Understanding Roles

### Player (Default)
- ✅ Can view matches
- ✅ Can view match details
- ❌ Cannot create matches
- ❌ Cannot score matches

### Admin or President
- ✅ Can view matches
- ✅ Can view match details
- ✅ **Can create matches** (+ Create Match button appears)
- ✅ Can score matches (if assigned as umpire)

## Getting Your User UID

### Method 1: Firebase Console
1. Go to Firestore Database
2. Click `users` collection
3. The document ID is your UID

### Method 2: In the App (Add Debug)
I can add a feature to show your UID in the app if needed!

## Common Issues

### "No matches yet" showing
- ✅ **This is correct!** It means there are no matches in the database
- Create a match or change your role to admin to create one

### Can't see "Create Match" button
- Your role is "player" (not admin/president)
- Change role in Firebase Console

### Can't access umpire panel
- You're not the assigned umpire for that match
- Create a new match with your UID as umpire

## Next Steps

1. **Change your role to admin** (Option 1 above)
2. **Create your first match**
3. **Test the scoring system**
4. **Invite other users** to test multiplayer

The app is fully functional - you just need some data! 🚀
