# Firebase Real-Time Sync Setup (רום וסתיו)

The app works immediately out of the box using a `localStorage` fallback. To enable **real-time multi-device sync** between Rom's and Stav's iPhones (via Firestore `onSnapshot`), follow these 4 quick steps:

## 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name it (e.g., `rom-stav-budget`) and create the project.
3. Click the **Web (`</>`)** icon to register a Web App and copy the `firebaseConfig` values.

## 2. Enable Cloud Firestore
1. In the Firebase Console sidebar, go to **Build -> Firestore Database**.
2. Click **Create database**, select a close region (e.g., `europe-west1` or `me-west1` Tel Aviv), and start in **Production mode**.
3. Open the **Rules** tab and paste these rules (allowing read/write to household documents):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{householdId} {
      allow read, create: if true;
      allow update: if resource.data.pin == request.resource.data.pin;
    }
  }
}
```
> Note: For a private two-person household, choose a unique Household ID (e.g. `rom-stav-home-92`) and a 4–6 digit PIN.

## 3. Configure `.env`
Copy `.env.example` to `.env` in the project root and paste your keys:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

Restart the dev server (`npm run dev`). The header status badge will switch from **"שמור מקומית"** to **"מחובר לענן"** (green cloud).

## 4. Install on Both iPhones (Native PWA Experience)
1. Deploy the app to **Vercel**, **Netlify**, or **Firebase Hosting** (remember to add the `VITE_FIREBASE_*` environment variables in your host dashboard).
2. Open the URL in **Safari** on iPhone, enter your shared Household ID & PIN (or open the one-tap share link copied via **"שתף"**).
3. Tap the Safari **Share** button -> **הוסף למסך הבית (Add to Home Screen)**.
4. Set the user toggle at the top to **רום** on Rom's phone and **סתיו** on Stav's phone — all new transactions, budget edits, and fixed expenses will sync instantly!
