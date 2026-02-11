/**
 * URL에서 host(호스트명)만 추출합니다.
 * @example urlToHost("https://api.example.com/v1/users") → "api.example.com"
 * @example urlToHost("http://sub.example.com") → "sub.example.com"
 */
export function urlToHost(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname;
  } catch {
    return url.trim();
  }
}
