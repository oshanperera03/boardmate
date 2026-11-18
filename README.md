# Boardmate

Boardmate is a role-based boarding discovery and booking platform for students and boarding owners. It provides account registration and verification, property and room management, booking workflows, notifications, featured listings, and administrator approval tools.

## Features

- Student registration, email verification, profile management, and boarding search
- Student room and property discovery with booking requests
- Boarding owner registration and approval workflow
- Owner property, room, availability, and booking management
- Featured listing requests and administrator review
- Role-restricted student, owner, and administrator dashboards
- Firebase Authentication, Cloud Firestore, Firebase Storage, and callable Cloud Functions

## Technology

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Functions

## Prerequisites

- Node.js 22 or newer
- npm
- A Firebase project
- Firebase CLI

## Firebase setup

1. Create a Firebase project in the Firebase Console.
2. Register a web application in **Project settings**.
3. Enable **Email/Password** authentication.
4. Create a Cloud Firestore database.
5. If storage is used, create a Cloud Storage bucket and configure the rules in `storage.rules`.
6. Copy the environment template:

   ```sh
   cp .env.example .env.local
   ```

7. Add the Firebase web app values to `.env.local`:

   ```env
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```

The Firebase web configuration identifies the project and is intended to be used in a client application. Data access must be protected by Firestore rules and server-side authorization.

## Local development

Install the frontend dependencies and start Vite:

```sh
npm install
npm run dev
```

Vite normally serves the application at `http://localhost:5173`.

Install the Cloud Functions dependencies:

```sh
npm --prefix functions install
```

## Firebase deployment

Sign in to Firebase and select or create the project:

```sh
npx firebase-tools login
npx firebase-tools use --add
```

Deploy Firestore rules and indexes, Storage rules, Cloud Functions, and the web application:

```sh
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage,functions,hosting
```

Cloud Functions may require a billing-enabled Firebase project. The frontend depends on the deployed functions for owner approval, owner suspension, booking submission, and booking status changes.

## Provision the first administrator

Administrator accounts are not created through public registration.

1. Create an account in Firebase Authentication and verify its email.
2. Configure Google Application Default Credentials with Firebase Admin privileges:

   ```sh
   gcloud auth application-default login
   ```

3. Set the administrator custom claim and profile:

   ```sh
   npm --prefix functions install
   npm --prefix functions run set-admin -- <existing-firebase-auth-uid>
   ```

The script grants the account the `admin: true` claim and creates or updates the `users/{uid}` profile. Keep the script and administrator credentials server-side. Sign in through `/admin/login`.

## Account model

- Firebase Authentication manages credentials and email verification.
- The `users/{uid}` document contains the role, profile, approval status, and account status.
- Supported roles are `student`, `owner`, and `admin`.
- Owner accounts begin in a pending state and require administrator approval.
- Suspended accounts are blocked by route guards and server-side checks.
- Administrator actions are protected by custom claims and callable Cloud Functions.

## Main application routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/register` | Student registration |
| `/owner/register` | Boarding owner registration |
| `/login` | Student or owner login |
| `/admin/login` | Administrator login |
| `/student/search` | Search available properties |
| `/student/bookings` | Manage student bookings |
| `/owner/properties` | Manage owner properties |
| `/owner/rooms` | Manage owner rooms |
| `/owner/bookings` | Manage owner booking requests |
| `/admin/requests` | Review owner requests |
| `/admin/properties` | Review property requests |
| `/admin/featured-listings` | Review featured listing requests |

## Available scripts

### Frontend

```sh
npm run dev
npm run build
npm run lint
npm run preview
```

### Cloud Functions

```sh
npm --prefix functions install
npm --prefix functions run set-admin -- <uid>
```

## Production checklist

Before deploying to production:

- Restrict Firebase API keys to authorized domains and required APIs.
- Configure authorized domains and password/email security settings.
- Deploy and review all Firestore and Storage rules.
- Create all required indexes.
- Enable monitoring and logging.
- Verify administrator access procedures.
- Use separate Firebase projects for development and production.
