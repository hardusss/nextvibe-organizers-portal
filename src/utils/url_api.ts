/** Base API URL — defaults to the production endpoint if no environment variable is specified. */
export default function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "https://api.nextvibe.io/api/v1";
}
