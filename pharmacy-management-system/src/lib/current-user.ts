import {
  cookies,
} from "next/headers";

import type {
  RowDataPacket,
} from "mysql2";

import type {
  PoolConnection,
} from "mysql2/promise";

import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type UserRole,
} from "@/lib/auth";

/* =========================================================
   TYPES
========================================================= */

interface CurrentUserRow
  extends RowDataPacket {
  id: number;

  full_name: string;

  email: string;

  status:
    | "ACTIVE"
    | "INACTIVE"
    | "SUSPENDED";

  role_name: string;
}

export type CurrentUser = {
  userId: number;

  fullName: string;

  email: string;

  role: UserRole;
};

/* =========================================================
   ROLE NORMALIZER
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
   GET CURRENT AUTHENTICATED USER

   Flow:

   HttpOnly Cookie
        ↓
   Verify Signed Session
        ↓
   Get userId from token
        ↓
   Re-check user in database
        ↓
   Account must still be ACTIVE
        ↓
   Database role must match token role
        ↓
   Return trusted current user
========================================================= */

export async function getCurrentUser(
  connection: PoolConnection,
): Promise<CurrentUser> {
  /* =======================================================
     READ SESSION COOKIE
  ======================================================= */

  const cookieStore =
    await cookies();

  const sessionToken =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  /* =======================================================
     NO SESSION
  ======================================================= */

  if (!sessionToken) {
    throw new Error(
      "AUTHENTICATION_REQUIRED",
    );
  }

  /* =======================================================
     VERIFY SESSION TOKEN
  ======================================================= */

  const sessionUser =
    await verifySessionToken(
      sessionToken,
    );

  if (!sessionUser) {
    throw new Error(
      "INVALID_OR_EXPIRED_SESSION",
    );
  }

  /* =======================================================
     LOAD CURRENT DATABASE USER

     Important:
     The signed token is not the final authority.

     We verify again from database so:
     - deleted users stop working
     - inactive users stop working
     - suspended users stop working
     - role changes invalidate old sessions
  ======================================================= */

  const [rows] =
    await connection.execute<
      CurrentUserRow[]
    >(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.status,

          r.name AS role_name

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

  /* =======================================================
     USER NOT FOUND
  ======================================================= */

  if (
    rows.length === 0
  ) {
    throw new Error(
      "CURRENT_USER_NOT_FOUND",
    );
  }

  const user =
    rows[0];

  /* =======================================================
     ACCOUNT STATUS
  ======================================================= */

  if (
    user.status !==
    "ACTIVE"
  ) {
    if (
      user.status ===
      "SUSPENDED"
    ) {
      throw new Error(
        "USER_ACCOUNT_SUSPENDED",
      );
    }

    throw new Error(
      "USER_ACCOUNT_INACTIVE",
    );
  }

  /* =======================================================
     DATABASE ROLE
  ======================================================= */

  const databaseRole =
    normalizeRole(
      user.role_name,
    );

  if (!databaseRole) {
    throw new Error(
      "INVALID_USER_ROLE",
    );
  }

  /* =======================================================
     ROLE CHANGED AFTER LOGIN

     Example:

     Session token:
     PHARMACIST

     Database later changed:
     ADMIN

     Old session must not continue.
  ======================================================= */

  if (
    databaseRole !==
    sessionUser.role
  ) {
    throw new Error(
      "SESSION_ROLE_MISMATCH",
    );
  }

  /* =======================================================
     SUCCESS
  ======================================================= */

  return {
    userId:
      Number(
        user.id,
      ),

    fullName:
      user.full_name,

    email:
      user.email,

    role:
      databaseRole,
  };
}

/* =========================================================
   GET CURRENT USER ID

   Existing APIs already call:

   getCurrentUserId(connection)

   Keeping this helper means we do NOT need
   to immediately rewrite all Sales / Stock /
   Purchase transaction files.
========================================================= */

export async function getCurrentUserId(
  connection: PoolConnection,
) {
  const user =
    await getCurrentUser(
      connection,
    );

  return user.userId;
}

/* =========================================================
   REQUIRE ADMIN

   We will use this in admin-only APIs:
   - Purchase
   - Employee Management
   - Stock Adjustment
   - Settings
   - other admin mutations
========================================================= */

export async function requireAdmin(
  connection: PoolConnection,
) {
  const user =
    await getCurrentUser(
      connection,
    );

  if (
    user.role !==
    "ADMIN"
  ) {
    throw new Error(
      "ADMIN_ACCESS_REQUIRED",
    );
  }

  return user;
}

/* =========================================================
   REQUIRE PHARMACIST

   Useful when an API must specifically belong
   to the pharmacist panel.
========================================================= */

export async function requirePharmacist(
  connection: PoolConnection,
) {
  const user =
    await getCurrentUser(
      connection,
    );

  if (
    user.role !==
    "PHARMACIST"
  ) {
    throw new Error(
      "PHARMACIST_ACCESS_REQUIRED",
    );
  }

  return user;
}

/* =========================================================
   REQUIRE ANY ALLOWED ROLE

   Example:

   Sales can potentially be used by:
   ADMIN + PHARMACIST
========================================================= */

export async function requireRole(
  connection: PoolConnection,

  allowedRoles: UserRole[],
) {
  const user =
    await getCurrentUser(
      connection,
    );

  if (
    !allowedRoles.includes(
      user.role,
    )
  ) {
    throw new Error(
      "ACCESS_DENIED",
    );
  }

  return user;
}