/** Vercel-only mode: no external API, DB, or Supabase required. */
export function isStandaloneMode(): boolean {
  const flag = process.env.NEXT_PUBLIC_STANDALONE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  const url = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  return (
    !url ||
    url === "none" ||
    url === "standalone" ||
    url === "false"
  );
}
