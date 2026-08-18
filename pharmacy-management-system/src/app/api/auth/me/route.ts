import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

import {
  getRoleHome,
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type UserRole,
} from "@/lib/auth";

/* =========================================================
   RUNTIME
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

interface CurrentUserRow
  extends RowDataPacket {
  id: number;

  full_name: string;

  email: string;

  status: UserStatus;

  role_name: string;

  last_login_at:
    | string
    | null;
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeRole(
  value: unknown,
): UserRole | null {
  if (
    value === "ADMIN" ||
    value === "PHARMACIST"
  ) {
    return value;
  }

  return null;
}

/* =========================================================
   UNAUTHORIZED RESPONSE

   Also clears invalid/expired session cookie.
========================================================= */

function unauthorized(
  message =
    "Authentication required.",
) {
  const response =
    NextResponse.json(
      {
        success: false,

        authenticated: false,

        message,
      },
      {
        status: 401,
      },
    );

  response.cookies.delete(
    SESSION_COOKIE_NAME,
  );

  return response;
}

/* =========================================================
   GET
   /api/auth/me

   Purpose:
   - Read HttpOnly session cookie
   - Verify signature
   - Verify expiration
   - Load current user from database
   - Confirm account is ACTIVE
   - Confirm role has not changed
========================================================= */

export async function GET() {
  try {
    /* =====================================================
       READ COOKIE
    ===================================================== */

    const cookieStore =
      await cookies();

    const sessionToken =
      cookieStore.get(
        SESSION_COOKIE_NAME,
      )?.value;

    /* =====================================================
       NO COOKIE
    ===================================================== */

    if (!sessionToken) {
      return unauthorized();
    }

    /* =====================================================
       VERIFY SIGNED SESSION
    ===================================================== */

    const sessionUser =
      await verifySessionToken(
        sessionToken,
      );

    if (!sessionUser) {
      return unauthorized(
        "Your session is invalid or has expired. Please sign in again.",
      );
    }

    /* =====================================================
       VERIFY USER STILL EXISTS IN DB

       Session token is not trusted alone.

       The database remains authoritative for:
       - account status
       - role
       - name
       - email
    ===================================================== */

    const [rows] =
      await db.execute<
        CurrentUserRow[]
      >(
        `
          SELECT
            u.id,
            u.full_name,
            u.email,
            u.status,

            r.name AS role_name,

            DATE_FORMAT(
              u.last_login_at,
              '%Y-%m-%d %H:%i:%s'
            ) AS last_login_at

          FROM users u

          INNER JOIN roles r
            ON r.id = u.role_id

          WHERE
            u.id = ?

          LIMIT 1
        `,
        [
          sessionUser.userId,
        ],
      );

    /* =====================================================
       USER DELETED / NOT FOUND
    ===================================================== */

    if (
      rows.length === 0
    ) {
      return unauthorized(
        "Your account could not be found. Please sign in again.",
      );
    }

    const user =
      rows[0];

    /* =====================================================
       ACCOUNT STATUS
    ===================================================== */

    if (
      user.status !==
      "ACTIVE"
    ) {
      return unauthorized(
        user.status ===
        "SUSPENDED"
          ? "Your account has been suspended."
          : "Your account is currently inactive.",
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
      return unauthorized(
        "Your account does not have a valid system role.",
      );
    }

    /* =====================================================
       ROLE CHANGED AFTER LOGIN

       Example:
       Token says PHARMACIST
       DB now says ADMIN

       → old session becomes invalid
       → user must log in again
    ===================================================== */

    if (
      databaseRole !==
      sessionUser.role
    ) {
      return unauthorized(
        "Your account permissions have changed. Please sign in again.",
      );
    }

    /* =====================================================
       SUCCESS

       Return fresh database identity.
       Never return session token/password/password_hash.
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        authenticated: true,

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

            lastLoginAt:
              user.last_login_at,
          },

          home:
            getRoleHome(
              databaseRole,
            ),
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "GET /api/auth/me error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        authenticated: false,

        message:
          "Unable to verify the current session.",
      },
      {
        status: 500,
      },
    );
  }
}