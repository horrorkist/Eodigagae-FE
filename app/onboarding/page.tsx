import OnboardingPageClient from "./OnboardingPageClient";

type SearchParamValue = string | string[] | undefined;

type OnboardingPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function getSafeDestination(nextPath: string | null | undefined): string {
  if (!nextPath) return "/";
  if (!nextPath.startsWith("/")) return "/";
  if (nextPath.startsWith("//")) return "/";
  return nextPath;
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextValue = resolvedSearchParams?.next;
  const nextPath = Array.isArray(nextValue) ? nextValue[0] : nextValue;
  const destination = getSafeDestination(nextPath);

  return <OnboardingPageClient destination={destination} />;
}
