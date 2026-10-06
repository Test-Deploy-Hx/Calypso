# Deploy Demo Image

This Next.js app serves the Hyphen Deploy demo page: the original logo centered on a white background. It also builds a Docker image for initializing a Deploy pipeline.

## Development

Use Node.js 20.9 or newer (the Docker image uses Node.js 24).

```sh
npm ci
npm run dev
```

Open http://localhost:5000. Edit `app/[[...path]]/page.js` for the page, `app/globals.css` for its styles, and `app/layout.js` for the title and icons. Images are in `public/images` and keep their original `/images/...` URLs. The optional catch-all page preserves the original server's fallback behavior for other paths, including `/index.html`.

To build and run the production app locally:

```sh
npm run build
npm start
```

The server defaults to port 5000. Set `PORT` in the shell to override it, for example `PORT=5001 npm run dev`. Next.js chooses its port before loading `.env` files, so `PORT` in `.env.development` or `.env.local` does not configure the listener.

## SigNoz and Datadog APM and logs

Server logs, request traces, and render traces use service name `Calypso` and environment `development`, including when running a production build. Both SigNoz Cloud US2 and Datadog US1 (`app.datadoghq.com`) receive logs and traces. Datadog uses its [OTLP logs intake](https://docs.datadoghq.com/opentelemetry/setup/otlp_ingest/logs/) and [OTLP traces intake](https://docs.datadoghq.com/opentelemetry/setup/otlp_ingest/traces/), with Protobuf over HTTP. The trace exporter sends `compute_stats: true` to enable APM trace metrics. No Datadog Agent is required for this setup.

Copy `.env.example` to `.env.local` for a new setup, or add `DD_API_KEY` to your existing `.env.local` to enable Datadog alongside SigNoz. Set `SIGNOZ_INGESTION_KEY` from **Settings > Ingestion** in SigNoz and `DD_API_KEY` from **Organization Settings > API Keys** in Datadog, then fully restart the app. Each destination is enabled by its own key. Keep both keys server-side; `.env.local` is ignored by Git and excluded from Docker builds.

The shared service and environment can be overridden with `OTEL_SERVICE_NAME` and `OTEL_RESOURCE_ATTRIBUTES` (for example, `deployment.environment.name=development`). `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` configure SigNoz and must include `/v1/traces` and `/v1/logs`, respectively. `DD_LOGS_OTLP_ENDPOINT` and `DD_TRACES_OTLP_ENDPOINT` configure Datadog separately and default to `https://otlp.datadoghq.com/v1/logs` and `https://otlp.datadoghq.com/v1/traces` for US1. Use the endpoints for your exact account site when changing regions.

Set `OTEL_SDK_DISABLED=true` to turn all instrumentation off, or `OTEL_LOG_LEVEL=debug` to troubleshoot export failures. `OTEL_LOG_LEVEL` controls SDK diagnostics in the terminal, not application log severity. Exporters use independent batches, so a failed export to one destination does not stop delivery to the other.

Server-side `console.log`, `console.info`, `console.warn`, `console.error`, and `console.debug` messages are sent to every enabled destination and still printed locally. Logs emitted during a traced request carry the active trace context. The same request traces are exported to both enabled destinations. Browser console messages and terminal output written before the instrumentation starts are not captured.

Completed Next.js request spans also emit an INFO log to both enabled destinations, for example `GET / 200 in 42ms`. These logs include structured method, path, response status, duration in milliseconds, and the request's trace and span IDs. Query strings are omitted. The duration covers the Next.js request span; development-only compile and render timing breakdowns are not included. Request logs follow the configured trace sampling policy and are emitted directly to the log exporters without adding another request line to the local console.

For Docker, pass the configuration at runtime:

```sh
docker run --env-file .env.local -p 5000:5000 deploy-demo
```

To verify logs, restart the app and look for `[Telemetry] Server log and trace export initialized: SigNoz, Datadog.` in the last 15 minutes. In SigNoz **Logs**, filter by `service.name=Calypso` and `deployment.environment.name=development`. In Datadog **Logs > Explorer**, filter by `service:Calypso env:development`. Alternatively, open **Live Tail** before restarting to watch new logs arrive. The startup message lists only destinations with a configured key. Allow a few seconds for the batches to arrive. Initialization confirms that the SDK started; authentication or network failures are reported separately in the terminal.

To verify APM, fully restart `npm run dev`, visit the local URL printed by Next.js, and refresh the page several times to generate request spans. In Datadog, open **APM > Services**, select environment `development` and the last 15 minutes, and look for `Calypso` (or `calypso` if normalized by Datadog). Allow a few minutes for service metrics to appear. You can also check **APM > Trace Explorer** with those filters. In SigNoz, open **Services** or **Traces**. Starting the app emits a console log; serving requests generates the traces needed for APM.

## Docker

The container serves the Next.js production app on port 5000.

### Build
```
docker build -t deploy-demo .
```
### Run
```
docker run -d -p 5000:5000 deploy-demo
```

Open http://localhost:5000.

## Deployment

The Github Actions for this repository will automatically deploy the new image to GCP on a push to `main`. The image will be tagged with the git commit sha and `latest`. GCP's Artifact Registry will automatically maintain unique tags. There is no cleanup needed by the action for duplicate `latest` tags. 

The image is hosted at `us-docker.pkg.dev/hyphenai/public/deploy-demo` on GCP. This docker repository is publically accessible. 

## Usage

To pull the deployed image, use: 

```
docker pull us-docker.pkg.dev/hyphenai/public/deploy-demo
```
