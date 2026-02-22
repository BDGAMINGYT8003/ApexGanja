# Discord Authentication Guide

This guide details how to integrate Discord OAuth2 into the existing bot and web application.

## Prerequisites

1.  **Discord Developer Portal:**
    *   Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    *   Select your application (the one used for the bot).
    *   Navigate to the **OAuth2** tab.
    *   Under **Redirects**, add the following URL (assuming local development):
        `http://localhost:3000/api/auth/discord/callback`
    *   Copy the **Client ID** and **Client Secret**.

2.  **Environment Variables:**
    *   Add the following to your `.env` file (or create one):
        ```env
        DISCORD_CLIENT_ID=your_client_id
        DISCORD_CLIENT_SECRET=your_client_secret
        DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
        SESSION_SECRET=a_random_secret_string
        ```

## Backend Implementation (Express)

We will use `express`, `axios` (for token exchange), and `express-session` (or cookie-parser) to manage sessions.

### 1. Dependencies
Install necessary packages:
```bash
npm install express axios express-session cookie-parser
```

### 2. Routes (`src/server.js`)

**Step 1: Redirect to Discord**
Create a route `/api/auth/discord` that redirects the user to Discord's authorization page.
Construct the URL with:
*   `client_id`: Your Client ID.
*   `redirect_uri`: Your encoded Redirect URI.
*   `response_type`: `code`.
*   `scope`: `identify guilds` (and any other scopes needed).

**Step 2: Callback Handler**
Create a route `/api/auth/discord/callback`.
1.  Extract the `code` from the query parameters.
2.  Exchange the `code` for an `access_token` by making a POST request to `https://discord.com/api/oauth2/token`.
    *   Body: `client_id`, `client_secret`, `grant_type='authorization_code'`, `code`, `redirect_uri`.
    *   Headers: `Content-Type: application/x-www-form-urlencoded`.
3.  Use the `access_token` to fetch user details from `https://discord.com/api/users/@me`.
4.  Store the user ID in the session (e.g., `req.session.userId = user.id`).
5.  Redirect the user to the frontend dashboard (`/dashboard`).

## Frontend Implementation (React)

### 1. Login Button
Create a button that links to the backend auth route:
```jsx
<a href="/api/auth/discord">Login with Discord</a>
```

### 2. Session Management
On the frontend, check if the user is logged in by calling a `/api/me` endpoint.
*   If the backend session is valid, return the user object.
*   If not, return 401 Unauthorized.

## Integration with Bot Database

Once the user is authenticated and you have their `id` (Snowflake), you can directly access their data in the existing `complete.json` or `incomplete.json` using `src/utils/database.js`.

```javascript
const db = require('./utils/database');

// In your API route
const userId = req.session.userId;
const user = db.getUser('global', userId) || db.getIncompleteUser('global', userId);

if (user) {
    res.json(user);
} else {
    res.status(404).json({ error: 'User not found' });
}
```
