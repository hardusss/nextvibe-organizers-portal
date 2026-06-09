/** Base API URL — uses Next.js proxy to bypass CORS. */
export default function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
}
