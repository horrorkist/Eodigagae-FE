import { NextRequest, NextResponse } from "next/server";
import {
  ONBOARDING_COOKIE_NAME,
  ONBOARDING_COOKIE_VALUE,
} from "./lib/onboarding";

function isOnboardingCompleted(request: NextRequest): boolean {
  return (
    request.cookies.get(ONBOARDING_COOKIE_NAME)?.value ===
    ONBOARDING_COOKIE_VALUE
  );
}

function isSafeNextPath(path: string | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  return true;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasOnboarded = isOnboardingCompleted(request);

  if (!hasOnboarded && pathname !== "/onboarding") {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";

    const nextPath = `${pathname}${search}`;
    if (isSafeNextPath(nextPath)) {
      onboardingUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(onboardingUrl);
  }

  if (hasOnboarded && pathname === "/onboarding") {
    const destination = request.nextUrl.searchParams.get("next");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isSafeNextPath(destination) ? destination : "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
