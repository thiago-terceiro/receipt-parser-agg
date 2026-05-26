# receipt-parser-agg

Parse and aggregate receipts.

## Local Verification

After `pnpm install`, the frontend repo installs a pre-commit hook that runs `pnpm run ci:verify` before each commit.

That command matches the frontend CI verification step and runs type-checking, linting, and Jest tests locally before the commit is recorded.

## Observability

The frontend now supports OpenTelemetry on both the server and the browser.

For a plain-language setup guide for non-developers, see [docs/honeycomb-user-guide.md](docs/honeycomb-user-guide.md).

For the technical setup and verification guide for Honeycomb traces, see [docs/honeycomb-tracing-setup.md](docs/honeycomb-tracing-setup.md).

### Server Tracing

Server-side tracing is initialized through Next.js `instrumentation.ts` and uses `@vercel/otel`.

Set this environment variable if you want a non-default service name:

- `OTEL_SERVICE_NAME`

### Browser Tracing

Browser tracing is initialized through Next.js `instrumentation-client.ts` and uses Honeycomb's web SDK.

Set these environment variables to enable it:

- `NEXT_PUBLIC_OTEL_BROWSER_ENABLED`
- `NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS`
- `NEXT_PUBLIC_OTEL_BROWSER_SERVICE_NAME`
- `NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL`
- `NEXT_PUBLIC_OTEL_BROWSER_SAMPLE_RATE`
- `NEXT_PUBLIC_OTEL_BROWSER_DEBUG`

Recommended rollout:

1. Point `NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL` to your real OTLP collector or relay endpoint.
2. Set `NEXT_PUBLIC_OTEL_BROWSER_ENABLED=true`.
3. Keep `NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS=preview` first so browser telemetry only starts on preview deployments.
4. After validating trace volume and field quality in Honeycomb, expand the environment list to `preview,production`.

Example preview configuration:

```env
NEXT_PUBLIC_OTEL_BROWSER_ENABLED=true
NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS=preview
NEXT_PUBLIC_OTEL_BROWSER_SERVICE_NAME=receipt-ai-browser
NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL=https://otel-collector.your-domain.com
NEXT_PUBLIC_OTEL_BROWSER_SAMPLE_RATE=1
NEXT_PUBLIC_OTEL_BROWSER_DEBUG=false
```

## Receipt Extraction Rate Limiting

The expensive `POST /api/extract` route now supports Redis-backed rate limiting when Upstash or Vercel Redis is configured.

Set these optional environment variables to tune it:

- `RECEIPT_EXTRACT_RATE_LIMIT_REQUESTS`
- `RECEIPT_EXTRACT_RATE_LIMIT_WINDOW`

Defaults:

- `RECEIPT_EXTRACT_RATE_LIMIT_REQUESTS=10`
- `RECEIPT_EXTRACT_RATE_LIMIT_WINDOW="5 m"`

Behavior:

- authenticated users are limited by user id
- anonymous users are limited by forwarded client IP
- if Redis is not configured, the limiter stays disabled and the route behaves as before

## Database Migrations

The frontend Supabase project lives in `frontend/supabase`, and the CLI is already installed as a local dev dependency.

Use the package scripts instead of ad hoc CLI commands so the workflow stays consistent:

- `pnpm run migration:new -- <name>` creates a new migration file.
- `pnpm run db:diff -- -f <name>` generates a migration from local schema changes.
- `pnpm run db:check` runs lint plus `db push --dry-run` against the linked project.
- `pnpm run db:deploy` runs the preflight checks and then performs the real push.
- `pnpm run db:push:yes` is the non-interactive deploy variant for automation.
- `pnpm run migration:list` and `pnpm run migration:repair -- <version> --status <applied|reverted>` help when local and remote history drift.
- `pnpm run db:reset` resets the local database so migrations can be re-tested from scratch.

If you want the workflow guided in chat, use the workspace agent at `.github/agents/supabase-migrations.agent.md` for migration creation, preflight, deploy, and drift repair tasks.

Recommended flow:

1. Create or generate a migration.
2. Test it locally with `pnpm run db:reset` if the change is non-trivial.
3. Run `pnpm run db:check` before touching the remote database.
4. Run `pnpm run db:deploy` for an interactive deploy, or `pnpm run db:push:yes` in automation.

Avoid making schema changes directly in the remote Supabase dashboard once migrations are part of the workflow. If the histories drift, inspect with `migration:list`, repair history if needed, and then return to file-based migrations.

## Internationalization

The frontend now supports locale-prefixed routes for:

- `en`
- `es`
- `pt-br`

Examples:

- `http://localhost:3000/en`
- `http://localhost:3000/es`
- `http://localhost:3000/pt-br`

Requests without a locale prefix are redirected to the preferred locale based on the locale cookie or the browser `Accept-Language` header.

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
