function parseMockMode() {
  if (process.env.DEMOGENIE_MOCK_MODE) {
    return process.env.DEMOGENIE_MOCK_MODE !== "false";
  }
  return !process.env.HEYGEN_API_KEY;
}

function publicSettings(overrides = {}) {
  const apiKey = process.env.HEYGEN_API_KEY || "";
  return {
    heygenKeyConfigured: Boolean(apiKey),
    heygenKeyLast4: apiKey ? apiKey.slice(-4) : null,
    mockMode: overrides.mockMode ?? parseMockMode(),
    defaultTone: overrides.defaultTone ?? "Confident",
    defaultLanguage: overrides.defaultLanguage ?? "English",
    defaultTemplate: overrides.defaultTemplate ?? "Product Launch",
  };
}

export async function handler(event) {
  if (event.httpMethod === "GET") {
    return json(200, publicSettings());
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const body = event.body ? JSON.parse(event.body) : {};
  return json(
    200,
    publicSettings({
      mockMode: typeof body.mockMode === "boolean" ? body.mockMode : undefined,
      defaultTone: body.defaultTone,
      defaultLanguage: body.defaultLanguage,
      defaultTemplate: body.defaultTemplate,
    }),
  );
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}
