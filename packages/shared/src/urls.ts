// The cleaned copy of a job URL, used only to decide "is this job already tracked?"
// The original URL is what the user clicks. Tracking extras such as ?utm_source=
// are removed here so the same posting shared two ways counts as one job.
// The database compares these with lower(), so this function does not lowercase the path.

const trackingParam = /^utm(_|$)/i;

export function cleanJobUrl(url: string): string {
  const parsed = new URL(url);
  for (const key of [...parsed.searchParams.keys()]) {
    if (trackingParam.test(key)) parsed.searchParams.delete(key);
  }
  return parsed.toString();
}
