import bcrypt from "bcryptjs";

import {
  NextResponse,
} from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

import {
  requirePharmacist,
} from "@/lib/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

interface PasswordRow
  extends RowDataPacket {
  id: number;
  password_hash: string;
}

type ChangePasswordBody = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

/* =========================================================
   AUTH ERROR RESPONSE
========================================================= */

function getAuthErrorResponse(
  error: unknown,
) {
  if (!(error instanceof Error)) {
    return null;
  }

  switch (error.message) {
    case "AUTHENTICATION_REQUIRED":
    case "INVALID_OR_EXPIRED_SESSION":
    case "CURRENT_USER_NOT_FOUND":
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required. Please sign in again.",
        },
        {
          status: 401,
        },
      );

    case "USER_ACCOUNT_SUSPENDED":
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account has been suspended.",
        },
        {
          status: 403,
        },
      );

    case "USER_ACCOUNT_INACTIVE":
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account is inactive.",
        },
        {
          status: 403,
        },
      );

    case "SESSION_ROLE_MISMATCH":
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account permissions have changed. Please sign in again.",
        },
        {
          status: 403,
        },
      );

    case "PHARMACIST_ACCESS_REQUIRED":
    case "ACCESS_DENIED":
      return NextResponse.json(
        {
          success: false,
          message:
            "Pharmacist access is required.",
        },
        {
          status: 403,
        },
      );

    case "INVALID_USER_ROLE":
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account does not have a valid system role.",
        },
        {
          status: 403,
        },
      );

    default:
      return null;
  }
}

/* =========================================================
   PATCH
   /api/pharmacist/change-password

   LOGGED-IN PHARMACIST ONLY

   Requires:
   - Current password
   - New password

   Flow:
   Session user
      ↓
   Current password verify
      ↓
   New password bcrypt hash
      ↓
   users.password_hash update
========================================================= */

export async function PATCH(
  request: Request,
) {
  const connection =
    await db.getConnection();

  try {
    /* =====================================================
       AUTHENTICATED PHARMACIST
    ===================================================== */

    const currentPharmacist =
      await requirePharmacist(
        connection,
      );

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    let body:
      ChangePasswordBody;

    try {
      body =
        (await request.json()) as
          ChangePasswordBody;
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

    const currentPassword =
      typeof body.currentPassword ===
      "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body.newPassword ===
      "string"
        ? body.newPassword
        : "";

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!currentPassword) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Current password is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New password is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      newPassword.length < 8
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New password must be at least 8 characters long.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      newPassword.length > 72
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New password cannot exceed 72 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      currentPassword ===
      newPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New password must be different from your current password.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       LOAD PASSWORD HASH
    ===================================================== */

    const [rows] =
      await connection.execute<
        PasswordRow[]
      >(
        `
          SELECT
            id,
            password_hash

          FROM users

          WHERE
            id = ?

          LIMIT 1
        `,
        [
          currentPharmacist.userId,
        ],
      );

    if (
      rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your user account could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const user =
      rows[0];

    /* =====================================================
       VERIFY CURRENT PASSWORD
    ===================================================== */

    const currentPasswordCorrect =
      await bcrypt.compare(
        currentPassword,
        user.password_hash,
      );

    if (
      !currentPasswordCorrect
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Current password is incorrect.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       HASH NEW PASSWORD
    ===================================================== */

    const newPasswordHash =
      await bcrypt.hash(
        newPassword,
        12,
      );

    /* =====================================================
       UPDATE PASSWORD
    ===================================================== */

    const [result] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          UPDATE users

          SET
            password_hash = ?

          WHERE
            id = ?
        `,
        [
          newPasswordHash,
          currentPharmacist.userId,
        ],
      );

    if (
      result.affectedRows !== 1
    ) {
      throw new Error(
        "PASSWORD_UPDATE_FAILED",
      );
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message:
          "Password changed successfully.",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Pharmacist change password error:",
      error,
    );

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to change password.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}