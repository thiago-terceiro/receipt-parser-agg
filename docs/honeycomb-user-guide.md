# Honeycomb User Guide For This Project

## Who This Guide Is For

This guide is for a non-developer who needs to turn on Honeycomb tracing for this project after it is already deployed on Vercel.

You do not need to change application code for the steps below. You do need access to the right accounts and project settings.

## Short Answer

Yes, you need a Honeycomb account.

Yes, you need a Honeycomb ingest key.

Yes, you need access to the Vercel project so you can add environment variables and redeploy.

No, you do not need to connect Honeycomb to GitHub just to view traces for this repo.

No, you should not put the Honeycomb secret directly into the browser or any `NEXT_PUBLIC_...` variable.

Yes, you need an OpenTelemetry collector or relay URL for full tracing in this repo, especially for browser traces.

## What This Repo Expects

This frontend is already instrumented for tracing.

It sends two kinds of traces:

- Browser traces with the service name `receipt-ai-browser`
- Server traces with the service name `receipt-ai-frontend`

To make those traces appear in Honeycomb, the deployed app needs a safe export path.

For this repo, the recommended path is:

1. The app sends traces to an OpenTelemetry collector or relay.
2. The collector adds the Honeycomb secret key.
3. The collector forwards the traces to Honeycomb.

That design matters because browser code is public. A Honeycomb secret must stay on the collector side, not in the frontend code.

## What You Need Before You Start

Make sure you have these four things:

1. A Honeycomb account with permission to create API keys
2. Access to the Vercel project for this app
3. An HTTPS URL for an OpenTelemetry collector or relay
4. Permission to redeploy the Vercel project after changing environment variables

If your team does not already have a collector URL, that is usually the one step where you need help from a developer or infrastructure admin.

## Do You Need To Connect Other Services?

### GitHub

No. GitHub access is not required to use Honeycomb traces for this repo.

### Vercel

Yes, in practice you need Vercel access because this repo reads tracing settings from Vercel environment variables.

### Honeycomb

Yes. You need a Honeycomb account because that is where you will view the traces and where you create the ingest key.

## Step-By-Step Setup

### 1. Create Or Access A Honeycomb Account

1. Go to the Honeycomb website.
2. Sign in, or create an account if your team has not invited you yet.
3. Open the Honeycomb environment your team wants to use for this app.

If your company already uses Honeycomb, ask which environment you should use before creating anything new.

## 2. Create A Honeycomb Ingest Key

1. In Honeycomb, open the team or environment settings area.
2. Find the API keys section.
3. Create an ingest key.
4. Give it a clear name such as `receipt-ai-vercel-traces`.
5. Copy the key and store it somewhere secure.

Important:

- This key is a secret.
- Do not paste it into source code.
- Do not paste it into any `NEXT_PUBLIC_...` environment variable.
- The key belongs on the collector or relay only.

If your Honeycomb organization uses a legacy classic setup, your admin may also need to tell you the dataset name. Most newer Honeycomb setups focus on environments instead.

## 3. Make Sure You Have A Collector Or Relay URL

This repo needs a collector or relay so the browser can send traces without exposing the Honeycomb secret.

What you need is an HTTPS URL that looks something like this:

```text
https://otel-collector.your-domain.com
```

If your team already has one, ask for the exact URL.

If your team does not have one yet, ask a developer or platform admin to deploy an OpenTelemetry collector and configure it to forward traces to Honeycomb using the ingest key from Step 2.

Without that collector URL:

- browser traces will not work in deployed environments
- server traces may still be possible through a Vercel integration, but this repo's recommended full setup is collector-based

## 4. Put The Honeycomb Secret In The Collector, Not In Vercel Public Vars

The collector must be configured with the Honeycomb ingest key.

At a high level, the collector should:

1. accept OTLP traces over HTTPS
2. allow requests from your deployed frontend origin
3. forward traces to Honeycomb
4. add the Honeycomb ingest key as a header

If a technical teammate is setting up the collector, this is the one instruction they need most clearly:

```text
Store the Honeycomb ingest key in the collector configuration, not in the frontend app.
```

## 5. Add The Required Variables In Vercel

1. Open Vercel.
2. Open this project.
3. Go to `Settings`.
4. Go to `Environment Variables`.
5. Add the variables below.

Start with `Preview` first. That keeps tracing off in production until you verify it.

Use these values as the starting point:

```env
OTEL_SERVICE_NAME=receipt-ai-frontend
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.your-domain.com
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

NEXT_PUBLIC_OTEL_BROWSER_ENABLED=true
NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS=preview
NEXT_PUBLIC_OTEL_BROWSER_SERVICE_NAME=receipt-ai-browser
NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL=https://otel-collector.your-domain.com
NEXT_PUBLIC_OTEL_BROWSER_SAMPLE_RATE=1
NEXT_PUBLIC_OTEL_BROWSER_DEBUG=false
```

Replace `https://otel-collector.your-domain.com` with your real collector URL.

What each one does:

- `OTEL_SERVICE_NAME`: names the server-side traces
- `OTEL_EXPORTER_OTLP_ENDPOINT`: tells the server where to send traces
- `OTEL_EXPORTER_OTLP_PROTOCOL`: keeps OTLP export on the expected HTTP protocol
- `NEXT_PUBLIC_OTEL_BROWSER_ENABLED`: turns browser tracing on
- `NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS`: limits browser tracing to preview first
- `NEXT_PUBLIC_OTEL_BROWSER_SERVICE_NAME`: names the browser-side traces
- `NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL`: tells the browser where to send traces
- `NEXT_PUBLIC_OTEL_BROWSER_SAMPLE_RATE`: keeps sampling simple while you validate
- `NEXT_PUBLIC_OTEL_BROWSER_DEBUG`: keeps browser debug logging off in normal deployed use

Important:

- The collector URL for deployed browser tracing must be HTTPS.
- Do not create any public variable containing the Honeycomb ingest key.

## 6. Redeploy The Vercel Project

After saving the environment variables:

1. Trigger a new preview deployment in Vercel.
2. Wait for the deployment to finish.
3. Open the preview URL.
4. Click through a few pages and actions in the app.

This generates fresh trace traffic.

## 7. Verify The Traces In Honeycomb

1. Open Honeycomb.
2. Open `Query`.
3. Set the time range to the last 15 minutes.
4. Filter `service.name = receipt-ai-browser`.
5. Run the query.
6. Open the `Traces` tab.
7. Click a Trace ID.

Then repeat the same steps for:

```text
service.name = receipt-ai-frontend
```

If the setup is working, you should see:

- browser traces under `receipt-ai-browser`
- server traces under `receipt-ai-frontend`
- recent timestamps that match your test activity

## 8. Turn It On For Production After Preview Looks Good

When preview data looks correct, go back to Vercel and change this variable:

```env
NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS=preview,production
```

Then redeploy again.

That expands browser tracing from preview to both preview and production.

## What A Non-Developer Usually Does Not Need To Touch

You usually do not need to:

- edit the source code
- connect Honeycomb to GitHub
- create a GitHub app
- place secrets in the repo
- place secrets in `NEXT_PUBLIC_...` variables

## Common Questions

### Do I Need A Honeycomb Token?

Yes. You need a Honeycomb ingest key for data to arrive.

### Do I Need A Honeycomb Query Key?

Not usually. To view traces in the Honeycomb website, normal UI access is usually enough. Query keys are mainly for API usage.

### Do I Need To Connect Honeycomb Directly To Vercel?

Not for the recommended setup in this repo. What you do need is Vercel access so you can add environment variables and redeploy.

### Do I Need To Connect Honeycomb Directly To GitHub?

No.

### What If I Only Care About Server Traces?

Server traces can sometimes be set up through Vercel observability integrations or OTLP export alone.

Even then, if you want browser traces too, you still need the collector or relay.

## Troubleshooting Checklist

If nothing appears in Honeycomb, check these first:

1. The collector URL is real and reachable over HTTPS.
2. The collector is configured with the Honeycomb ingest key.
3. The Vercel environment variables were added to the correct environment.
4. A new deployment happened after the variables were saved.
5. You are filtering the correct service names in Honeycomb:
   - `receipt-ai-browser`
   - `receipt-ai-frontend`
6. The Honeycomb time range includes your recent test traffic.

## Quick Checklist

Use this as the shortest version of the process:

1. Create or access a Honeycomb account.
2. Create a Honeycomb ingest key.
3. Get an HTTPS OTLP collector URL.
4. Put the Honeycomb secret in the collector.
5. Add the tracing environment variables in Vercel.
6. Redeploy preview.
7. Verify traces in Honeycomb.
8. Expand browser tracing to production.

## Related Docs

If you need the more technical operator guide, see `docs/honeycomb-tracing-setup.md`.
