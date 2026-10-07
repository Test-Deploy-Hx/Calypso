export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.OTEL_SDK_DISABLED === "true"
  ) {
    return;
  }

  if (!process.env.SIGNOZ_INGESTION_KEY && !process.env.DD_API_KEY) {
    console.warn("[Telemetry] Disabled: set SIGNOZ_INGESTION_KEY or DD_API_KEY.");
    return;
  }

  const { registerTelemetry } = await import("./instrumentation.node.js");
  registerTelemetry();
}
