# Roadmap

This document outlines planned features, improvements, and the future direction of Crease.

## Current Status

**MVP Complete** (v1.0.0)

Core features implemented:
- Authentication and profile management
- Match creation and listing
- Live scoring with real-time updates
- Role-based access control
- Transaction-safe score updates

## Short Term (v1.1-1.3)

### v1.1 - Polish & Bug Fixes
**Timeline:** 2-4 weeks

#### Features
- [ ] Pull-to-refresh on home screen
- [ ] Match search and filtering
- [ ] User profile view/edit screen
- [ ] Loading skeletons (replace spinners)
- [ ] Haptic feedback for scoring buttons
- [ ] Sound effects for wickets/boundaries

#### Improvements
- [ ] Better error messages
- [ ] Improved empty states
- [ ] Dark mode support
- [ ] Accessibility improvements (screen readers)
- [ ] Performance optimization (FlatList)

#### Bug Fixes
- [ ] Handle Firestore permission errors gracefully
- [ ] Fix keyboard overlap on small screens
- [ ] Improve offline error messaging

**How to Contribute:**
- Pick any checkbox item
- Open an issue first to discuss approach
- Submit PR with tests

---

### v1.2 - Statistics & History
**Timeline:** 1-2 months

#### Player Statistics
- [ ] Player profile pages
- [ ] Batting statistics (runs, average, strike rate)
- [ ] Bowling statistics (wickets, economy, average)
- [ ] Personal match history
- [ ] Career graphs and trends

#### Match History
- [ ] Ball-by-ball commentary
- [ ] Match timeline view
- [ ] Scoring progression graph
- [ ] Partnership details
- [ ] Fall of wickets

#### Data Model
```typescript
interface Delivery {
  matchId: string;
  overNumber: number;
  ballNumber: number;
  runs: number;
  extras?: Extra;
  wicket?: Wicket;
  timestamp: Timestamp;
}

interface PlayerStats {
  uid: string;
  batting: {
    matches: number;
    runs: number;
    average: number;
    strikeRate: number;
  };
  bowling: {
    matches: number;
    wickets: number;
    economy: number;
    average: number;
  };
}
```

**How to Contribute:**
- Help design the data model
- Implement statistics calculations
- Create visualization components

---

### v1.3 - Enhanced Match Management
**Timeline:** 1-2 months

#### Admin Features
- [ ] Edit existing matches
- [ ] Delete matches (with confirmation)
- [ ] Bulk operations (archive old matches)
- [ ] Match templates (save team configurations)
- [ ] Season management

#### Umpire Features
- [ ] Undo last scoring action
- [ ] Edit score history
- [ ] Add extras (wides, no-balls, byes, leg-byes)
- [ ] Change batting order
- [ ] Detailed wicket info (bowled, caught, run-out, etc.)

#### Player Features
- [ ] Request to join match as player
- [ ] View upcoming matches calendar
- [ ] Match reminders

**How to Contribute:**
- Implement undo/redo system
- Create extras tracking UI
- Build calendar integration

---

## Medium Term (v2.0-2.5)

### v2.0 - Social Features
**Timeline:** 3-4 months

#### Features
- [ ] User-to-user messaging
- [ ] Team chat during matches
- [ ] Match highlights sharing
- [ ] Social media integration
- [ ] Activity feed (likes, comments)
- [ ] Follow other players

#### Notifications
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Match start alerts
- [ ] Wicket notifications
- [ ] Milestone alerts (50, 100 runs)
- [ ] Match invitations

**Technical Requirements:**
- Set up FCM (Firebase Cloud Messaging)
- Implement notification service
- Add notification preferences screen

---

### v2.1 - Media & Gallery
**Timeline:** 2-3 months

#### Features
- [ ] Upload match photos
- [ ] Video highlights
- [ ] Live streaming integration
- [ ] Photo gallery per match
- [ ] Player avatars
- [ ] Team logos

#### Storage
- [ ] Firebase Storage integration
- [ ] Image compression
- [ ] Video thumbnails
- [ ] CDN for fast delivery

**Technical Requirements:**
- Add Firebase Storage
- Implement image picker
- Add video player
- Optimize for mobile bandwidth

---

### v2.2 - Advanced Analytics
**Timeline:** 2-3 months

#### Features
- [ ] Heatmaps (where runs scored)
- [ ] Wagon wheels
- [ ] Manhattan/Worm charts
- [ ] Player comparison tool
- [ ] Team performance trends
- [ ] Predictive analytics (ML)

#### Dashboards
- [ ] Admin dashboard (club overview)
- [ ] Player dashboard (personal stats)
- [ ] Public leaderboards

**Technical Requirements:**
- Charting library (Victory Native / react-native-svg-charts)
- Data aggregation service
- Export to PDF/CSV

---

### v2.3 - Tournaments
**Timeline:** 3-4 months

#### Features
- [ ] Tournament creation
- [ ] Bracket/Group stage management
- [ ] Points table
- [ ] Fixtures scheduling
- [ ] Standings and rankings
- [ ] Tournament statistics

#### Tournament Types
- [ ] Knockout
- [ ] Round-robin
- [ ] League + Playoffs
- [ ] Custom formats

**Data Model:**
```typescript
interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  teams: string[];
  matches: string[];
  pointsTable: PointsEntry[];
  startDate: Timestamp;
  endDate: Timestamp;
}
```

---

## Long Term (v3.0+)

### v3.0 - Multi-Sport Support
**Timeline:** 6-12 months

Expand beyond cricket:
- [ ] Football/Soccer
- [ ] Basketball
- [ ] Volleyball
- [ ] Generic sports framework

**Technical Approach:**
- Abstract sport-specific logic
- Plugin architecture
- Configurable scoring systems

---

### v3.1 - Web Dashboard
**Timeline:** 6-9 months

#### Features
- [ ] React web app (share codebase)
- [ ] Admin panel for desktop
- [ ] Public match viewing
- [ ] Embeddable scorecards
- [ ] API for third-party integrations

**Technology:**
- Next.js or Remix
- Shared TypeScript models
- Responsive design

---

### v3.2 - AI Features
**Timeline:** 9-12 months

#### Features
- [ ] Smart player suggestions (AI team selection)
- [ ] Match outcome prediction
- [ ] Performance insights ("You scored 20% better vs Team A")
- [ ] Automated match summaries
- [ ] Voice-to-text commentary

**Technology:**
- TensorFlow Lite / ML Kit
- OpenAI API / Claude API
- On-device ML models

---

## Technical Debt & Improvements

### Testing
- [ ] Unit tests (Jest)
- [ ] Integration tests (Detox)
- [ ] E2E tests
- [ ] Test coverage >80%

### Performance
- [ ] Memoization (React.memo, useMemo)
- [ ] Image lazy loading
- [ ] Infinite scroll (FlatList optimization)
- [ ] Code splitting
- [ ] Bundle size optimization

### DevOps
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing
- [ ] Automated releases (EAS)
- [ ] Error monitoring (Sentry)
- [ ] Analytics (Firebase Analytics)

### Documentation
- [ ] API documentation (TypeDoc)
- [ ] Component storybook
- [ ] Video tutorials
- [ ] Migration guides

### Accessibility
- [ ] Screen reader support
- [ ] High contrast mode
- [ ] Larger font options
- [ ] Keyboard navigation (web)
- [ ] Voice control

---

## Known Limitations

### Current Constraints

1. **Single Innings**
   - Currently only tracks one innings per match
   - Need to add innings switching for full cricket matches

2. **No Batting Order**
   - Doesn't track which players are batting
   - Need to add batsman selection

3. **No Bowling Tracking**
   - Doesn't track which bowler is bowling
   - Need to add bowler selection and stats

4. **No Extras**
   - Doesn't handle wides, no-balls, byes, leg-byes
   - Need to add extras tracking

5. **No Offline Scoring**
   - Requires internet to score
   - Should allow offline and sync later

6. **Limited Match Formats**
   - No T20, ODI, Test specific rules
   - Should add format templates

### Platform Limitations

- **iOS Only Notifications** - Android support coming
- **No Web Version** - Mobile-only currently
- **English Only** - Internationalization planned

---

## Community Requests

Vote on features you want! Open issues are labeled:

- `enhancement` - New features
- `good-first-issue` - Easy to implement
- `help-wanted` - Need contributors
- `high-priority` - Important features

**Top Requested Features:**
1. Player statistics (15 votes)
2. Push notifications (12 votes)
3. Match history (10 votes)
4. Dark mode (8 votes)
5. Extras tracking (7 votes)

---

## How to Influence the Roadmap

### 1. Vote on Features

Comment on existing feature requests with:
- 👍 if you want this feature
- Your use case
- Ideas for implementation

### 2. Propose New Features

Open an issue with:
```markdown
**Feature:** Name of feature
**Problem:** What problem does it solve?
**Solution:** How would it work?
**Alternatives:** Other approaches considered
**Priority:** Low/Medium/High
```

### 3. Contribute Code

Pick a feature from this roadmap:
1. Comment on the issue to claim it
2. Discuss approach with maintainers
3. Implement and submit PR
4. Get merged and shipped!

### 4. Sponsor Development

Want a feature prioritized?
- Contact maintainers about sponsorship
- Hire a developer to implement it
- Contribute as a company

---

## Release Schedule

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major** (v2.0.0) - Breaking changes
- **Minor** (v1.1.0) - New features (backward compatible)
- **Patch** (v1.0.1) - Bug fixes

### Release Cycle

- **Patch releases:** As needed (bug fixes)
- **Minor releases:** Every 4-6 weeks
- **Major releases:** Every 6-12 months

### Release Process

1. Feature freeze (1 week before)
2. Beta testing (TestFlight / Play Store Beta)
3. Bug fixes
4. Release to production
5. Monitor for issues
6. Hot fix if critical bugs

---

## Success Metrics

How we measure progress:

### Technical Metrics
- App crash rate < 0.1%
- App load time < 2 seconds
- API response time < 500ms
- Test coverage > 80%
- Bundle size < 50MB

### User Metrics
- Active users
- Matches created per week
- Scoring accuracy
- User retention rate
- Time spent in app

### Community Metrics
- GitHub stars
- Contributors
- Issues resolved
- PRs merged
- Documentation views

---

## Questions?

- **Want to contribute?** See [Contribution Guide](Contribution-Guide.md)
- **Need a feature sooner?** Open an issue and explain your use case
- **Want to sponsor?** Contact maintainers

---

**The roadmap is a living document.** It will evolve based on user feedback, technical constraints, and community contributions. Check back regularly for updates!
