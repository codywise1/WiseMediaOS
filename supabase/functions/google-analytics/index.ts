import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Sign a JWT for Google service account auth
async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
    ].join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Parse PEM private key
  const pemBody = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .trim();

  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to get Google access token: ${err}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
    const propertyId = Deno.env.get("GA4_PROPERTY_ID");
    const siteUrl = Deno.env.get("SEARCH_CONSOLE_SITE_URL");

    if (!clientEmail || !privateKey) {
      return new Response(
        JSON.stringify({ error: "Google service account credentials not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: "GA4_PROPERTY_ID secret not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
    const authHeader = `Bearer ${accessToken}`;

    // Date range: last 28 days
    const endDate = "today";
    const startDate = "28daysAgo";

    // --- GA4: overview metrics ---
    const gaOverviewBody = {
      dateRanges: [
        { startDate, endDate },
        { startDate: "56daysAgo", endDate: "29daysAgo" }, // previous period for comparison
      ],
      metrics: [
        { name: "totalUsers" },
        { name: "averageSessionDuration" },
        { name: "screenPageViews" },
        { name: "sessions" },
      ],
    };

    // --- GA4: daily unique visitors for chart ---
    const gaChartBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    };

    // --- GA4: top pages ---
    const gaTopPagesBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 5,
    };

    const [overviewRes, chartRes, topPagesRes] = await Promise.all([
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(gaOverviewBody),
      }),
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(gaChartBody),
      }),
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(gaTopPagesBody),
      }),
    ]);

    if (!overviewRes.ok) {
      const err = await overviewRes.text();
      throw new Error(`GA4 overview error: ${err}`);
    }
    if (!chartRes.ok) {
      const err = await chartRes.text();
      throw new Error(`GA4 chart error: ${err}`);
    }
    if (!topPagesRes.ok) {
      const err = await topPagesRes.text();
      throw new Error(`GA4 top pages error: ${err}`);
    }

    const [overviewData, chartData, topPagesData] = await Promise.all([
      overviewRes.json(),
      chartRes.json(),
      topPagesRes.json(),
    ]);

    // Parse overview
    const currentRow = overviewData.rows?.[0];
    const previousRow = overviewData.rows?.[1];

    const parseMetric = (row: unknown, idx: number) =>
      parseFloat((row as { metricValues: { value: string }[] })?.metricValues?.[idx]?.value ?? "0");

    const currentVisitors = parseMetric(currentRow, 0);
    const previousVisitors = parseMetric(previousRow, 0);
    const currentDuration = parseMetric(currentRow, 1); // seconds
    const previousDuration = parseMetric(previousRow, 1);
    const currentPageviews = parseMetric(currentRow, 2);
    const previousPageviews = parseMetric(previousRow, 2);
    const currentSessions = parseMetric(currentRow, 3);
    const previousSessions = parseMetric(previousRow, 3);

    const pctChange = (cur: number, prev: number) =>
      prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 100);

    // Parse chart
    const chartPoints = (chartData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      date: row.dimensionValues[0].value, // YYYYMMDD
      users: parseInt(row.metricValues[0].value, 10),
    }));

    // Parse top pages
    const topPages = (topPagesData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      pageviews: parseInt(row.metricValues[0].value, 10),
    }));

    // --- Search Console: impressions + clicks ---
    let searchConsole = null;
    if (siteUrl) {
      const scRes = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0],
            endDate: new Date(Date.now() - 86400000).toISOString().split("T")[0], // yesterday
            dimensions: [],
          }),
        }
      );
      if (scRes.ok) {
        const scData = await scRes.json();
        const row = scData.rows?.[0];
        searchConsole = {
          impressions: row?.impressions ?? 0,
          clicks: row?.clicks ?? 0,
          ctr: row ? Math.round((row.ctr ?? 0) * 1000) / 10 : 0,
          position: row ? Math.round((row.position ?? 0) * 10) / 10 : 0,
        };
      }
    }

    const formatDuration = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = Math.round(seconds % 60);
      return `${m}m ${s}s`;
    };

    return new Response(
      JSON.stringify({
        overview: {
          visitors: Math.round(currentVisitors),
          visitorsPct: pctChange(currentVisitors, previousVisitors),
          avgDuration: formatDuration(currentDuration),
          avgDurationPct: pctChange(currentDuration, previousDuration),
          pageviews: Math.round(currentPageviews),
          pageviewsPct: pctChange(currentPageviews, previousPageviews),
          sessions: Math.round(currentSessions),
          sessionsPct: pctChange(currentSessions, previousSessions),
        },
        chart: chartPoints,
        topPages,
        searchConsole,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
