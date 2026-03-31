# receipt-parser-agg

Parse and aggregate receipts.

## Google Sign-In

The frontend now includes a Google login button powered by Auth.js.

Set these environment variables before using it:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

## Google Cloud Setup

The current Google flow uses Google Auth Platform inside Google Cloud Console. The screens are organized under four main sections:

- Branding
- Audience
- Data Access
- Clients

Use a Web application OAuth client for this Next.js app.

### 1. Open Google Auth Platform

1. Sign in to Google Cloud Console.
2. Open Google Auth Platform Clients directly at `https://console.cloud.google.com/auth/clients`.
3. If Google asks you to choose a project, either select an existing project for this app or create a new one.
4. If the project is not registered for Google Auth yet, Google will prompt you to configure the app before client creation. Continue with that setup.

### 2. Configure Branding

1. Open the Branding page at `https://console.cloud.google.com/auth/branding`.
2. Set Application name to the name users should see, for example `Receipt AI`.
3. Optionally upload an application logo.
4. Set a Support email that you actively monitor.
5. Add Authorized domains.
6. Set the Application home page.
7. Set the Privacy Policy link.
8. Optionally set the Terms of Service link.
9. Save the Branding configuration.

For local development only:

- `localhost` is used in redirect URIs and JavaScript origins, but it is not a normal public authorized domain for your policy links.
- Your homepage, privacy policy, and terms links should point to a real hosted domain for production.

### 3. Configure Audience

1. Open the Audience page in Google Auth Platform.
2. Choose the user type.
3. Use External if people outside your Google Workspace should sign in.
4. Use Internal only if all users belong to your organization and the project is under Google Workspace control.
5. If Google shows a Testing or Publishing status option, keep the app in Testing while developing.
6. If the app is External and still in Testing, add your Google account under test users so you can sign in.

Notes:

- For basic sign-in with `openid`, `email`, and `profile`, verification is often not required before development.
- If you later request sensitive or restricted scopes, Google may require app verification.

### 4. Configure Data Access

1. Open the Data Access page at `https://console.cloud.google.com/auth/scopes`.
2. Review the scopes requested by your app.
3. For this implementation, keep the default sign-in identity scopes only.
4. Do not add extra Google API scopes unless the app actually needs them.
5. Save the configuration.

This app uses Google only for sign-in. The normal identity scopes are enough:

- `openid`
- `email`
- `profile`

### 5. Create the OAuth Client

1. Return to the Clients page at `https://console.cloud.google.com/auth/clients`.
2. Click Create client.
3. Choose Application type: Web application.
4. Enter a name such as `Receipt AI Web`.
5. Under Authorized JavaScript origins, add your app origins.
6. Under Authorized redirect URIs, add the exact NextAuth callback URLs.
7. Click Create.
8. Copy the Client ID.
9. Copy the Client Secret immediately.

Important:

- Google now shows the full client secret only when it is created. After that, the console generally shows only an identifier and you must rotate the secret if you lose it.
- Store the secret in a secure secret manager or in your deployment platform's encrypted environment variables.

### 6. Values To Enter For This App

Use these values for local development:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

Use these values for production, replacing the example domain with your real frontend URL:

- Authorized JavaScript origin: `https://your-domain.com`
- Authorized redirect URI: `https://your-domain.com/api/auth/callback/google`

Rules that matter:

- Redirect URIs must match exactly, including protocol, host, port, and path.
- Do not add a trailing slash unless the actual callback URL has one.
- If you use both preview and production environments, add each domain explicitly.
- If you deploy on Vercel, add your production domain and any preview domain you intend to test.

### 7. Add The Secrets To This Project

Create or update `.env.local` in the frontend app with:

```env
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000
```

Notes:

- `AUTH_SECRET` should be a long random string.
- For production, set `NEXTAUTH_URL` to your deployed frontend origin.
- Keep `AUTH_GOOGLE_SECRET` out of git.

### 8. Restart And Test Locally

1. Start the frontend dev server.
2. Open `http://localhost:3000`.
3. Click `Continue with Google`.
4. Sign in with a Google account that is allowed by your Audience and Test Users settings.
5. Confirm you return to the app and see the signed-in user details.

### 9. Common Google Console Mistakes

If login fails, check these first:

- `redirect_uri_mismatch`: the callback URL in Google does not exactly match `/api/auth/callback/google`.
- `access_denied`: your account is not listed as a test user while the app is still in Testing.
- blank or broken popup: the wrong app URL is being used, or the environment variables are missing.
- client secret missing: the secret was not copied when created and needs to be rotated.
- production links rejected on Branding: homepage, privacy policy, and terms must live on authorized domains.

### 10. References

These instructions were aligned with the current Google docs and help pages:

- Google Identity setup: `https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid`
- Google OAuth overview: `https://developers.google.com/identity/protocols/oauth2`
- Google Auth Platform client management: `https://support.google.com/cloud/answer/15549257`
