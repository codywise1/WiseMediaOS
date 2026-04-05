/**
 * Whereby API Service
 * ------------------------------------------------------------------
 * Creates Whereby meeting rooms by calling our local Vite proxy
 * (dev) which forwards requests to https://api.whereby.dev/v1
 * and injects the Bearer token server-side.
 *
 * In production, replace WHEREBY_API_ENDPOINT with your real
 * backend URL (e.g. a Supabase Edge Function or Express route).
 * ------------------------------------------------------------------
 */

const WHEREBY_API_ENDPOINT =
  import.meta.env.VITE_WHEREBY_API_ENDPOINT ?? '/api/whereby';

export interface WherebyMeetingResponse {
  meetingId: string;
  startDate: string;
  endDate: string;
  roomUrl: string;
  hostRoomUrl: string;
  viewerRoomUrl?: string;
}

export interface CreateWherebyMeetingOptions {
  /** Human-readable prefix for the room name */
  roomNamePrefix?: string;
  /** ISO-8601 duration string, e.g. "PT1H" (1 hour). Defaults to 1 hour. */
  endDate?: string;
  /** Fields to include in the response */
  fields?: string[];
}

/**
 * Creates a new Whereby meeting room and returns the room URL.
 *
 * @throws {Error} if the API call fails
 */
export async function createWherebyRoom(
  options: CreateWherebyMeetingOptions = {}
): Promise<WherebyMeetingResponse> {
  const {
    roomNamePrefix = 'wisemedia',
    endDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h from now
    fields = ['hostRoomUrl'],
  } = options;

  const res = await fetch(`${WHEREBY_API_ENDPOINT}/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endDate,
      fields,
      roomNamePrefix,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Whereby API error ${res.status}: ${body}`
    );
  }

  return res.json() as Promise<WherebyMeetingResponse>;
}
