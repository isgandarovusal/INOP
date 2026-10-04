import api from "./axios";
// Adapter for existing fetch-shaped service contracts; authentication/error handling is centralized in Axios.
export default async function authenticatedFetch(
  input: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = Object.fromEntries(new Headers(options.headers).entries());
  const response = await api.request({
    url: new URL(input, window.location.origin).href,
    method: options.method || "GET",
    data: options.body,
    headers,
    signal: options.signal || undefined,
  });
  return new Response(JSON.stringify(response.data), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
