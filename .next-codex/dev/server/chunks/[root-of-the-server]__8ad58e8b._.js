module.exports = [
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/tags-manifest.external.js [external] (next/dist/server/lib/incremental-cache/tags-manifest.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/tags-manifest.external.js", () => require("next/dist/server/lib/incremental-cache/tags-manifest.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/lib/onboarding.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "COACHMARK_COOKIE_NAME",
    ()=>COACHMARK_COOKIE_NAME,
    "COACHMARK_COOKIE_VALUE",
    ()=>COACHMARK_COOKIE_VALUE,
    "ONBOARDING_COOKIE_MAX_AGE_SECONDS",
    ()=>ONBOARDING_COOKIE_MAX_AGE_SECONDS,
    "ONBOARDING_COOKIE_NAME",
    ()=>ONBOARDING_COOKIE_NAME,
    "ONBOARDING_COOKIE_VALUE",
    ()=>ONBOARDING_COOKIE_VALUE
]);
const ONBOARDING_COOKIE_NAME = "dg_onboarding_completed";
const ONBOARDING_COOKIE_VALUE = "1";
const ONBOARDING_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const COACHMARK_COOKIE_NAME = "dg_coachmark_completed";
const COACHMARK_COOKIE_VALUE = "1";
}),
"[project]/proxy.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "proxy",
    ()=>proxy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$onboarding$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/onboarding.ts [middleware] (ecmascript)");
;
;
function isOnboardingCompleted(request) {
    return request.cookies.get(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$onboarding$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ONBOARDING_COOKIE_NAME"])?.value === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$onboarding$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ONBOARDING_COOKIE_VALUE"];
}
function isSafeNextPath(path) {
    if (!path) return false;
    if (!path.startsWith("/")) return false;
    if (path.startsWith("//")) return false;
    return true;
}
function proxy(request) {
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
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(onboardingUrl);
    }
    if (hasOnboarded && pathname === "/onboarding") {
        const destination = request.nextUrl.searchParams.get("next");
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = isSafeNextPath(destination) ? destination : "/";
        redirectUrl.search = "";
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(redirectUrl);
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)"
    ]
};
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8ad58e8b._.js.map