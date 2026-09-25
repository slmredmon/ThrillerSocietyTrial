# Thriller Society — Trial

A dark-thriller-themed book club and mystery-tracking web app. Readers open a "case file" for whatever thriller or mystery they're currently reading, log a prime suspect and theory as they go, predict twists, and get a scored "verdict" comparing their detective work against the book's actual ending.

This is the **trial build**: every feature below is identical to the full version, with one restriction.

## Trial restriction

Each account can have **2 case files**, open or closed both counting toward it. The first is opened right at sign-up; a second can be started any time after. Once an account has 2 cases:

- The "+" new-case button in the top bar is replaced with a gold **Get the full version** button.
- The "New case" / "Start a new case" buttons on the dashboard do the same.
- A banner appears on the dashboard noting the trial is used up.
- Trying to start a new case anywhere opens a short modal pointing to the full version.

Deleting a case frees up its slot again, since the count is simply how many case files currently exist — there's no separate hidden usage counter. Everything else — the wizard, verdict engine, Community Board, cover lookup and upload, ratings, the Case Summary/PDF page, account settings — works exactly as described below, with no cut corners.

A gold "Trial" badge sits next to the logo in the top bar so it's never ambiguous which build you're using.

## Features

- **Sign up** with an email, display name, and your first book title/author — goes straight into building that first case.
- **Case wizard:** enter the book, mark how far you've read (0/25/50/75%) and jot an optional working theory right there on the same page, name your prime suspect and theory, and add as many additional suspects as you like, each with a theory and a 1–10 trust score.
- **50% lock-in:** once a case crosses the halfway mark, you're prompted to lock in one final suspect and theory. After that, the suspect board is frozen — no edits, no new names — so the record of your reasoning can't be revised in hindsight.
- **What's Really Going On:** a free-text prompt separate from the suspect board, for theories that aren't about naming one culprit (conspiracies, frame jobs, unreliable narrators, twins, etc.). You can start typing this the moment you set your reading progress in the case wizard, or add/edit it any time from the case page.
- **Predicted Twists:** log up to three twists you're calling before the book confirms or denies them. These are just a running log, like the Clues Found journal — the app doesn't grade them against how the book ends or mark any of them right or wrong.
- **Clues Found journal:** a running log, kept for the whole book (not locked at 50% like the suspect board), where you jot down clues you notice, lies you catch a character telling, and connections you draw between suspects or events — filterable by type.
- **Community Board:** once you've locked in your final suspect, you can flip your case to "Public" to add your final suspect and theory to a shared board for that exact book/author, so other readers working the same case can compare notes. "View Community Board" shows everyone else's public theory for that book (name, suspect, theory, and — once cases are closed — whether they solved it). Flipping back to "Private" removes your entry. **Spoiler alert:** entries from readers who've already closed their case can give away the actual culprit or ending — the app shows a spoiler warning both on the toggle and on the board itself, but there's no way to redact spoilers from what other readers choose to write. Requires Firebase (see below); in local mode you'll only see theories made public in your own browser.
- **Closing a case:** once you finish the book, enter the real culprit. The app builds a "verdict" — a solved/missed-it banner, a list of strengths and weaknesses in your detective work, and summary stats (suspects considered, average trust score, whether you stuck with your first pick, clues found, lies detected, connections made, and twists predicted).
- **Dashboard:** active and closed cases at a glance, with totals, in-progress count, solved/missed-it counts, and an overall solve rate with a visual outcome bar.
- **Case history:** every case you've ever opened, sorted by most recently updated.
- **Real book covers:** each case automatically looks up a real cover image for the title/author via the Google Books API, falling back to Open Library if needed. Common titles often match several editions/duplicates, so the app scans a handful of results for the first one that actually has a cover image, and tries a looser search (title only, no author filter) if a strict title/author match comes up empty — this matters because Open Library's author matching is fairly exact, and a free-text author name that isn't spelled exactly like its own records can otherwise zero out a good match. If no match is found anywhere (or the image fails to load), the app's own generated placeholder cover stays in place, and it tries again automatically next time the app loads. Lookups never block the app from rendering. (Goodreads doesn't offer a public API for this — it was retired to new developers in 2020 — so Google Books/Open Library are the real-cover sources here.)
- **Custom cover override:** small-press, self-published, or very new titles sometimes just aren't in Google Books or Open Library at all — and for common titles, the automatic match is occasionally the wrong book entirely (a same-titled book by a different author). On any case page, "Add custom cover" lets you upload your own JPG — the photo is automatically resized to a small thumbnail (long edge capped at 300px, re-encoded as JPEG) entirely in the browser before it's saved, so it stores cheaply on the case document with no image-hosting backend needed. "Use generic cover" locks the case to the app's own generated placeholder and stops the automatic search from trying again; "Use auto lookup" (shown once any override is active) clears it and lets the app search again.
- **Rate This Book:** a simple 1–5 star rating for the book itself, separate from your detective work, so it stays editable any time — even after you've closed the case.
- **Case Summary:** a "View Summary" button on every case page opens a single bulleted page listing everything logged for that case — book details, status, rating, the full suspect board, your working theory, predicted twists, every clue/lie/connection in the journal, and, once closed, the full verdict. Its "Print / Save as PDF" button opens your browser's print dialog with a clean, ink-friendly layout (no nav, no buttons); choosing "Save as PDF" there downloads it as a real PDF file — no extra app or plugin needed.
- **Account settings:** view your email, name, member-since date, and storage mode; log out, deactivate (reversible), or permanently delete your account and all case data.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell — loads fonts, the Firebase SDK, `firebase-config.js`, `style.css`, and `script.js`, and holds the empty `#app` mount point. |
| `style.css` | All visual styling (dark thriller theme, layout, components, responsive rules). |
| `script.js` | The entire application: rendering, state, the case wizard, the verdict engine, book-cover lookup, authentication, and data persistence. |
| `logo.png` | The Thriller Society logo, used in the top bar and on the sign-up screen. |
| `firebase-config.js` | Your Firebase project's client config. Ships with placeholder values — see **Connecting Firebase** below. |
| `.gitignore` | Keeps genuinely sensitive files (Admin SDK keys, `.env` files) and editor/OS cruft out of the repo. |
| `README.md` | This file. |

The app has no build step and no framework — just static files plus the Firebase SDK loaded from Google's CDN in `index.html`. Open `index.html` in a browser (or serve the folder with any static file server) and it runs.

**Deploy this as its own separate site**, in its own repo (and, if using Firebase, its own Firebase project) — not folded into the full version's repo. Keeping them separate means trial accounts and full accounts never mix, and a trial user who later buys in creates a fresh account on the full version rather than needing anything migrated.

## Data & storage

This app stores real, persistent entries — but which kind depends on whether Firebase is connected:

- **Without Firebase set up** (the state it ships in): `script.js` detects that `firebase-config.js` still has placeholder values and automatically runs in **local mode**. Signing up just writes your profile and cases to this browser's `localStorage`. It persists across reloads, but only on this one device/browser — nothing syncs, nothing is backed up, and a "local" badge appears in the top bar to make this visible. Anyone else opening the site gets their own empty local copy.
- **With Firebase connected** (see below): the app switches to **cloud mode** automatically. Sign-up creates a real account (Firebase Authentication, email + password) and all profile/case data is written to Cloud Firestore under that account. The same login works from any browser or device, and the sign-up screen gains a password field plus a "Log in" link for returning users; Settings gains a "Log out" button.

Every read and write in the app goes through one object near the top of `script.js` called `DAL` (`getProfile`, `setProfile`, `listCases`, `getCase`, `createCase`, `updateCase`, `deleteCase`, `wipeEverything`, `setCasePublic`, `listCommunityTheories`) — that's the only place data access happens, whichever mode is active.

Community Board entries live in their own top-level Firestore collection, `publicTheories` (one document per case that's been made public, id `<uid>_<caseId>`), separate from each reader's private `/users/{userId}/cases` data — so making a case public only ever shares that one case's final suspect/theory, never your account or your other cases.

## Connecting Firebase

Firebase's free tier ("Spark plan") is enough to run this app for a normal amount of personal or small-project use.

1. **Create a project.** Go to [console.firebase.google.com](https://console.firebase.google.com), create a new project (Google Analytics is optional, you can skip it).
2. **Register a web app.** In the project overview, click the `</>` (web) icon to add a web app. Give it any nickname — you don't need Firebase Hosting for this. It will show you a config object (`apiKey`, `authDomain`, `projectId`, etc.).
3. **Fill in `firebase-config.js`.** Open that file in this repo and replace the placeholder strings with the real values from step 2.
4. **Turn on email/password sign-in.** In the console, go to **Build → Authentication → Sign-in method**, and enable the **Email/Password** provider.
5. **Create a Firestore database.** Go to **Build → Firestore Database → Create database**. Start in production mode and pick any region.
6. **Set security rules.** Still in Firestore, open the **Rules** tab and replace the contents with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
         match /cases/{caseId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
       match /publicTheories/{docId} {
         allow read: if request.auth != null;
         allow create, update: if request.auth != null && request.resource.data.uid == request.auth.uid;
         allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
       }
     }
   }
   ```

   This ensures each signed-in user can only ever read or write their own profile and cases — nobody else's — while letting any signed-in reader view the shared `publicTheories` collection behind the Community Board, and only ever write or delete their own entries in it.

   > **Already running this app?** The `publicTheories` block is new — go back to **Firestore Database → Rules** and paste the full block above (not just the new part) over what's there now, then **Publish**, or the Community Board will fail with a "Missing or insufficient permissions" error.

7. **Reload the site.** The sign-up form will now show a password field and a "Log in" link, and every account is stored in Firestore instead of the browser.

A couple of things worth knowing:

- The values in `firebase-config.js` are not secret — Firebase's client-side config is meant to be public. Your data is protected by the security rules in step 6, not by hiding this file. What *is* secret is an Admin SDK service-account key, which this app never needs and which `.gitignore` already guards against if you add one later.
- "Delete everything" in Settings wipes all of that account's Firestore data and signs them out, but — since this app never uses the Admin SDK — it doesn't delete the underlying Firebase Authentication login itself. That would require a small Cloud Function; it's a reasonable next step if you need it, but isn't included here.

## Book cover lookups

`script.js` calls two free, public, keyless APIs directly from the browser:

- `https://www.googleapis.com/books/v1/volumes` (primary)
- `https://openlibrary.org/search.json` and `https://covers.openlibrary.org` (fallback)

No API key is required for either, so there's nothing to add to a `.env` file for this feature to work. If you later add any service that *does* require a key (analytics, a real backend, etc.), keep it out of `script.js` and out of version control — that's what `.gitignore` is set up to protect.

## Deploying

Since this is a static site with no build step, it deploys anywhere that serves static files as-is, for example:

- **GitHub Pages:** push this repo, then enable Pages on the `main` branch (root folder) in the repo's Settings.
- **Netlify / Vercel / Cloudflare Pages:** point any of these at the repo with no build command and `/ ` (root) as the publish directory.

## License

Copyright © 2026. All rights reserved.
