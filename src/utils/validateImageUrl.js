// imgbb image/thumb URLs live on these hosts
const ALLOWED_HOSTS = ["i.ibb.co", "ibb.co"];

export function isValidImgbbUrl(url) {
  if (typeof url !== "string" || !url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && ALLOWED_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}