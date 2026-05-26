# Honeycomb Traces Setup and Verification

If you need a plain-language setup guide for a non-developer, start with [honeycomb-user-guide.md](honeycomb-user-guide.md).

## Scope

This guide explains:

- where to find traces in Honeycomb
- how tracing is wired in this frontend repo
- how to configure local tracing
- how to configure deployed tracing
- how to test whether traces are actually arriving

This repo already contains tracing instrumentation for both the browser and the Next.js server, but instrumentation alone is not enough. Traces only appear in Honeycomb after you configure an exporter path that actually sends them there.

## What Is Already Wired In This Repo

The frontend has two tracing entry points:

- Browser tracing starts in `instrumentation-client.ts` with Honeycomb's web SDK.
- Server tracing starts in `instrumentation.ts` with `@vercel/otel`.

Default service names in this repo:

- Browser: `receipt-ai-browser`
- Server: `receipt-ai-frontend`

Both paths also attach repo-specific resource attributes:

- `app.name=receipt-ai`
- `app.runtime=browser` or `app.runtime=nextjs`

Important current behavior:

- Browser trace headers are only propagated to same-origin requests.
- That is useful for linking browser requests to this same frontend origin.
- It will not propagate tracing context to arbitrary third-party domains.

## Where To See Traces In Honeycomb

The most reliable place to open traces is Query Builder.

### Fastest Path

1. Open Honeycomb.
2. Switch to the correct Honeycomb environment.
3. Open `Query`.
4. Set the time range to something recent, such as the last 15 minutes.
5. Add a filter for one of these services:
   - `service.name = receipt-ai-browser`
   - `service.name = receipt-ai-frontend`
6. Run the query.
7. Open the `Traces` tab below the query chart.
8. Click the trace icon or the Trace ID.

That opens Honeycomb's Trace Waterfall view.

### Other Valid Paths

You can also open traces from:

- `Home` -> `Traces` view -> `Recent Traces`
- `Query` -> `Explore Data` -> click `trace.trace_id`
- a permalink shared directly to a trace

If the dataset is marked as a frontend dataset, Honeycomb may show `Web Launchpad` as the main Home screen for that dataset. From there, click a card, chart point, table row, or big number to jump into Query Builder, then open the `Traces` tab.

### What You Should See

Once a trace opens, Honeycomb shows the Trace Waterfall page with four main areas:

- trace identification and Trace ID
- trace summary
- waterfall of spans
- span sidebar with fields, span events, and links

That is the exact place to inspect latency, errors, and parent/child span relationships.

## Repo-Specific Gaps You Need To Close

Before expecting traces in Honeycomb, fix these two gaps.

### 1. Browser Tracing Is Not Ready For Local Testing Yet

Browser tracing in this repo only starts when all of these are true:

- `NEXT_PUBLIC_OTEL_BROWSER_ENABLED=true`
- the current runtime environment is included in `NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS`
- `NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL` is not empty

The local config currently prevents local browser testing because:

- `NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS` is set to `preview`
- `NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL` is blank

That means local browser traces will not initialize.

### 2. Server Tracing Needs An Export Path

The server is instrumented through `@vercel/otel`, but spans only arrive in Honeycomb if runtime export is configured.

You need one of these:

- a Vercel tracing integration that forwards traces
- OTLP exporter environment variables that point to a collector or backend
- a custom exporter setup

This repo currently documents the service name, but not the full export path for the server.

## Recommended Architecture

Use an OpenTelemetry Collector between the app and Honeycomb.

Why:

- browser code must not ship a Honeycomb ingest key
- browser and server can both send to the same collector
- the collector can handle batching, headers, and forwarding to Honeycomb
- you can keep the Honeycomb API key in collector configuration only

## Local Setup

## 1. Create A Local Collector Config

Create a file named `otel-collector-config.yaml` outside the repo or in a local-only location:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - "http://localhost:3000"

processors:
  batch:

exporters:
  otlphttp/honeycomb:
    endpoint: "https://api.honeycomb.io:443"
    headers:
      x-honeycomb-team: "${HONEYCOMB_API_KEY}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/honeycomb]
```

If your Honeycomb account is in the EU region, use this exporter endpoint instead:

```yaml
endpoint: "https://api.eu1.honeycomb.io:443"
```

If you are still using Honeycomb Classic, also add:

```yaml
x-honeycomb-dataset: "YOUR_DATASET_NAME"
```

## 2. Run The Collector Locally

Example Docker command on Windows PowerShell:

```powershell
docker run --rm `
  -p 4317:4317 `
  -p 4318:4318 `
  -e HONEYCOMB_API_KEY=YOUR_REAL_HONEYCOMB_INGEST_KEY `
  -v "C:\full\path\to\otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml" `
  ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:latest
```

## 3. Configure Local App Environment Variables

For local testing, set these values in your local frontend env file:

```env
# Server tracing
OTEL_SERVICE_NAME=receipt-ai-frontend
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
NEXT_OTEL_VERBOSE=1

# Browser tracing
NEXT_PUBLIC_OTEL_BROWSER_ENABLED=true
NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS=development,preview
NEXT_PUBLIC_OTEL_BROWSER_SERVICE_NAME=receipt-ai-browser
NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL=http://localhost:4318
NEXT_PUBLIC_OTEL_BROWSER_SAMPLE_RATE=1
NEXT_PUBLIC_OTEL_BROWSER_DEBUG=true
```

Notes:

- In this browser SDK, the configured `endpoint` is the collector base URL.
- The SDK appends `/v1/traces` by default.
- For local testing, `development` must be included in `NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS`.
- `NEXT_OTEL_VERBOSE=1` makes Next.js emit more spans and is useful while validating.

## 4. Start The Frontend App

Start the frontend normally.

Then generate traffic:

1. Open the app in a browser.
2. Load a few pages.
3. Trigger at least one action that hits your backend.
4. Refresh a few times.
5. Keep the browser console open while testing.

## 5. Verify Local Tracing

### Browser-Side Checks

With debug enabled, you should see a browser console message similar to:

```text
Browser telemetry initialized.
```

If you do not see that, check:

- `NEXT_PUBLIC_OTEL_BROWSER_ENABLED`
- `NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS`
- `NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL`
- whether the collector is reachable on `http://localhost:4318`

### Honeycomb Checks

In Honeycomb:

1. Open `Query`.
2. Set the time range to the last 15 minutes.
3. Filter on `service.name = receipt-ai-browser`.
4. Run the query.
5. Open the `Traces` tab.
6. Click a trace.

Repeat the same flow with `service.name = receipt-ai-frontend`.

### What You Should Expect

For browser traces, you should see fields like:

- `service.name = receipt-ai-browser`
- `app.name = receipt-ai`
- `app.runtime = browser`

For server traces, you should see fields like:

- `service.name = receipt-ai-frontend`
- `app.name = receipt-ai`
- `app.runtime = nextjs`

For Next.js server spans, you should typically see spans such as:

- `GET /some-route`
- route render spans
- fetch spans

## Deployed Setup

## If You Deploy On Vercel

### Server Tracing On Vercel

`@vercel/otel` will use the best export mechanism available:

- if a Vercel tracing integration is configured, it can export through that path automatically
- otherwise it can use OTLP exporter environment variables if present

For deployed server traces, use one of these:

- configure a Vercel tracing or observability integration that forwards to Honeycomb
- or provide OTLP exporter environment variables that point to your collector

### Browser Tracing On Vercel

Set these environment variables in the deployment platform:

```env
NEXT_PUBLIC_OTEL_BROWSER_ENABLED=true
NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS=preview
NEXT_PUBLIC_OTEL_BROWSER_SERVICE_NAME=receipt-ai-browser
NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL=https://otel-collector.your-domain.com
NEXT_PUBLIC_OTEL_BROWSER_SAMPLE_RATE=1
NEXT_PUBLIC_OTEL_BROWSER_DEBUG=false
```

Recommended rollout:

1. Start with `preview` only.
2. Validate data shape and volume in Honeycomb.
3. Expand to `preview,production`.

### Deployed Collector Requirements

Your deployed collector must:

- be reachable from browsers over HTTPS
- allow CORS from your deployed frontend origins
- forward traces to Honeycomb using your Honeycomb ingest key

Example browser collector receiver config:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - "https://your-domain.com"
            - "https://*.vercel.app"
```

## If You Are Self-Hosting

Point both browser and server at your collector:

```env
OTEL_SERVICE_NAME=receipt-ai-frontend
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.your-domain.com
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

NEXT_PUBLIC_OTEL_BROWSER_ENABLED=true
NEXT_PUBLIC_OTEL_BROWSER_ENABLED_ENVIRONMENTS=production
NEXT_PUBLIC_OTEL_BROWSER_SERVICE_NAME=receipt-ai-browser
NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL=https://otel-collector.your-domain.com
NEXT_PUBLIC_OTEL_BROWSER_SAMPLE_RATE=1
NEXT_PUBLIC_OTEL_BROWSER_DEBUG=false
```

## Deployed Verification Checklist

After deployment:

1. Open the deployed preview or production URL.
2. Navigate through a few pages.
3. Trigger one or two actions that hit the backend.
4. In Honeycomb, run a query for `service.name = receipt-ai-browser`.
5. Open the `Traces` tab and inspect a browser trace.
6. Run a second query for `service.name = receipt-ai-frontend`.
7. Open a server trace.
8. Confirm that:
   - traces are arriving
   - timestamps match your test window
   - both browser and server services appear
   - same-origin browser requests link into the wider trace where expected

## Common Failure Modes

### No Browser Traces

Check:

- `NEXT_PUBLIC_OTEL_BROWSER_ENABLED=true`
- the environment list includes the current environment
- `NEXT_PUBLIC_OTEL_BROWSER_COLLECTOR_URL` is not blank
- collector CORS allows your frontend origin
- the browser can reach the collector over HTTPS in deployed environments

### No Server Traces

Check:

- `@vercel/otel` is registered
- the deployment has either a Vercel tracing integration or OTLP environment variables
- the collector or Honeycomb endpoint is reachable
- OTLP headers are correct if exporting directly to Honeycomb

### Query Runs But Traces Tab Is Empty

Check:

- correct time range
- correct Honeycomb environment
- correct `service.name`
- enough recent traffic
- root spans are being received

### Trace Opens But Spans Are Missing

Check:

- collector health
- sampling behavior
- whether root spans are present
- whether browser-to-server propagation is happening
- use Honeycomb's `Reload Trace` button in the waterfall view

## Quick Answer

If you just want the exact path in Honeycomb:

1. Open `Query`.
2. Filter `service.name = receipt-ai-browser` or `service.name = receipt-ai-frontend`.
3. Run the query.
4. Open the `Traces` tab.
5. Click a Trace ID.
6. Inspect the Trace Waterfall.

That is where you see the traces.
