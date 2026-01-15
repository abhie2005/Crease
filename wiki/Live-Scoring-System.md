# Live Scoring System

This document explains how the real-time cricket scoring system works in Crease, including match states, score updates, and the technology behind instant synchronization.

## Overview

Crease uses **Firestore real-time listeners** and **transactions** to provide instant score updates across all connected devices. When an umpire updates a score, all users see the change within milliseconds.

## Match Lifecycle

### State Diagram

```
┌─────────────┐
│  UPCOMING   │ ← Match created by admin
└──────┬──────┘
       │
       │ Umpire clicks "Start Match"
       ↓
┌─────────────┐
│    LIVE     │ ← Umpire scores in real-time
└──────┬──────┘
       │
       │ Umpire clicks "Complete Match"
       ↓
┌─────────────┐
│  COMPLETED  │ ← Match archived (read-only)
└─────────────┘
```

### State Transitions

#### 1. UPCOMING → LIVE

**Trigger:** Umpire clicks "Start Match"

**What happens:**
```typescript
await updateMatchStatus(matchId, 'live');

// Firestore transaction:
transaction.update(matchRef, {
  status: 'live',
  updatedAt: serverTimestamp()
});
```

**UI Changes:**
- Home screen: Badge color changes from orange to red
- Match details: Shows score card
- Umpire panel: Scoring buttons become active

#### 2. LIVE → COMPLETED

**Trigger:** Umpire clicks "Complete Match"

**What happens:**
```typescript
await updateMatchStatus(matchId, 'completed');

// Firestore transaction:
transaction.update(matchRef, {
  status: 'completed',
  updatedAt: serverTimestamp()
});
```

**UI Changes:**
- Home screen: Badge color changes from red to green
- Match details: Shows final score
- Umpire panel: Scoring buttons disabled

## Real-time Updates

### How It Works

#### 1. Client Subscribes

When a user opens the home screen:

```typescript
useEffect(() => {
  const unsubscribe = subscribeToMatches((matches) => {
    setMatches(matches);
  });
  
  return unsubscribe; // Cleanup on unmount
}, []);
```

#### 2. Firestore Listener Created

```typescript
export function subscribeToMatches(
  callback: (matches: Match[]) => void
): Unsubscribe {
  const q = query(
    matchesCollection(),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const matches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(matches);
  });
}
```

#### 3. Umpire Updates Score

```typescript
// Umpire clicks "+4" button
await updateMatchScore(matchId, {
  runs: currentScore.runs + 4,
  wickets: currentScore.wickets,
  overs: currentScore.overs,
  balls: currentScore.balls
});
```

#### 4. Firestore Notifies All Listeners

```
Firestore Server
     ↓ (change detected)
     ├→ Home Screen (updates match card)
     ├→ Match Details (updates score)
     └→ Other Umpire Panel (shows latest)
```

#### 5. UI Updates Automatically

React state updates trigger re-renders:
```typescript
// State updates
setMatches(newMatches);

// Component re-renders with new data
// User sees updated score instantly
```

### Latency

Typical latency: **50-200ms**

Factors:
- Network speed
- Geographic distance to Firestore server
- Device performance

## Score Update System

### Score Structure

```typescript
interface Score {
  runs: number;      // Total runs
  wickets: number;   // Total wickets
  overs: number;     // Completed overs
  balls: number;     // Balls in current over (0-5)
}
```

### Scoring Operations

#### Add Runs

```typescript
const addRuns = async (runs: number) => {
  const newScore: Score = {
    ...currentScore,
    runs: currentScore.runs + runs
  };
  await updateMatchScore(matchId, newScore);
};
```

**Example:** Current score 10/2 (3.4)
- Umpire clicks "+4"
- New score: 14/2 (3.4)

#### Add Wicket

```typescript
const addWicket = async () => {
  const newScore: Score = {
    ...currentScore,
    wickets: currentScore.wickets + 1
  };
  await updateMatchScore(matchId, newScore);
};
```

**Example:** Current score 20/1 (5.2)
- Umpire clicks "Wicket"
- New score: 20/2 (5.2)

#### Next Ball

```typescript
const nextBall = async () => {
  let newBalls = currentScore.balls + 1;
  let newOvers = currentScore.overs;
  
  // After 6 balls, increment over
  if (newBalls >= 6) {
    newBalls = 0;
    newOvers = currentScore.overs + 1;
  }
  
  const newScore: Score = {
    ...currentScore,
    balls: newBalls,
    overs: newOvers
  };
  await updateMatchScore(matchId, newScore);
};
```

**Example:** Current score 30/2 (4.5)
- Umpire clicks "Next Ball"
- New score: 30/2 (5.0) ← Over completed!

#### End Over

```typescript
const endOver = async () => {
  const newScore: Score = {
    ...currentScore,
    balls: 0,
    overs: currentScore.overs + 1
  };
  await updateMatchScore(matchId, newScore);
};
```

Useful for quickly completing an over without clicking "Next Ball" 6 times.

### Over Format Display

Score `35/3 (7.4)` means:
- **35 runs**
- **3 wickets**
- **7 overs** completed
- **4 balls** in the current over

When displayed: "7.4 overs"

## Transaction Safety

### Why Transactions?

**Problem:** Without transactions, race conditions can occur:

```
Time  Umpire A              Umpire B
----  --------              --------
T1    Read: score = 10      
T2                          Read: score = 10
T3    Write: score = 14     
T4                          Write: score = 16
```

Result: Score shows 16, but should be 20 (10 + 4 + 6)

**Solution:** Firestore transactions ensure atomicity:

```typescript
await runTransaction(db, async (transaction) => {
  // 1. Read current data
  const matchSnap = await transaction.get(matchRef);
  const currentData = matchSnap.data() as Match;
  
  // 2. Calculate new value
  const newScore = {
    ...currentData.score,
    runs: currentData.score.runs + runsToAdd
  };
  
  // 3. Write atomically
  transaction.update(matchRef, {
    score: newScore,
    updatedAt: serverTimestamp()
  });
});
```

With transactions:
```
Time  Umpire A              Umpire B
----  --------              --------
T1    Start transaction     
T2    Read: score = 10      
T3    Calculate: 10 + 4     
T4    Write: score = 14     Start transaction
T5    Commit                Read: score = 14 ✓
T6                          Calculate: 14 + 6
T7                          Write: score = 20
T8                          Commit
```

Result: Score correctly shows 20!

### Transaction Implementation

```typescript
export async function updateMatchScore(
  matchId: string,
  newScore: Score
): Promise<void> {
  const matchRef = matchDoc(matchId);
  
  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);
    
    if (!matchSnap.exists()) {
      throw new Error('Match not found');
    }
    
    transaction.update(matchRef, {
      score: newScore,
      updatedAt: serverTimestamp()
    });
  });
}
```

### Transaction Limits

- **Max operations per transaction:** 500
- **Max transaction duration:** 270 seconds
- **Retry logic:** Automatic (up to 5 attempts)

For Crease, we typically have 1 operation per transaction, so limits are not a concern.

## Offline Behavior

### What Happens When Offline?

Firestore SDK handles offline scenarios gracefully:

#### 1. Writing While Offline

```typescript
// Umpire is offline
await updateMatchScore(matchId, newScore);
// ✓ Returns immediately
// ✓ Writes to local cache
// ✓ Queued for sync when online
```

#### 2. Reading While Offline

```typescript
// User opens match details while offline
subscribeToMatch(matchId, (match) => {
  // ✓ Receives cached data immediately
  // ✓ Shows last known state
});
```

#### 3. Coming Back Online

```
Device reconnects
     ↓
Firestore syncs pending writes
     ↓
Listeners receive updates
     ↓
UI updates with latest data
```

### Offline Persistence

Firestore caches data locally:

```typescript
// Enabled by default in React Native
const db = getFirestore(app);
// Cache size: ~40MB
// Persistence: Automatic
```

Benefits:
- Instant app startup (no loading spinner)
- Works without internet
- Smooth user experience

## UI Patterns

### Loading States

While waiting for initial data:

```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  const unsubscribe = subscribeToMatches((matches) => {
    setMatches(matches);
    setLoading(false); // ← Data received
  });
  return unsubscribe;
}, []);

if (loading) {
  return <ActivityIndicator />;
}
```

### Empty States

When no matches exist:

```typescript
if (matches.length === 0) {
  return (
    <View style={styles.emptyState}>
      <Text>No matches yet</Text>
    </View>
  );
}
```

### Error States

When something goes wrong:

```typescript
try {
  await updateMatchScore(matchId, newScore);
} catch (error) {
  Alert.alert('Error', 'Failed to update score');
}
```

## Performance Considerations

### 1. Listener Cleanup

**Always** unsubscribe from listeners:

```typescript
useEffect(() => {
  const unsubscribe = subscribeToMatches(callback);
  
  return () => {
    unsubscribe(); // ← Critical!
  };
}, []);
```

Without cleanup:
- Memory leaks
- Multiple active listeners
- Unnecessary Firestore reads (costs money)

### 2. Query Optimization

Limit data fetched:

```typescript
// Good: Fetch only recent matches
query(
  matchesCollection(),
  orderBy('createdAt', 'desc'),
  limit(50)
)

// Bad: Fetch all matches (could be thousands)
query(matchesCollection())
```

### 3. Batching Updates

For multiple related updates:

```typescript
const batch = writeBatch(db);
batch.update(matchRef1, { status: 'completed' });
batch.update(matchRef2, { status: 'completed' });
await batch.commit();
// ✓ Single network call
// ✓ All-or-nothing operation
```

## Security Rules

### Read Access

```javascript
// Any authenticated user can read matches
allow read: if request.auth != null;
```

This enables real-time updates for all users.

### Write Access

```javascript
// Only admins and assigned umpire can update
allow update: if isAdmin() || isUmpire(resource.data);

function isUmpire(matchData) {
  return request.auth.uid == matchData.umpireUid;
}
```

This prevents unauthorized score tampering.

## Monitoring & Debugging

### Console Logs

Add logging to track updates:

```typescript
onSnapshot(q, (snapshot) => {
  console.log('Match updated:', snapshot.docs.length, 'matches');
  snapshot.docChanges().forEach(change => {
    console.log(`${change.type}:`, change.doc.id);
  });
});
```

### Firestore Usage Dashboard

Monitor in Firebase Console:
- Reads per day
- Writes per day
- Active connections
- Document count

### Error Monitoring

Catch and log errors:

```typescript
try {
  await updateMatchScore(matchId, newScore);
} catch (error) {
  console.error('Score update failed:', error);
  // Send to error tracking service (Sentry, etc.)
}
```

## Best Practices

### ✅ Do

- Use transactions for score updates
- Unsubscribe from listeners on unmount
- Show loading states while fetching
- Handle offline scenarios gracefully
- Validate data before writing
- Use serverTimestamp() for consistency

### ❌ Don't

- Poll Firestore repeatedly (use listeners)
- Write without transactions for critical data
- Forget to cleanup listeners
- Ignore error states
- Trust client-side timestamps
- Fetch unnecessary data

## Future Enhancements

### Planned Features

1. **Ball-by-ball history**
   - Store each delivery
   - Show scoring timeline
   - Analytics per bowler/batsman

2. **Live commentary**
   - Umpire adds text updates
   - Real-time feed for spectators

3. **Push notifications**
   - Wicket alerts
   - Match start notifications
   - Score milestone alerts

4. **Video highlights**
   - Upload videos per delivery
   - Sync with score timeline

5. **Advanced statistics**
   - Strike rates
   - Economy rates
   - Player performance graphs

## Related Documentation

- **[Project Architecture](Project-Architecture.md)** - Overall system design
- **[Firebase Setup](Firebase-Setup.md)** - Backend configuration
- **[Contribution Guide](Contribution-Guide.md)** - How to add features

---

**Questions about the scoring system?** Check the source code at `src/services/matches.ts` for implementation details!
