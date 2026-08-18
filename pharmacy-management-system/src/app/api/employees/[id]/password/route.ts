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
  requireAdmin,
} from "@/lib/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

interface EmployeeRow
  extends RowDataPacket {
  employee_id: number;

  employee_code: string;

  user_id: number | null;

  full_name: string | null;

  email: string | null;

  employment_status:
    | "ACTIVE"
    | "INACTIVE"
    | "RESIGNED";
}

type PasswordBody = {
  password?: unknown;
};

/* =========================================================
   AUTH ERROR
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

    case "ADMIN_ACCESS_REQUIRED":
    case "ACCESS_DENIED":
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator access is required.",
        },
        {
          status: 403,
        },
      );

    case "USER_ACCOUNT_INACTIVE":
    case "USER_ACCOUNT_SUSPENDED":
    case "SESSION_ROLE_MISMATCH":
    case "INVALID_USER_ROLE":
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not authorized to perform this action.",
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
   /api/employees/[id]/password

   ADMIN ONLY

   Reset employee login password.
========================================================= */

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const connection =
    await db.getConnection();

  try {
    /* =====================================================
       ADMIN AUTH
    ===================================================== */

    const currentAdmin =
      await requireAdmin(
        connection,
      );

    /* =====================================================
       EMPLOYEE ID
    ===================================================== */

    const {
      id,
    } =
      await context.params;

    const employeeId =
      Number(id);

    if (
      !Number.isInteger(
        employeeId,
      ) ||
      employeeId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid employee ID.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body:
      PasswordBody;

    try {
      body =
        (await request.json()) as
          PasswordBody;
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

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    /* =====================================================
       PASSWORD VALIDATION
    ===================================================== */

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be at least 8 characters long.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      password.length > 72
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password cannot exceed 72 characters.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       FIND EMPLOYEE
    ===================================================== */

    const [rows] =
      await connection.execute<
        EmployeeRow[]
      >(
        `
          SELECT
            e.id AS employee_id,

            e.employee_code,

            e.user_id,

            u.full_name,

            u.email,

            e.employment_status

          FROM employees e

          LEFT JOIN users u
            ON u.id = e.user_id

          WHERE
            e.id = ?

          LIMIT 1
        `,
        [
          employeeId,
        ],
      );

    if (
      rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee not found.",
        },
        {
          status: 404,
        },
      );
    }

    const employee =
      rows[0];

    /* =====================================================
       RESIGNED EMPLOYEE
    ===================================================== */

    if (
      employee.employment_status ===
      "RESIGNED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password cannot be reset for a resigned employee.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       LOGIN ACCOUNT REQUIRED
    ===================================================== */

    if (
      !employee.user_id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This employee does not have a login account.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       HASH NEW PASSWORD
    ===================================================== */

    const passwordHash =
      await bcrypt.hash(
        password,
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
          passwordHash,
          employee.user_id,
        ],
      );

    if (
      result.affectedRows !== 1
    ) {
      throw new Error(
        "PASSWORD_RESET_FAILED",
      );
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "Employee password reset successfully.",

        data: {
          employeeId:
            employee.employee_id,

          employeeCode:
            employee.employee_code,

          employeeName:
            employee.full_name,

          email:
            employee.email,

          resetBy: {
            userId:
              currentAdmin.userId,

            fullName:
              currentAdmin.fullName,
          },
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Employee password reset error:",
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
          "Failed to reset employee password.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}