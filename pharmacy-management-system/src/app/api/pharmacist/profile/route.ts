import { NextResponse } from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import type {
  PoolConnection,
} from "mysql2/promise";

import db from "@/lib/db";

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
  emergency_contact: string | null;

  employment_status: EmploymentStatus;
  user_status: UserStatus;

  last_login_at: string | null;
}

interface CurrentPharmacistRow
  extends RowDataPacket {
  user_id: number;
  employee_id: number;
}

/* =========================================================
   HELPERS
========================================================= */

function cleanString(value: unknown) {
  return typeof value === "string"
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
  return /^01\d{9}$/.test(phone);
}

/* =========================================================
   TEMPORARY PHARMACIST RESOLUTION

   Authentication is not DB-connected yet.

   If DEV_PHARMACIST_EMAIL exists:
   → use that pharmacist.

   Otherwise:
   → use the first ACTIVE pharmacist.

   Later when authentication is implemented,
   only this resolution logic needs replacing
   with session/JWT user identification.
========================================================= */

async function getDevelopmentPharmacist(
  connection: PoolConnection,
) {
  const developmentEmail =
    cleanString(
      process.env.DEV_PHARMACIST_EMAIL,
    ).toLowerCase();

  let rows: CurrentPharmacistRow[];

  if (developmentEmail) {
    const [result] =
      await connection.execute<
        CurrentPharmacistRow[]
      >(
        `
          SELECT
            u.id AS user_id,
            e.id AS employee_id

          FROM users u

          INNER JOIN roles r
            ON r.id = u.role_id

          INNER JOIN employees e
            ON e.user_id = u.id

          WHERE
            r.name = 'PHARMACIST'
            AND u.email = ?
            AND u.status = 'ACTIVE'
            AND e.employment_status = 'ACTIVE'

          LIMIT 1
        `,
        [developmentEmail],
      );

    rows = result;
  } else {
    const [result] =
      await connection.execute<
        CurrentPharmacistRow[]
      >(
        `
          SELECT
            u.id AS user_id,
            e.id AS employee_id

          FROM users u

          INNER JOIN roles r
            ON r.id = u.role_id

          INNER JOIN employees e
            ON e.user_id = u.id

          WHERE
            r.name = 'PHARMACIST'
            AND u.status = 'ACTIVE'
            AND e.employment_status = 'ACTIVE'

          ORDER BY
            e.id ASC

          LIMIT 1
        `,
      );

    rows = result;
  }

  if (rows.length === 0) {
    throw new Error(
      "No active pharmacist account was found.",
    );
  }

  return {
    userId: Number(
      rows[0].user_id,
    ),

    employeeId: Number(
      rows[0].employee_id,
    ),
  };
}

/* =========================================================
   LOAD PROFILE
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
          ON r.id = u.role_id

        INNER JOIN employees e
          ON e.user_id = u.id

        WHERE
          u.id = ?
          AND r.name = 'PHARMACIST'

        LIMIT 1
      `,
      [userId],
    );

  if (rows.length === 0) {
    throw new Error(
      "Pharmacist profile was not found.",
    );
  }

  return rows[0];
}

/* =========================================================
   FORMAT RESPONSE
========================================================= */

function formatProfile(
  row: PharmacistProfileRow,
) {
  return {
    employeeDatabaseId:
      Number(row.employee_id),

    userId:
      Number(row.user_id),

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
      row.designation || "Pharmacist",

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
      row.emergency_contact ?? "",

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
========================================================= */

export async function GET() {
  const connection =
    await db.getConnection();

  try {
    const currentPharmacist =
      await getDevelopmentPharmacist(
        connection,
      );

    const profile =
      await getProfileByUserId(
        connection,
        currentPharmacist.userId,
      );

    return NextResponse.json({
      success: true,

      data:
        formatProfile(profile),
    });
  } catch (error) {
    console.error(
      "GET pharmacist profile error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load pharmacist profile.",
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

   Pharmacist can update only:
   - Name
   - Phone
   - Address
   - Emergency Contact

   Pharmacist CANNOT update:
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

  let transactionStarted = false;

  try {
    const body =
      await request.json();

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
       VALIDATION
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

    if (fullName.length > 120) {
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

    if (address.length > 255) {
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

    transactionStarted = true;

    const currentPharmacist =
      await getDevelopmentPharmacist(
        connection,
      );

    /* =====================================================
       LOCK USER
    ===================================================== */

    const [userRows] =
      await connection.execute<
        RowDataPacket[]
      >(
        `
          SELECT id

          FROM users

          WHERE id = ?

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

      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message:
            "Pharmacist user account was not found.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       UPDATE USER DATA
    ===================================================== */

    await connection.execute<
      ResultSetHeader
    >(
      `
        UPDATE users

        SET
          full_name = ?,
          phone = ?

        WHERE id = ?
      `,
      [
        fullName,
        phone,
        currentPharmacist.userId,
      ],
    );

    /* =====================================================
       UPDATE EMPLOYEE DATA
    ===================================================== */

    await connection.execute<
      ResultSetHeader
    >(
      `
        UPDATE employees

        SET
          address = ?,
          emergency_contact = ?

        WHERE id = ?
      `,
      [
        address || null,
        emergencyContact || null,
        currentPharmacist.employeeId,
      ],
    );

    /* =====================================================
       RELOAD UPDATED PROFILE
    ===================================================== */

    const updatedProfile =
      await getProfileByUserId(
        connection,
        currentPharmacist.userId,
      );

    await connection.commit();

    transactionStarted = false;

    return NextResponse.json({
      success: true,

      message:
        "Profile updated successfully.",

      data:
        formatProfile(
          updatedProfile,
        ),
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error(
      "PATCH pharmacist profile error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to update pharmacist profile.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}