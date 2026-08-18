import { compare } from "bcryptjs";

import {
  NextResponse,
} from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

import {
  createSessionToken,
  getRoleHome,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  type UserRole,
} from "@/lib/auth";

/* =========================================================
   RUNTIME

   Authentication uses:
   - MySQL
   - bcrypt
   - server-side crypto

   Keep this API on Node.js runtime.
========================================================= */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

interface LoginUserRow
  extends RowDataPacket {
  id: number;

  full_name: string;

  email: string;

  password_hash: string;

  status: UserStatus;

  role_name: string;
}

type LoginRequestBody = {
  email?: unknown;

  password?: unknown;

  role?: unknown;

  rememberMe?: unknown;
};

/* =========================================================
   HELPERS
========================================================= */

function cleanString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeEmail(
  value: unknown,
) {
  return cleanString(
    value,
  ).toLowerCase();
}

function normalizeRole(
  value: unknown,
): UserRole | null {
  const normalized =
    cleanString(
      value,
    ).toUpperCase();

  if (
    normalized ===
      "ADMIN" ||
    normalized ===
      "PHARMACIST"
  ) {
    return normalized;
  }

  return null;
}

function isValidEmail(
  email: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

/* =========================================================
   POST
   /api/auth/login
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       READ BODY
    ===================================================== */

    let body:
      LoginRequestBody;

    try {
      body =
        (await request.json()) as
          LoginRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       NORMALIZE INPUT
    ===================================================== */

    const email =
      normalizeEmail(
        body.email,
      );

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    const selectedRole =
      normalizeRole(
        body.role,
      );

    const rememberMe =
      body.rememberMe ===
      true;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!email) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Email address is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidEmail(
        email,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Password is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      password.length >
      200
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    if (!selectedRole) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please select a valid login role.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       FIND USER

       Important:
       Password hash is never returned to the client.
    ===================================================== */

    const [rows] =
      await db.execute<
        LoginUserRow[]
      >(
        `
          SELECT
            u.id,
            u.full_name,
            u.email,
            u.password_hash,
            u.status,

            r.name AS role_name

          FROM users u

          INNER JOIN roles r
            ON r.id = u.role_id

          WHERE
            LOWER(u.email) = ?

          LIMIT 1
        `,
        [
          email,
        ],
      );

    /* =====================================================
       USER NOT FOUND

       Use generic response so login
       does not expose whether an email exists.
    ===================================================== */

    if (
      rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    const user =
      rows[0];

    /* =====================================================
       PASSWORD CHECK
    ===================================================== */

    let passwordMatches =
      false;

    try {
      passwordMatches =
        await compare(
          password,
          user.password_hash,
        );
    } catch (
      error
    ) {
      console.error(
        "Password verification error:",
        error,
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Unable to verify login credentials.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !passwordMatches
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    /* =====================================================
       ACCOUNT STATUS

       Only ACTIVE accounts can sign in.
    ===================================================== */

    if (
      user.status !==
      "ACTIVE"
    ) {
      const statusMessage =
        user.status ===
        "SUSPENDED"
          ? "Your account has been suspended. Please contact the administrator."
          : "Your account is inactive. Please contact the administrator.";

      return NextResponse.json(
        {
          success: false,

          message:
            statusMessage,
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       DATABASE ROLE
    ===================================================== */

    const databaseRole =
      normalizeRole(
        user.role_name,
      );

    if (!databaseRole) {
      console.error(
        "Unsupported role found for login user:",
        user.role_name,
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "This account does not have a valid system role.",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       SELECTED ROLE MUST MATCH DB ROLE

       Example:

       Pharmacist account +
       Administrator tab
       = rejected.
    ===================================================== */

    if (
      databaseRole !==
      selectedRole
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            selectedRole ===
            "ADMIN"
              ? "This account does not have administrator access."
              : "This account does not have pharmacist access.",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       CREATE SIGNED SESSION
    ===================================================== */

    const sessionToken =
      await createSessionToken(
        {
          userId:
            Number(
              user.id,
            ),

          email:
            user.email,

          fullName:
            user.full_name,

          role:
            databaseRole,
        },
      );

    /* =====================================================
       UPDATE LAST LOGIN

       Authentication has already succeeded.

       If this update fails, do not silently create
       a session because audit information should remain
       consistent.
    ===================================================== */

    const [
      updateResult,
    ] =
      await db.execute<
        ResultSetHeader
      >(
        `
          UPDATE users

          SET
            last_login_at =
              NOW()

          WHERE
            id = ?
            AND status =
              'ACTIVE'
        `,
        [
          user.id,
        ],
      );

    if (
      updateResult.affectedRows !==
      1
    ) {
      console.error(
        "Login succeeded but last_login_at could not be updated for user:",
        user.id,
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Unable to complete sign in. Please try again.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       REDIRECT DESTINATION
    ===================================================== */

    const redirectTo =
      getRoleHome(
        databaseRole,
      );

    /* =====================================================
       RESPONSE

       Do NOT return:
       - password
       - password hash
       - session token

       Session token stays in HttpOnly cookie.
    ===================================================== */

    const response =
      NextResponse.json(
        {
          success: true,

          message:
            "Login successful.",

          data: {
            user: {
              id:
                Number(
                  user.id,
                ),

              fullName:
                user.full_name,

              email:
                user.email,

              role:
                databaseRole,
            },

            redirectTo,
          },
        },
        {
          status: 200,
        },
      );

    /* =====================================================
       COOKIE

       Remember Me = true
       → persistent cookie for token lifetime

       Remember Me = false
       → browser-session cookie

       Token itself still expires according
       to auth.ts session expiration.
    ===================================================== */

    const cookieOptions =
      getSessionCookieOptions();

    if (rememberMe) {
      response.cookies.set(
        SESSION_COOKIE_NAME,

        sessionToken,

        cookieOptions,
      );
    } else {
      const {
        maxAge:
          _maxAge,

        ...sessionCookieOptions
      } =
        cookieOptions;

      response.cookies.set(
        SESSION_COOKIE_NAME,

        sessionToken,

        sessionCookieOptions,
      );
    }

    return response;
  } catch (error) {
    console.error(
      "POST /api/auth/login error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error &&
          error.message.includes(
            "AUTH_SECRET",
          )
            ? "Authentication configuration error. Please check AUTH_SECRET."
            : "An unexpected error occurred while signing in.",
      },
      {
        status: 500,
      },
    );
  }
}