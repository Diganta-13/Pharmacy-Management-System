import {
  NextResponse,
} from "next/server";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

/* =========================================================
   RUNTIME
========================================================= */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/* =========================================================
   POST
   /api/auth/logout

   Purpose:
   - Destroy authentication session
   - Remove HttpOnly cookie
   - Return login redirect destination
========================================================= */

export async function POST() {
  try {
    const response =
      NextResponse.json(
        {
          success: true,

          message:
            "Logged out successfully.",

          redirectTo:
            "/login",
        },
        {
          status: 200,
        },
      );

    /* =====================================================
       DELETE SESSION COOKIE

       Explicit cookie configuration makes sure
       the same cookie path is targeted.
    ===================================================== */

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
  } catch (error) {
    console.error(
      "POST /api/auth/logout error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to log out. Please try again.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   OPTIONAL GET PROTECTION

   Logout must happen through POST.

   This prevents accidental logout by:
   - browser prefetching
   - crawlers
   - normal link navigation
========================================================= */

export async function GET() {
  return NextResponse.json(
    {
      success: false,

      message:
        "Method not allowed. Use POST to log out.",
    },
    {
      status: 405,

      headers: {
        Allow: "POST",
      },
    },
  );
}