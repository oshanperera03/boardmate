# Boardmate

Boardmate is a student boarding platform with student and boarding owner registration, email verification, owner approval, role-restricted dashboards, administrator review tools, published boarding discovery, Firestore rules, and trusted Cloud Functions. Booking features are not included.

## Local setup

1. Create a Firebase project and register a web app.
2. Enable **Email/Password** in Firebase Authentication. Configure the authorized domains and email verification template for your deployment.
3. Create the Cloud Firestore database.
4. Copy `.env.example` to `.env` and fill in the Firebase web app configuration values. Firebase web API keys identify the project and are intended to be used in the client; Firestore rules and server-side authorization protect the data.
5. Install the web dependencies and start Vite:

   ```sh
   npm install
   npm run dev
   ```

6. Install the Cloud Functions dependencies and deploy the rules, indexes, and functions:

   ```sh
   npm --prefix functions install
   npx firebase-tools login
   npx firebase-tools use --add
   npx firebase-tools deploy --only firestore:rules,firestore:indexes,functions
   ```

   Cloud Functions require a billing-enabled Firebase project. The frontend calls the `reviewOwner` and `suspendOwner` callable functions; approval and suspension actions fail closed until the functions have been deployed.

## Provision the first administrator

There is deliberately no public administrator registration. Create the first account through Firebase Authentication (Firebase Console or a trusted Admin SDK process) and verify its email. Then use an authorized server-side environment with Application Default Credentials that have Firebase Admin privileges:

```sh
cd functions
npm install
npm run set-admin -- <existing-auth-uid>
```

The script sets the `admin: true` custom claim and creates/updates that account's `users/{uid}` profile with the `admin` role. Never run this script in the frontend or expose service-account credentials. An administrator then signs in at `/admin/login`.

## Account and security model

- Authentication identity and credentials are managed by Firebase Authentication; passwords are never written to Firestore.
- Each `users/{uid}` document uses the Firebase Auth UID and contains the role, approval state, account state, and profile details.
- Student and owner clients can create only their own student or pending-owner profile. A user's profile edits are limited by Firestore rules to name and phone number.
- Administrator custom claims are assigned only by trusted Admin SDK code. Administrator reads are guarded by the claim; owner approval/rejection and suspension run through callable Cloud Functions that validate the claim server-side.
- Owner registration requires email verification. Pending owners can reach only the waiting/status screens; rejected owners see the administrator's reason; only approved, active owners can access the owner dashboard and profile.
- Students can browse published listings at `/student/boardings`. To add a listing, an administrator creates a `boardings/{listingId}` document in Firestore with the fields below. Only signed-in users can read published listings; only administrators can create, edit, or delete them.
- Boarding listing documents use: `name` (string), `description` (string), `address` (string), `city` (string), `district` (string), `monthlyRent` (number, LKR), `roomType` (string), `availableRooms` (integer), `genderPreference` (`male`, `female`, or `any`), `facilities` (string array), `contactPhone` (string), and `status` (`published` to show the listing).
- Configure App Check, authorized domains, password policy, email templates, monitoring, and production administrator access procedures before launch.

## Checks

```sh
npm run build
npm run lint
```
