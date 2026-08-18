import { NextResponse } from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import type {
  PoolConnection,
} from "mysql2/promise";

import db from "@/lib/db";

import {
  requirePharmacist,
} from "@/lib/current-user";

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

type SystemRole =
  | "ADMIN"
  | "PHARMACIST";

type EmployeeShift =
  | "FULL_DAY"
  | "MORNING"
  | "EVENING";

type EmploymentStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "RESIGNED";

type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

interface PharmacistProfileRow
  extends RowDataPacket {
  employee_id: number;

  user_id: number;

  employee_code: string;

  full_name: string;

  email: string;

  phone: string | null;

  role_name: SystemRole;

  designation: string | null;

  shift: EmployeeShift;

  joining_date: string | null;

  address: string | null;

  emergency_contact:
    | string
    | null;

  employment_status:
    EmploymentStatus;

  user_status: UserStatus;

  last_login_at:
    | string
    | null;
}

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

function getRoleLabel(
  role: SystemRole,
) {
  switch (role) {
    case "ADMIN":
      return "Administrator";

    case "PHARMACIST":
      return "Pharmacist";

    default:
      return role;
  }
}

function getShiftLabel(
  shift: EmployeeShift,
) {
  switch (shift) {
    case "MORNING":
      return "Morning Shift";

    case "EVENING":
      return "Evening Shift";

    case "FULL_DAY":
    default:
      return "Full Day";
  }
}

function getEmploymentStatusLabel(
  status: EmploymentStatus,
) {
  switch (status) {
    case "ACTIVE":
      return "Active";

    case "INACTIVE":
      return "Inactive";

    case "RESIGNED":
      return "Resigned";

    default:
      return status;
  }
}

function isValidBangladeshPhone(
  phone: string,
) {
  return /^01\d{9}$/.test(
    phone,
  );
}

/* =========================================================
   AUTH ERROR RESPONSE
========================================================= */

function getAuthErrorResponse(
  error: unknown,
) {
  if (
    !(error instanceof Error)
  ) {
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
   LOAD PROFILE BY AUTHENTICATED USER ID
========================================================= */

async function getProfileByUserId(
  connection: PoolConnection,

  userId: number,
) {
  const [rows] =
    await connection.execute<
      PharmacistProfileRow[]
    >(
      `
        SELECT
          e.id AS employee_id,

          u.id AS user_id,

          e.employee_code,

          u.full_name,

          u.email,

          u.phone,

          r.name AS role_name,

          e.designation,

          e.shift,

          DATE_FORMAT(
            e.joining_date,
            '%Y-%m-%d'
          ) AS joining_date,

          e.address,

          e.emergency_contact,

          e.employment_status,

          u.status AS user_status,

          DATE_FORMAT(
            u.last_login_at,
            '%Y-%m-%d %H:%i:%s'
          ) AS last_login_at

        FROM users u

        INNER JOIN roles r
          ON r.id =
             u.role_id

        INNER JOIN employees e
          ON e.user_id =
             u.id

        WHERE
          u.id = ?
          AND r.name =
            'PHARMACIST'

        LIMIT 1
      `,
      [
        userId,
      ],
    );

  if (
    rows.length === 0
  ) {
    throw new Error(
      "PHARMACIST_PROFILE_NOT_FOUND",
    );
  }

  return rows[0];
}

/* =========================================================
   FORMAT PROFILE
========================================================= */

function formatProfile(
  row: PharmacistProfileRow,
) {
  return {
    employeeDatabaseId:
      Number(
        row.employee_id,
      ),

    userId:
      Number(
        row.user_id,
      ),

    employeeCode:
      row.employee_code,

    fullName:
      row.full_name,

    email:
      row.email,

    phone:
      row.phone ?? "",

    role:
      row.role_name,

    roleLabel:
      getRoleLabel(
        row.role_name,
      ),

    designation:
      row.designation ||
      "Pharmacist",

    shift:
      row.shift,

    shiftLabel:
      getShiftLabel(
        row.shift,
      ),

    joiningDate:
      row.joining_date,

    address:
      row.address ?? "",

    emergencyContact:
      row.emergency_contact ??
      "",

    employmentStatus:
      row.employment_status,

    employmentStatusLabel:
      getEmploymentStatusLabel(
        row.employment_status,
      ),

    userStatus:
      row.user_status,

    lastLoginAt:
      row.last_login_at,
  };
}

/* =========================================================
   GET
   /api/pharmacist/profile

   NOW:
   Profile belongs to the actual logged-in
   PHARMACIST session user.
========================================================= */

export async function GET() {
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
       LOAD ONLY THAT USER'S PROFILE
    ===================================================== */

    const profile =
      await getProfileByUserId(
        connection,

        currentPharmacist.userId,
      );

    return NextResponse.json(
      {
        success: true,

        data:
          formatProfile(
            profile,
          ),
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "GET pharmacist profile error:",
      error,
    );

    /* =====================================================
       AUTHORIZATION ERRORS
    ===================================================== */

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (authResponse) {
      return authResponse;
    }

    /* =====================================================
       PROFILE NOT FOUND
    ===================================================== */

    if (
      error instanceof
        Error &&
      error.message ===
        "PHARMACIST_PROFILE_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Your pharmacist employee profile could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to load pharmacist profile.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}

/* =========================================================
   PATCH
   /api/pharmacist/profile

   PHARMACIST CAN UPDATE:
   - Full Name
   - Phone
   - Address
   - Emergency Contact

   PHARMACIST CANNOT UPDATE:
   - Email
   - Employee ID
   - Role
   - Designation
   - Shift
   - Joining Date
   - Employment Status
========================================================= */

export async function PATCH(
  request: Request,
) {
  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    /* =====================================================
       AUTHENTICATED PHARMACIST

       Authenticate before accepting any
       profile mutation.
    ===================================================== */

    const currentPharmacist =
      await requirePharmacist(
        connection,
      );

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    let body: {
      fullName?: unknown;

      phone?: unknown;

      address?: unknown;

      emergencyContact?: unknown;
    };

    try {
      body =
        (await request.json()) as {
          fullName?: unknown;

          phone?: unknown;

          address?: unknown;

          emergencyContact?: unknown;
        };
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

    const fullName =
      cleanString(
        body.fullName,
      );

    const phone =
      cleanString(
        body.phone,
      );

    const address =
      cleanString(
        body.address,
      );

    const emergencyContact =
      cleanString(
        body.emergencyContact,
      );

    /* =====================================================
       VALIDATION — FULL NAME
    ===================================================== */

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Full name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      fullName.length >
      120
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Full name cannot exceed 120 characters.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       VALIDATION — PHONE
    ===================================================== */

    if (!phone) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Phone number is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidBangladeshPhone(
        phone,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid 11-digit Bangladesh mobile number.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       VALIDATION — ADDRESS
    ===================================================== */

    if (
      address.length >
      255
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Address cannot exceed 255 characters.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       VALIDATION — EMERGENCY CONTACT
    ===================================================== */

    if (
      emergencyContact &&
      !isValidBangladeshPhone(
        emergencyContact,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid 11-digit emergency contact number.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       LOAD PROFILE + EMPLOYEE ID

       This guarantees the authenticated
       pharmacist is linked to an employee record.
    ===================================================== */

    const existingProfile =
      await getProfileByUserId(
        connection,

        currentPharmacist.userId,
      );

    /* =====================================================
       LOCK AUTHENTICATED USER

       Another account can never be updated because
       the user ID comes only from the verified session.
    ===================================================== */

    const [userRows] =
      await connection.execute<
        RowDataPacket[]
      >(
        `
          SELECT
            id

          FROM users

          WHERE
            id = ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          currentPharmacist.userId,
        ],
      );

    if (
      userRows.length === 0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

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

    /* =====================================================
       UPDATE USERS

       Only editable personal information.
    ===================================================== */

    const [
      userUpdateResult,
    ] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          UPDATE users

          SET
            full_name = ?,

            phone = ?

          WHERE
            id = ?
        `,
        [
          fullName,

          phone,

          currentPharmacist.userId,
        ],
      );

    if (
      userUpdateResult.affectedRows !==
      1
    ) {
      throw new Error(
        "PROFILE_USER_UPDATE_FAILED",
      );
    }

    /* =====================================================
       UPDATE EMPLOYEE

       Only editable contact information.

       Role, designation, shift, joining date and
       status are intentionally NOT updated.
    ===================================================== */

    const [
      employeeUpdateResult,
    ] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          UPDATE employees

          SET
            address = ?,

            emergency_contact = ?

          WHERE
            id = ?
            AND user_id = ?
        `,
        [
          address ||
            null,

          emergencyContact ||
            null,

          existingProfile.employee_id,

          currentPharmacist.userId,
        ],
      );

    if (
      employeeUpdateResult.affectedRows !==
      1
    ) {
      throw new Error(
        "PROFILE_EMPLOYEE_UPDATE_FAILED",
      );
    }

    /* =====================================================
       RELOAD UPDATED PROFILE
    ===================================================== */

    const updatedProfile =
      await getProfileByUserId(
        connection,

        currentPharmacist.userId,
      );

    /* =====================================================
       COMMIT
    ===================================================== */

    await connection.commit();

    transactionStarted =
      false;

    return NextResponse.json(
      {
        success: true,

        message:
          "Profile updated successfully.",

        data:
          formatProfile(
            updatedProfile,
          ),
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    /* =====================================================
       ROLLBACK
    ===================================================== */

    if (
      transactionStarted
    ) {
      try {
        await connection.rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "Profile rollback error:",
          rollbackError,
        );
      }
    }

    console.error(
      "PATCH pharmacist profile error:",
      error,
    );

    /* =====================================================
       AUTHORIZATION ERRORS
    ===================================================== */

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (authResponse) {
      return authResponse;
    }

    /* =====================================================
       PROFILE NOT FOUND
    ===================================================== */

    if (
      error instanceof
        Error &&
      error.message ===
        "PHARMACIST_PROFILE_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Your pharmacist employee profile could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       UPDATE FAILURE
    ===================================================== */

    if (
      error instanceof
        Error &&
      (
        error.message ===
          "PROFILE_USER_UPDATE_FAILED" ||
        error.message ===
          "PROFILE_EMPLOYEE_UPDATE_FAILED"
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Profile could not be updated. Please try again.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to update pharmacist profile.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}