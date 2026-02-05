# Contribution Guide

Welcome to the Crease project! We're excited to have you contribute. This guide will help you get started with contributing code, documentation, and improvements.

## Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/crease.git
cd crease

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/crease.git
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Create .env file with Firebase config
cp .env.example .env
# Edit .env with your test Firebase project

# Start development server
npm start
```

See [Getting Started](Getting-Started.md) for detailed setup instructions.

### 3. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

## Branch Naming Convention

Use descriptive branch names with prefixes:

- `feature/` - New features
  - `feature/player-statistics`
  - `feature/match-filtering`
  
- `fix/` - Bug fixes
  - `fix/score-calculation-error`
  - `fix/auth-redirect-loop`
  
- `docs/` - Documentation updates
  - `docs/update-readme`
  - `docs/add-api-guide`
  
- `refactor/` - Code refactoring
  - `refactor/match-service`
  - `refactor/auth-provider`
  
- `test/` - Adding tests
  - `test/match-service-tests`
  - `test/auth-flow`

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, config)

### Examples

**Good commits:**

```bash
feat(scoring): add ball-by-ball history tracking

Implements a new feature to store each delivery in Firestore,
allowing users to view detailed match progression.

Closes #45
```

```bash
fix(auth): resolve profile setup redirect loop

The app was stuck redirecting between profile setup and home
when auth state changed. Added profileSaved flag to prevent
race condition.

Fixes #67
```

```bash
docs(wiki): add contribution guidelines

Created comprehensive contribution guide with branching strategy,
commit conventions, and PR process.
```

**Bad commits:**

```bash
fix stuff
```

```bash
Updated files
```

```bash
WIP
```

### Commit Scope

Use the affected module:
- `auth` - Authentication
- `scoring` - Live scoring system
- `matches` - Match management
- `profile` - User profiles
- `ui` - UI components
- `firebase` - Firebase integration
- `nav` - Navigation/routing

## Code Style

### TypeScript

We use TypeScript for all code. Follow these guidelines:

#### 1. Type Everything

```typescript
// Good
interface Props {
  matchId: string;
  onUpdate: (score: Score) => void;
}

export function ScoreCard({ matchId, onUpdate }: Props) {
  // ...
}

// Bad
export function ScoreCard({ matchId, onUpdate }: any) {
  // ...
}
```

#### 2. Use Interfaces for Objects

```typescript
// Good
interface User {
  uid: string;
  name: string;
  role: UserRole;
}

// Avoid (use interfaces instead)
type User = {
  uid: string;
  name: string;
  role: UserRole;
}
```

#### 3. Avoid `any`

```typescript
// Good
const handleError = (error: Error) => {
  Alert.alert('Error', error.message);
};

// Bad
const handleError = (error: any) => {
  Alert.alert('Error', error.message);
};
```

### React Native Patterns

#### 1. Functional Components

```typescript
// Good
export default function MatchCard({ match }: Props) {
  return <View>...</View>;
}

// Avoid class components
export class MatchCard extends React.Component {
  // ...
}
```

#### 2. Hooks

```typescript
// Good - hooks at top level
export default function Screen() {
  const [data, setData] = useState([]);
  const { user } = useAuth();
  
  useEffect(() => {
    // ...
  }, []);
  
  return <View>...</View>;
}

// Bad - conditional hooks
export default function Screen() {
  if (someCondition) {
    useState([]); // Never conditional
  }
}
```

#### 3. Cleanup

```typescript
// Good - always cleanup
useEffect(() => {
  const unsubscribe = subscribeToMatches(setMatches);
  return unsubscribe; // ← Cleanup
}, []);

// Bad - memory leak
useEffect(() => {
  subscribeToMatches(setMatches);
  // No cleanup!
}, []);
```

### File Organization

#### 1. Component Files

```typescript
// Component
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Props interface
interface Props {
  title: string;
}

// Component
export default function MyComponent({ title }: Props) {
  return <View><Text>{title}</Text></View>;
}

// Styles
const styles = StyleSheet.create({
  container: {
    // ...
  }
});
```

#### 2. Service Files

```typescript
// Imports
import { db } from '@/firebase/config';
import { Match } from '@/models/Match';

// Service functions
export async function getMatch(id: string): Promise<Match | null> {
  // Implementation
}

export function subscribeToMatches(
  callback: (matches: Match[]) => void
): Unsubscribe {
  // Implementation
}
```

### Naming Conventions

- **Components:** PascalCase - `MatchCard.tsx`, `ScoreButton.tsx`
- **Functions:** camelCase - `updateMatchScore`, `getUserProfile`
- **Constants:** UPPER_SNAKE_CASE - `DEFAULT_ROLE`, `MAX_PLAYERS`
- **Interfaces:** PascalCase - `User`, `Match`, `Score`
- **Files:** PascalCase for components, camelCase for utilities

## Testing

### Before Submitting PR

Test these scenarios:

#### 1. Authentication Flow

```
✓ Sign up new user
✓ Complete profile setup
✓ Log out
✓ Log back in
✓ Check auth persistence (restart app)
```

#### 2. Match Creation (Admin)

```
✓ Change role to admin
✓ Create match with valid data
✓ Create match with missing data (should show error)
✓ View created match on home screen
```

#### 3. Live Scoring (Umpire)

```
✓ Start match
✓ Add runs (+1, +2, +4, +6)
✓ Add wicket
✓ Next ball (check over increment after 6)
✓ Complete match
✓ Verify updates appear on home screen
```

#### 4. Real-time Updates

```
✓ Open app on two devices/simulators
✓ Update score on one device
✓ Verify other device updates instantly
```

#### 5. Offline Behavior

```
✓ Disconnect internet
✓ Open app (should show cached data)
✓ Try scoring (should queue)
✓ Reconnect internet
✓ Verify queued updates sync
```

### Writing Tests (Future)

When we add automated tests, follow these patterns:

```typescript
// Unit test example
describe('calculateOvers', () => {
  it('should increment over after 6 balls', () => {
    const result = calculateOvers(5, 5); // 5 overs, 5 balls
    expect(result).toEqual({ overs: 6, balls: 0 });
  });
});

// Integration test example
describe('Match Creation', () => {
  it('should create match and notify listeners', async () => {
    const matchId = await createMatch(/* ... */);
    // Verify match exists in Firestore
    // Verify listeners received update
  });
});
```

## Pull Request Process

### 1. Before Creating PR

```bash
# Ensure code is up to date
git checkout main
git pull upstream main
git checkout your-branch
git rebase main

# Run linter (if configured)
npm run lint

# Test the app
npm start
# Manually test all affected features
```

### 2. Create Pull Request

1. Push your branch to your fork:
```bash
git push origin feature/your-feature-name
```

2. Go to GitHub and create a Pull Request

3. Fill out the PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Tested authentication flow
- [ ] Tested real-time updates
- [ ] Tested offline behavior

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
```

### 3. PR Title

Use same format as commit messages:

```
feat(scoring): add ball-by-ball history
```

### 4. Review Process

- Maintainers will review your PR
- Address feedback by pushing new commits
- Once approved, maintainers will merge

## Code Review Guidelines

### As a Reviewer

When reviewing others' PRs:

**Check for:**
- Code follows style guidelines
- TypeScript types are correct
- No `any` types without justification
- Listeners are cleaned up
- Error handling is present
- UI follows design patterns
- Changes are well-tested

💬 **Provide constructive feedback:**
- Explain why changes are needed
- Suggest specific improvements
- Acknowledge good solutions
- Be respectful and helpful

### As a Contributor

When receiving feedback:

**Do:**
- Respond to all comments
- Ask questions if unclear
- Make requested changes
- Mark conversations as resolved
- Thank reviewers

**Don't:**
- Take feedback personally
- Argue without technical basis
- Ignore comments
- Force push over review commits

## Adding Features

### 1. Plan First

Before coding:

1. **Open an issue** describing the feature
2. **Discuss approach** with maintainers
3. **Get approval** before starting work

This prevents wasted effort on rejected features.

### 2. Feature Checklist

When adding a feature:

- [ ] Update TypeScript types/models
- [ ] Add service functions (business logic)
- [ ] Create/update UI components
- [ ] Add navigation routes (if needed)
- [ ] Update Firestore rules (if needed)
- [ ] Add error handling
- [ ] Test thoroughly
- [ ] Update documentation
- [ ] Add comments for complex logic

### 3. Breaking Changes

If your change breaks existing functionality:

1. Discuss with maintainers first
2. Provide migration guide
3. Update all affected code
4. Mark as breaking change in PR

## Reporting Bugs

### Before Reporting

1. Search existing issues
2. Verify it's not a configuration issue
3. Test on a clean install

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what's wrong

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment:**
- OS: iOS/Android
- Device: iPhone 13 / Pixel 5
- App Version: 1.0.0
- Node Version: 18.2.0

**Additional context**
Any other relevant information
```

## Project Roadmap

See [Roadmap](Roadmap.md) for planned features and how to contribute to them.

## Communication

### Where to Ask Questions

- **GitHub Issues** - Bug reports, feature requests
- **Pull Requests** - Code-specific discussions
- **Discussions** (if enabled) - General questions

### Response Times

- We aim to respond to issues within **48 hours**
- PR reviews typically within **1 week**
- Be patient - this is an open source project

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

## Code of Conduct

### Our Standards

**Expected behavior:**
- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the project
- Show empathy towards others

**Unacceptable behavior:**
- Harassment or discrimination
- Trolling or inflammatory comments
- Personal attacks
- Unwelcome sexual attention

### Enforcement

Violations will result in:
1. Warning
2. Temporary ban
3. Permanent ban

Report issues to project maintainers.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

## Thank You!

Your contributions make Crease better for everyone. We appreciate your time and effort.

---

**Ready to contribute?** Pick an issue labeled `good-first-issue` and get started!
