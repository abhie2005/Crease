# Welcome to Crease

**Crease** is a production-ready mobile application for cricket club management, live scoring, and match administration. Built with modern technologies and best practices, Crease demonstrates enterprise-level React Native development with real-time capabilities.

## Purpose

Crease solves the problem of managing cricket matches for clubs and organizations by providing:

- **Centralized match management** - Create and track all club matches in one place
- **Live scoring** - Umpires can score matches in real-time from their mobile devices
- **Real-time updates** - Players and spectators see scores update instantly
- **Role-based access** - Different capabilities for players, admins, and umpires
- **Profile management** - Track member information and roles

## Key Features

### Authentication & Authorization
- Firebase Authentication with email/password
- Persistent auth state across app restarts
- Automatic route guarding based on auth status
- Role-based access control (Player, Admin, President, Umpire)

### Live Match Scoring
- Real-time score updates using Firestore listeners
- Transaction-based scoring to prevent race conditions
- Ball-by-ball tracking with automatic over increments
- Match state management (Upcoming → Live → Completed)

### Match Management
- Create matches with team assignments
- View all matches with live score updates
- Detailed match information pages
- Empty state handling for new installations

### User Experience
- Clean, modern UI with responsive layouts
- Loading and empty states
- Error handling with user-friendly messages
- Keyboard-aware forms
- SafeArea handling for all devices

## Tech Stack

### Frontend
- **React Native** - Cross-platform mobile framework
- **Expo** (SDK 50) - Development platform and build system
- **TypeScript** - Type-safe development
- **Expo Router** - File-based routing with type safety

### Backend
- **Firebase Authentication** - User authentication and session management
- **Cloud Firestore** - Real-time NoSQL database
- **Firebase SDK v9+** - Modular SDK for optimal bundle size

### Architecture
- **Clean Architecture** - Separation of concerns (Providers, Services, Models, Components)
- **Real-time Listeners** - Firestore subscriptions for live updates
- **Transaction-based Updates** - Atomic score updates
- **Context API** - Global state management for auth

### Development Tools
- **EAS Build** - Cloud build service for iOS/Android
- **Babel** - JavaScript transpilation
- **ESLint & Prettier** - Code quality and formatting

## Project Status

**Production-Ready MVP**

All core features are implemented and tested:
- Complete authentication flow
- Profile setup and management
- Match creation (admin)
- Live scoring (umpire)
- Real-time match list
- Match details with live updates
- Role-based access control
- Transaction-safe score updates

## Documentation

- **[Getting Started](Getting-Started.md)** - Set up the project locally
- **[Project Architecture](Project-Architecture.md)** - Understand the codebase structure
- **[Firebase Setup](Firebase-Setup.md)** - Configure Firebase backend
- **[Live Scoring System](Live-Scoring-System.md)** - How real-time scoring works
- **[Contribution Guide](Contribution-Guide.md)** - How to contribute to the project
- **[Roadmap](Roadmap.md)** - Planned features and improvements

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/crease.git
cd crease

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase credentials

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

See [Getting Started](Getting-Started.md) for detailed setup instructions.

## Contributing

We welcome contributions! Please read our [Contribution Guide](Contribution-Guide.md) before submitting pull requests.

## Screenshots

*Coming soon: Screenshots of authentication, home screen, match details, and scoring interface*

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Team

Developed as a demonstration of modern React Native development practices with Firebase integration.

## Support

For questions or issues:
- Open an issue in the repository
- Check the documentation pages
- Review the codebase comments

---

**Ready to get started?** Head over to [Getting Started](Getting-Started.md) to set up your development environment!
