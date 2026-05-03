# Curio — Setup Guide

## Quick Start

```bash
cd server
npm install
# Fill in your .env values (see below)
npm run dev
```

Then open **http://localhost:5000** in your browser.

---

## Environment Variables (`server/.env`)

Copy `.env.example` to `.env` and fill in:

| Variable | Value |
|---|---|
| `MONGO_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Any long random string (e.g. `openssl rand -hex 32`) |
| `SESSION_SECRET` | Another long random string |
| `PORT` | `5000` (default) |
| `CLIENT_URL` | **Must match PORT** — use `http://localhost:5000` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (see below) |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `http://localhost:5000/api/auth/google/callback` |

> ⚠️ `CLIENT_URL` must point to the **same port** as the server.
> Express serves the frontend from `server/`, so both live on port 5000.

---

## Setting up Google OAuth

The `Cannot GET /api/auth/google` error means Google credentials are not configured.
Follow these steps:

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. **APIs & Services → OAuth consent screen**
   - User type: External
   - Fill in App name, support email, developer email → Save
4. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5000`
   - Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`
   - Click Create
5. Copy the **Client ID** and **Client Secret** into `server/.env`
6. Restart the server — you should see `✅ Google OAuth strategy registered`

### For production

Replace `http://localhost:5000` with your actual domain in:
- Google Console → Authorized origins + redirect URIs
- `server/.env` → `CLIENT_URL` and `GOOGLE_CALLBACK_URL`

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Cannot GET /api/auth/google` | Google creds not set in `.env` | Add `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| `redirect_uri_mismatch` | Google Console URI doesn't match `.env` | Make sure `GOOGLE_CALLBACK_URL` exactly matches what's in Google Console |
| `CLIENT_URL` redirect loops | `CLIENT_URL` points to wrong port | Set `CLIENT_URL=http://localhost:5000` (same as server) |
| MongoDB connection error | `MONGO_URI` wrong or MongoDB not running | Check URI and start MongoDB |
