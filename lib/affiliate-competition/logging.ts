export type AffiliateCompetitionLogLevel = "info" | "error";

export function logAffiliateCompetition(
  level: AffiliateCompetitionLogLevel,
  event: string,
  payload: Record<string, unknown>,
) {
  const line = JSON.stringify({
    scope: "affiliate_competition",
    level,
    event,
    at: new Date().toISOString(),
    ...payload,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  console.info(line);
}
