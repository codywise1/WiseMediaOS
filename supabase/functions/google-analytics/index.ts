import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

const gaReport = (propertyId: string, authHeader: string, body: object) =>
  fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

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

    const endDate = "today";
    const startDate = "28daysAgo";
    const prevStartDate = "56daysAgo";
    const prevEndDate = "29daysAgo";

    // --- GA4: overview metrics (with bounce rate, engagements, new/returning) ---
    const gaOverviewBody = {
      dateRanges: [
        { startDate, endDate },
        { startDate: prevStartDate, endDate: prevEndDate },
      ],
      metrics: [
        { name: "totalUsers" },
        { name: "averageSessionDuration" },
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "bounceRate" },
        { name: "screenPageViewsPerSession" },
        { name: "newUsers" },
        { name: "engagedSessions" },
        { name: "engagementRate" },
        { name: "eventsPerSession" },
      ],
    };

    // --- GA4: daily unique visitors for chart ---
    const gaChartBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    };

    // --- GA4: top pages ---
    const gaTopPagesBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 8,
    };

    // --- GA4: traffic sources (medium) ---
    const gaTrafficBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionMedium" }, { name: "sessionSource" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 8,
    };

    // --- GA4: device categories ---
    const gaDeviceBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    };

    // --- GA4: top countries ---
    const gaCountryBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 8,
    };

    // --- GA4: top referrers ---
    const gaReferrerBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 8,
      dimensionFilter: {
        filter: {
          fieldName: "sessionMedium",
          stringFilter: { matchType: "EXACT", value: "referral" },
        },
      },
    };

    // --- GA4: new vs returning ---
    const gaNewReturningBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "newVsReturning" }],
      metrics: [{ name: "totalUsers" }, { name: "sessions" }],
    };

    // --- GA4: top landing pages ---
    const gaLandingBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "landingPagePlusQueryString" }],
      metrics: [
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 8,
    };

    const [
      overviewRes, chartRes, topPagesRes, trafficRes, deviceRes,
      countryRes, referrerRes, newReturningRes, landingRes,
    ] = await Promise.all([
      gaReport(propertyId, authHeader, gaOverviewBody),
      gaReport(propertyId, authHeader, gaChartBody),
      gaReport(propertyId, authHeader, gaTopPagesBody),
      gaReport(propertyId, authHeader, gaTrafficBody),
      gaReport(propertyId, authHeader, gaDeviceBody),
      gaReport(propertyId, authHeader, gaCountryBody),
      gaReport(propertyId, authHeader, gaReferrerBody),
      gaReport(propertyId, authHeader, gaNewReturningBody),
      gaReport(propertyId, authHeader, gaLandingBody),
    ]);

    const responses = [
      overviewRes, chartRes, topPagesRes, trafficRes, deviceRes,
      countryRes, referrerRes, newReturningRes, landingRes,
    ];
    const labels = ["overview", "chart", "topPages", "traffic", "device", "country", "referrer", "newReturning", "landing"];
    for (let i = 0; i < responses.length; i++) {
      if (!responses[i].ok) {
        const err = await responses[i].text();
        throw new Error(`GA4 ${labels[i]} error: ${err}`);
      }
    }

    const [
      overviewData, chartData, topPagesData, trafficData, deviceData,
      countryData, referrerData, newReturningData, landingData,
    ] = await Promise.all(responses.map((r) => r.json()));

    const parseMetric = (row: unknown, idx: number) =>
      parseFloat((row as { metricValues: { value: string }[] })?.metricValues?.[idx]?.value ?? "0");

    // Parse overview
    const currentRow = overviewData.rows?.[0];
    const previousRow = overviewData.rows?.[1];

    const currentVisitors = parseMetric(currentRow, 0);
    const previousVisitors = parseMetric(previousRow, 0);
    const currentDuration = parseMetric(currentRow, 1);
    const previousDuration = parseMetric(previousRow, 1);
    const currentPageviews = parseMetric(currentRow, 2);
    const previousPageviews = parseMetric(previousRow, 2);
    const currentSessions = parseMetric(currentRow, 3);
    const previousSessions = parseMetric(previousRow, 3);
    const currentBounceRate = parseMetric(currentRow, 4);
    const previousBounceRate = parseMetric(previousRow, 4);
    const currentPagesPerSession = parseMetric(currentRow, 5);
    const previousPagesPerSession = parseMetric(previousRow, 5);
    const currentNewUsers = parseMetric(currentRow, 6);
    const previousNewUsers = parseMetric(previousRow, 6);
    const currentEngagedSessions = parseMetric(currentRow, 7);
    const currentEngagementRate = parseMetric(currentRow, 8);
    const currentEventsPerSession = parseMetric(currentRow, 9);

    const pctChange = (cur: number, prev: number) =>
      prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 100);

    // Parse chart
    const chartPoints = (chartData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      date: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value, 10),
      sessions: parseInt(row.metricValues[1].value, 10),
      pageviews: parseInt(row.metricValues[2].value, 10),
    }));

    // Parse top pages
    const topPages = (topPagesData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      pageviews: parseInt(row.metricValues[0].value, 10),
      avgTime: Math.round(parseMetric(row, 1)),
    }));

    // Parse traffic sources
    const trafficSources = (trafficData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      medium: row.dimensionValues[0].value || "(none)",
      source: row.dimensionValues[1].value || "(direct)",
      sessions: parseInt(row.metricValues[0].value, 10),
      users: parseInt(row.metricValues[1].value, 10),
    }));

    // Parse devices
    const devices = (deviceData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      device: row.dimensionValues[0].value || "unknown",
      sessions: parseInt(row.metricValues[0].value, 10),
      users: parseInt(row.metricValues[1].value, 10),
    }));

    // Parse countries
    const countries = (countryData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      country: row.dimensionValues[0].value || "Unknown",
      sessions: parseInt(row.metricValues[0].value, 10),
      users: parseInt(row.metricValues[1].value, 10),
    }));

    // Parse referrers
    const referrers = (referrerData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      source: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value, 10),
    }));

    // Parse new vs returning
    const newVsReturning = (newReturningData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      type: row.dimensionValues[0].value || "new",
      users: parseInt(row.metricValues[0].value, 10),
      sessions: parseInt(row.metricValues[1].value, 10),
    }));

    // Parse landing pages
    const landingPages = (landingData.rows ?? []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      path: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value, 10),
      pageviews: parseInt(row.metricValues[1].value, 10),
      avgTime: Math.round(parseMetric(row, 2)),
      bounceRate: Math.round(parseMetric(row, 3) * 10) / 10,
    }));

    // --- Search Console: impressions + clicks + top queries ---
    let searchConsole: any = null;
    if (siteUrl) {
      const scStartDate = new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];
      const scEndDate = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      const [scRes, scQueryRes] = await Promise.all([
        fetch(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
          {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({
              startDate: scStartDate,
              endDate: scEndDate,
              dimensions: [],
            }),
          }
        ),
        fetch(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
          {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({
              startDate: scStartDate,
              endDate: scEndDate,
              dimensions: ["query"],
              rowLimit: 10,
            }),
          }
        ),
      ]);

      if (scRes.ok) {
        const scData = await scRes.json();
        const row = scData.rows?.[0];
        let topQueries: any[] = [];
        if (scQueryRes.ok) {
          const scqData = await scQueryRes.json();
          topQueries = (scqData.rows ?? []).map((r: any) => ({
            query: r.keys[0],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: Math.round((r.ctr ?? 0) * 1000) / 10,
            position: Math.round((r.position ?? 0) * 10) / 10,
          }));
        }
        searchConsole = {
          impressions: row?.impressions ?? 0,
          clicks: row?.clicks ?? 0,
          ctr: row ? Math.round((row.ctr ?? 0) * 1000) / 10 : 0,
          position: row ? Math.round((row.position ?? 0) * 10) / 10 : 0,
          topQueries,
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
          bounceRate: Math.round(currentBounceRate * 10) / 10,
          bounceRatePct: pctChange(currentBounceRate, previousBounceRate),
          pagesPerSession: Math.round(currentPagesPerSession * 100) / 100,
          pagesPerSessionPct: pctChange(currentPagesPerSession, previousPagesPerSession),
          newUsers: Math.round(currentNewUsers),
          newUsersPct: pctChange(currentNewUsers, previousNewUsers),
          engagedSessions: Math.round(currentEngagedSessions),
          engagementRate: Math.round(currentEngagementRate * 1000) / 10,
          eventsPerSession: Math.round(currentEventsPerSession * 100) / 100,
        },
        chart: chartPoints,
        topPages,
        trafficSources,
        devices,
        countries,
        referrers,
        newVsReturning,
        landingPages,
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
