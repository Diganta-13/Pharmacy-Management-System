import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
} from "next/server";

import {
  getRoleHome,
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionUser,
} from "@/lib/auth";

/* =========================================================
   ROUTE HELPERS
========================================================= */

function isAdminPage(
  pathname: string,
) {
  return (
    pathname === "/admin" ||
    pathname.startsWith(
      "/admin/",
    )
  );
}

function isPharmacistPage(
  pathname: string,
) {
  return (
    pathname ===
      "/pharmacist" ||
    pathname.startsWith(
      "/pharmacist/",
    )
  );
}

function isApiRoute(
  pathname: string,
) {
  return (
    pathname === "/api" ||
    pathname.startsWith(
      "/api/",
    )
  );
}

/* =========================================================
   PUBLIC API ROUTES

   These routes must work without an authenticated session.
========================================================= */

function isPublicApi(
  pathname: string,
) {
  return (
    pathname.startsWith(
      "/api/auth/",
    ) ||
    pathname.startsWith(
      "/api/health/",
    )
  );
}

/* =========================================================
   ADMIN-ONLY API GROUPS

   Entire route tree is Admin-only.
========================================================= */

const ADMIN_ONLY_API_PREFIXES = [
  "/api/employees",
  "/api/purchases",
  "/api/reports",
  "/api/settings",
  "/api/suppliers",
  "/api/reorder",
] as const;

function isAdminOnlyApi(
  pathname: string,
) {
  return ADMIN_ONLY_API_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(
        `${prefix}/`,
      ),
  );
}

/* =========================================================
   PHARMACIST-ONLY API GROUP

   Example:
   /api/pharmacist/profile
   /api/pharmacist/medicines
========================================================= */

function isPharmacistOnlyApi(
  pathname: string,
) {
  return (
    pathname ===
      "/api/pharmacist" ||
    pathname.startsWith(
      "/api/pharmacist/",
    )
  );
}

/* =========================================================
   ADMIN-ONLY MUTATIONS

   Some APIs have shared GET access,
   but mutation must be Admin-only.

   Examples:
   GET /api/medicines
   → ADMIN + PHARMACIST

   POST /api/medicines
   → ADMIN only

   PATCH /api/medicines/MED-001
   → ADMIN only
========================================================= */

function isAdminOnlyMutation(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname;

  const method =
    request.method.toUpperCase();

  const isMutation =
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS";

  if (!isMutation) {
    return false;
  }

  /* =======================================================
     MEDICINE MANAGEMENT
  ======================================================= */

  if (
    pathname ===
      "/api/medicines" ||
    pathname.startsWith(
      "/api/medicines/",
    )
  ) {
    return true;
  }

  /* =======================================================
     CATEGORY MANAGEMENT
  ======================================================= */

  if (
    pathname ===
      "/api/categories" ||
    pathname.startsWith(
      "/api/categories/",
    )
  ) {
    return true;
  }

  /* =======================================================
     MANUAL STOCK ADJUSTMENT
  ======================================================= */

  if (
    pathname ===
      "/api/stock/adjust" ||
    pathname.startsWith(
      "/api/stock/adjust/",
    )
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   CLEAR SESSION COOKIE
========================================================= */

function clearSessionCookie(
  response: NextResponse,
) {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite:
        "lax",

      path: "/",

      expires:
        new Date(0),

      maxAge: 0,
    },
  );

  return response;
}

/* =========================================================
   PAGE → LOGIN
========================================================= */

function redirectToLogin(
  request: NextRequest,
) {
  const loginUrl =
    new URL(
      "/login",
      request.url,
    );

  const requestedPath =
    `${request.nextUrl.pathname}${request.nextUrl.search}`;

  loginUrl.searchParams.set(
    "next",
    requestedPath,
  );

  return clearSessionCookie(
    NextResponse.redirect(
      loginUrl,
    ),
  );
}

/* =========================================================
   API → 401
========================================================= */

function apiUnauthorized() {
  const response =
    NextResponse.json(
      {
        success: false,

        authenticated:
          false,

        message:
          "Authentication required. Please sign in.",
      },
      {
        status: 401,
      },
    );

  return clearSessionCookie(
    response,
  );
}

/* =========================================================
   API → 403
========================================================= */

function apiForbidden(
  message:
    string,
) {
  return NextResponse.json(
    {
      success: false,

      message,
    },
    {
      status: 403,
    },
  );
}

/* =========================================================
   VERIFY SESSION
========================================================= */

async function getSessionUser(
  request: NextRequest,
): Promise<SessionUser | null> {
  const token =
    request.cookies.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifySessionToken(
      token,
    );
  } catch (
    error
  ) {
    console.error(
      "Proxy session verification error:",
      error,
    );

    return null;
  }
}

/* =========================================================
   API AUTHORIZATION
========================================================= */

function authorizeApi(
  request: NextRequest,

  sessionUser:
    SessionUser,
) {
  const pathname =
    request.nextUrl.pathname;

  /* =======================================================
     PHARMACIST-SPECIFIC API
  ======================================================= */

  if (
    isPharmacistOnlyApi(
      pathname,
    )
  ) {
    if (
      sessionUser.role !==
      "PHARMACIST"
    ) {
      return apiForbidden(
        "Pharmacist access is required.",
      );
    }

    return NextResponse.next();
  }

  /* =======================================================
     ADMIN-ONLY FULL API GROUP
  ======================================================= */

  if (
    isAdminOnlyApi(
      pathname,
    )
  ) {
    if (
      sessionUser.role !==
      "ADMIN"
    ) {
      return apiForbidden(
        "Administrator access is required.",
      );
    }

    return NextResponse.next();
  }

  /* =======================================================
     ADMIN-ONLY MUTATIONS

     GET remains shared.
  ======================================================= */

  if (
    isAdminOnlyMutation(
      request,
    )
  ) {
    if (
      sessionUser.role !==
      "ADMIN"
    ) {
      return apiForbidden(
        "Administrator access is required for this operation.",
      );
    }

    return NextResponse.next();
  }

  /* =======================================================
     SHARED AUTHENTICATED APIs

     ADMIN + PHARMACIST

     Examples:
     - Sales
     - Customers
     - Stock View
     - Low Stock
     - Expiry Alerts
     - Dashboard
     - Medicine GET
     - Category GET
  ======================================================= */

  if (
    sessionUser.role ===
      "ADMIN" ||
    sessionUser.role ===
      "PHARMACIST"
  ) {
    return NextResponse.next();
  }

  return apiForbidden(
    "Access denied.",
  );
}

/* =========================================================
   MAIN PROXY
========================================================= */

export async function proxy(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname;

  /* =======================================================
     PUBLIC API

     Login/logout/me handle their own auth logic.
     DB health is intentionally kept available
     during development.
  ======================================================= */

  if (
    isApiRoute(
      pathname,
    ) &&
    isPublicApi(
      pathname,
    )
  ) {
    return NextResponse.next();
  }

  /* =======================================================
     SESSION
  ======================================================= */

  const sessionUser =
    await getSessionUser(
      request,
    );

  /* =======================================================
     API ROUTES

     Every non-public API now requires authentication.
  ======================================================= */

  if (
    isApiRoute(
      pathname,
    )
  ) {
    if (!sessionUser) {
      return apiUnauthorized();
    }

    return authorizeApi(
      request,
      sessionUser,
    );
  }

  /* =======================================================
     LOGIN PAGE

     Logged out:
     → show login

     Logged in:
     → role dashboard
  ======================================================= */

  if (
    pathname ===
    "/login"
  ) {
    if (!sessionUser) {
      return NextResponse.next();
    }

    return NextResponse.redirect(
      new URL(
        getRoleHome(
          sessionUser.role,
        ),
        request.url,
      ),
    );
  }

  /* =======================================================
     ADMIN PAGE
  ======================================================= */

  if (
    isAdminPage(
      pathname,
    )
  ) {
    if (!sessionUser) {
      return redirectToLogin(
        request,
      );
    }

    if (
      sessionUser.role !==
      "ADMIN"
    ) {
      return NextResponse.redirect(
        new URL(
          "/pharmacist/dashboard",
          request.url,
        ),
      );
    }

    return NextResponse.next();
  }

  /* =======================================================
     PHARMACIST PAGE
  ======================================================= */

  if (
    isPharmacistPage(
      pathname,
    )
  ) {
    if (!sessionUser) {
      return redirectToLogin(
        request,
      );
    }

    if (
      sessionUser.role !==
      "PHARMACIST"
    ) {
      return NextResponse.redirect(
        new URL(
          "/admin/dashboard",
          request.url,
        ),
      );
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

/* =========================================================
   MATCHER

   One central gate now covers:
   - Login
   - Admin pages
   - Pharmacist pages
   - All API routes
========================================================= */

export const config = {
  matcher: [
    "/login",
    "/admin/:path*",
    "/pharmacist/:path*",
    "/api/:path*",
  ],
};