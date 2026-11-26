export function categoryThreshold(configuration: string, category: string, fallback: number) {
  for (const line of configuration.split("\n")) {
    const match = /^\s*([^=]+?)\s*=\s*(\d+)\s*$/.exec(line);
    if (match && match[1].toLowerCase() === category.trim().toLowerCase() && Number(match[2]) >= 1 && Number(match[2]) <= 100000) return Number(match[2]);
  }
  return fallback;
}

export async function achievementId(owner: string, code: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner + ":" + code)));
  hash[6] = (hash[6] & 15) | 128;
  hash[8] = (hash[8] & 63) | 128;
  const hex = Array.from(hash.slice(0,16), (part) => part.toString(16).padStart(2,"0")).join("");
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join("-");
}
