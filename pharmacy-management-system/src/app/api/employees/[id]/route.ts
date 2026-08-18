import {
  NextResponse,
} from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import type {
  PoolConnection,
} from "mysql2/promise";

import db from "@/lib/db";

import {
  requireAdmin,
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

interface EmployeeLookupRow
  extends RowDataPacket {
  employee_id: number;

  employee_code: string;

  user_id:
    | number
    | null;

  employment_status:
    EmploymentStatus;

  role_name:
    | SystemRole
    | null;

  user_status:
    | UserStatus
    | null;
}

interface RoleLookupRow
  extends RowDataPacket {
  id: number;

  name: SystemRole;
}

interface ExistingEmailRow
  extends RowDataPacket {
  id: number;
}

interface CountRow
  extends RowDataPacket {
  total:
    | number
    | string;
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type EditEmployeeBody = {
  name?: unknown;

  email?: unknown;

  phone?: unknown;

  role?: unknown;

  designation?: unknown;

  shift?: unknown;

  joiningDate?: unknown;

  salary?: unknown;

  address?: unknown;

  emergencyContact?: unknown;
};

type StatusBody = {
  status?: unknown;
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
): SystemRole | null {
  const role =
    cleanString(
      value,
    ).toUpperCase();

  if (
    role === "ADMIN" ||
    role === "PHARMACIST"
  ) {
    return role;
  }

  return null;
}

function normalizeShift(
  value: unknown,
): EmployeeShift | null {
  const shift =
    cleanString(
      value,
    ).toUpperCase();

  if (
    shift === "FULL_DAY" ||
    shift === "MORNING" ||
    shift === "EVENING"
  ) {
    return shift;
  }

  return null;
}

function normalizeEmploymentStatus(
  value: unknown,
):
  | "ACTIVE"
  | "INACTIVE"
  | null {
  const status =
    cleanString(
      value,
    ).toUpperCase();

  if (
    status === "ACTIVE" ||
    status === "INACTIVE"
  ) {
    return status;
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

function isValidBangladeshPhone(
  phone: string,
) {
  return /^01\d{9}$/.test(
    phone,
  );
}

function isValidDateString(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day,
    );

  return (
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() ===
      day
  );
}

function parseEmployeeId(
  value: string,
) {
  const id =
    Number(
      value,
    );

  if (
    !Number.isInteger(
      id,
    ) ||
    id <= 0
  ) {
    return null;
  }

  return id;
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

    case "ADMIN_ACCESS_REQUIRED":
    case "ACCESS_DENIED":
      return NextResponse.json(
        {
          success: false,

          message:
            "Administrator access is required for employee management.",
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
   SAFE ROLLBACK
========================================================= */

async function safeRollback(
  connection: PoolConnection,
) {
  try {
    await connection.rollback();
  } catch (
    rollbackError
  ) {
    console.error(
      "Employee transaction rollback error:",
      rollbackError,
    );
  }
}

/* =========================================================
   GET EMPLOYEE FOR UPDATE

   FOR UPDATE locks employee row while
   edit/status/resign transaction is running.
========================================================= */

async function getEmployeeForUpdate(
  connection: PoolConnection,

  employeeId: number,
) {
  const [rows] =
    await connection.execute<
      EmployeeLookupRow[]
    >(
      `
        SELECT
          e.id
            AS employee_id,

          e.employee_code,

          e.user_id,

          e.employment_status,

          r.name
            AS role_name,

          u.status
            AS user_status

        FROM employees e

        LEFT JOIN users u
          ON u.id =
             e.user_id

        LEFT JOIN roles r
          ON r.id =
             u.role_id

        WHERE
          e.id = ?

        LIMIT 1

        FOR UPDATE
      `,
      [
        employeeId,
      ],
    );

  return (
    rows[0] ??
    null
  );
}

/* =========================================================
   LAST ACTIVE ADMIN CHECK

   System must always keep at least
   one ACTIVE administrator.
========================================================= */

async function isLastActiveAdmin(
  connection: PoolConnection,
) {
  const [rows] =
    await connection.execute<
      CountRow[]
    >(
      `
        SELECT
          COUNT(*) AS total

        FROM employees e

        INNER JOIN users u
          ON u.id =
             e.user_id

        INNER JOIN roles r
          ON r.id =
             u.role_id

        WHERE
          r.name =
            'ADMIN'

          AND
          e.employment_status =
            'ACTIVE'

          AND
          u.status =
            'ACTIVE'
      `,
    );

  const total =
    Number(
      rows[0]?.total ??
        0,
    );

  return (
    total <= 1
  );
}

/* =========================================================
   PATCH
   /api/employees/[id]

   EDIT EMPLOYEE

   ADMIN ONLY
========================================================= */

export async function PATCH(
  request: Request,

  context: RouteContext,
) {
  const {
    id,
  } =
    await context.params;

  const employeeId =
    parseEmployeeId(
      id,
    );

  if (!employeeId) {
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

  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    /* =====================================================
       ADMIN AUTHORIZATION

       Pharmacist cannot edit:
       - roles
       - salary
       - shift
       - employee details
    ===================================================== */

    await requireAdmin(
      connection,
    );

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    let body:
      EditEmployeeBody;

    try {
      body =
        (await request.json()) as
          EditEmployeeBody;
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
       NORMALIZE
    ===================================================== */

    const name =
      cleanString(
        body.name,
      );

    const email =
      normalizeEmail(
        body.email,
      );

    const phone =
      cleanString(
        body.phone,
      );

    const role =
      normalizeRole(
        body.role,
      );

    const designation =
      cleanString(
        body.designation,
      );

    const shift =
      normalizeShift(
        body.shift,
      );

    const joiningDate =
      cleanString(
        body.joiningDate,
      );

    const salary =
      Number(
        body.salary,
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
       NAME
    ===================================================== */

    if (!name) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Employee name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      name.length >
      120
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Employee name is too long.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       EMAIL
    ===================================================== */

    if (
      !email ||
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

    if (
      email.length >
      150
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Employee email is too long.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       PHONE
    ===================================================== */

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
       ROLE
    ===================================================== */

    if (!role) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Role must be Admin or Pharmacist.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       SHIFT
    ===================================================== */

    if (!shift) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please select a valid shift.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       JOINING DATE
    ===================================================== */

    if (
      !isValidDateString(
        joiningDate,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid joining date.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       SALARY
    ===================================================== */

    if (
      !Number.isFinite(
        salary,
      ) ||
      salary < 0 ||
      salary >
        9_999_999_999.99
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid monthly salary.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       DESIGNATION
    ===================================================== */

    if (
      designation.length >
      100
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Designation is too long.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       ADDRESS
    ===================================================== */

    if (
      address.length >
      255
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Address is too long.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       EMERGENCY CONTACT
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
       BEGIN TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       LOCK EMPLOYEE
    ===================================================== */

    const employee =
      await getEmployeeForUpdate(
        connection,

        employeeId,
      );

    if (!employee) {
      await connection.rollback();

      transactionStarted =
        false;

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

    /* =====================================================
       RESIGNED EMPLOYEE PROTECTION
    ===================================================== */

    if (
      employee.employment_status ===
      "RESIGNED"
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "A resigned employee cannot be edited.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       USER ACCOUNT REQUIRED
    ===================================================== */

    if (
      !employee.user_id
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "This employee does not have a linked user account.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       ROLE LOOKUP
    ===================================================== */

    const [
      roleRows,
    ] =
      await connection.execute<
        RoleLookupRow[]
      >(
        `
          SELECT
            id,

            name

          FROM roles

          WHERE
            name = ?

          LIMIT 1
        `,
        [
          role,
        ],
      );

    if (
      roleRows.length ===
      0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Selected role does not exist.",
        },
        {
          status: 400,
        },
      );
    }

    const newRoleId =
      Number(
        roleRows[0].id,
      );

    /* =====================================================
       LAST ACTIVE ADMIN PROTECTION

       Example:

       Admin A = only active Admin

       Admin A → Pharmacist ❌

       This prevents system lockout.
    ===================================================== */

    if (
      employee.role_name ===
        "ADMIN" &&
      role !==
        "ADMIN" &&
      employee.employment_status ===
        "ACTIVE" &&
      employee.user_status ===
        "ACTIVE"
    ) {
      const lastAdmin =
        await isLastActiveAdmin(
          connection,
        );

      if (
        lastAdmin
      ) {
        await connection.rollback();

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              "The last active administrator cannot be changed to Pharmacist.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /* =====================================================
       DUPLICATE EMAIL
    ===================================================== */

    const [
      existingEmailRows,
    ] =
      await connection.execute<
        ExistingEmailRow[]
      >(
        `
          SELECT
            id

          FROM users

          WHERE
            LOWER(email) = ?

            AND
            id <> ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          email,

          employee.user_id,
        ],
      );

    if (
      existingEmailRows.length >
      0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Another user already uses this email address.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       UPDATE USER

       Role + login identity information
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
            role_id = ?,

            full_name = ?,

            email = ?,

            phone = ?

          WHERE
            id = ?
        `,
        [
          newRoleId,

          name,

          email,

          phone,

          employee.user_id,
        ],
      );

    if (
      userUpdateResult.affectedRows !==
      1
    ) {
      throw new Error(
        "EMPLOYEE_USER_UPDATE_FAILED",
      );
    }

    /* =====================================================
       UPDATE EMPLOYEE
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
            designation = ?,

            shift = ?,

            joining_date = ?,

            salary = ?,

            address = ?,

            emergency_contact = ?

          WHERE
            id = ?
        `,
        [
          designation ||
            null,

          shift,

          joiningDate,

          salary,

          address ||
            null,

          emergencyContact ||
            null,

          employeeId,
        ],
      );

    if (
      employeeUpdateResult.affectedRows !==
      1
    ) {
      throw new Error(
        "EMPLOYEE_UPDATE_FAILED",
      );
    }

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
          "Employee updated successfully.",
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
      await safeRollback(
        connection,
      );
    }

    console.error(
      "PATCH employee error:",
      error,
    );

    /* =====================================================
       AUTH
    ===================================================== */

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (
      authResponse
    ) {
      return authResponse;
    }

    /* =====================================================
       MYSQL DUPLICATE
    ===================================================== */

    const mysqlError =
      error as {
        code?: string;
      };

    if (
      mysqlError.code ===
      "ER_DUP_ENTRY"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Duplicate employee information detected.",
        },
        {
          status: 409,
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
          "EMPLOYEE_USER_UPDATE_FAILED" ||
        error.message ===
          "EMPLOYEE_UPDATE_FAILED"
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Employee information could not be updated.",
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
          "Failed to update employee.",
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
   PUT
   /api/employees/[id]

   ACTIVE ↔ INACTIVE

   ADMIN ONLY
========================================================= */

export async function PUT(
  request: Request,

  context: RouteContext,
) {
  const {
    id,
  } =
    await context.params;

  const employeeId =
    parseEmployeeId(
      id,
    );

  if (!employeeId) {
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

  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    /* =====================================================
       ADMIN AUTHORIZATION
    ===================================================== */

    await requireAdmin(
      connection,
    );

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    let body:
      StatusBody;

    try {
      body =
        (await request.json()) as
          StatusBody;
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

    const status =
      normalizeEmploymentStatus(
        body.status,
      );

    if (!status) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Status must be ACTIVE or INACTIVE.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       LOCK EMPLOYEE
    ===================================================== */

    const employee =
      await getEmployeeForUpdate(
        connection,

        employeeId,
      );

    if (!employee) {
      await connection.rollback();

      transactionStarted =
        false;

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

    /* =====================================================
       RESIGNED EMPLOYEE PROTECTION
    ===================================================== */

    if (
      employee.employment_status ===
      "RESIGNED"
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "A resigned employee cannot be reactivated from this action.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !employee.user_id
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "This employee does not have a linked user account.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       LAST ACTIVE ADMIN PROTECTION

       Last active admin cannot become inactive.
    ===================================================== */

    if (
      status ===
        "INACTIVE" &&
      employee.role_name ===
        "ADMIN" &&
      employee.employment_status ===
        "ACTIVE" &&
      employee.user_status ===
        "ACTIVE"
    ) {
      const lastAdmin =
        await isLastActiveAdmin(
          connection,
        );

      if (
        lastAdmin
      ) {
        await connection.rollback();

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              "The last active administrator cannot be deactivated.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /* =====================================================
       SYNC EMPLOYEE STATUS
    ===================================================== */

    const [
      employeeResult,
    ] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          UPDATE employees

          SET
            employment_status = ?

          WHERE
            id = ?
        `,
        [
          status,

          employeeId,
        ],
      );

    if (
      employeeResult.affectedRows !==
      1
    ) {
      throw new Error(
        "EMPLOYEE_STATUS_UPDATE_FAILED",
      );
    }

    /* =====================================================
       SYNC USER LOGIN STATUS

       Employee inactive
       → login account inactive

       Employee active
       → login account active
    ===================================================== */

    const [
      userResult,
    ] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          UPDATE users

          SET
            status = ?

          WHERE
            id = ?
        `,
        [
          status,

          employee.user_id,
        ],
      );

    if (
      userResult.affectedRows !==
      1
    ) {
      throw new Error(
        "USER_STATUS_UPDATE_FAILED",
      );
    }

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
          status ===
          "ACTIVE"
            ? "Employee activated successfully."
            : "Employee deactivated successfully.",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    if (
      transactionStarted
    ) {
      await safeRollback(
        connection,
      );
    }

    console.error(
      "PUT employee status error:",
      error,
    );

    /* =====================================================
       AUTH
    ===================================================== */

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (
      authResponse
    ) {
      return authResponse;
    }

    if (
      error instanceof
        Error &&
      (
        error.message ===
          "EMPLOYEE_STATUS_UPDATE_FAILED" ||
        error.message ===
          "USER_STATUS_UPDATE_FAILED"
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Employee status could not be changed.",
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
          "Failed to change employee status.",
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
   DELETE
   /api/employees/[id]

   SOFT DELETE → RESIGNED

   ADMIN ONLY

   IMPORTANT:
   No physical DELETE is performed.

   employees.employment_status
   → RESIGNED

   users.status
   → INACTIVE
========================================================= */

export async function DELETE(
  _request: Request,

  context: RouteContext,
) {
  const {
    id,
  } =
    await context.params;

  const employeeId =
    parseEmployeeId(
      id,
    );

  if (!employeeId) {
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

  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    /* =====================================================
       ADMIN AUTHORIZATION
    ===================================================== */

    await requireAdmin(
      connection,
    );

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       LOCK EMPLOYEE
    ===================================================== */

    const employee =
      await getEmployeeForUpdate(
        connection,

        employeeId,
      );

    if (!employee) {
      await connection.rollback();

      transactionStarted =
        false;

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

    /* =====================================================
       ALREADY RESIGNED
    ===================================================== */

    if (
      employee.employment_status ===
      "RESIGNED"
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: true,

          message:
            "Employee is already resigned.",
        },
        {
          status: 200,
        },
      );
    }

    /* =====================================================
       LAST ACTIVE ADMIN PROTECTION
    ===================================================== */

    if (
      employee.role_name ===
        "ADMIN" &&
      employee.employment_status ===
        "ACTIVE" &&
      employee.user_status ===
        "ACTIVE"
    ) {
      const lastAdmin =
        await isLastActiveAdmin(
          connection,
        );

      if (
        lastAdmin
      ) {
        await connection.rollback();

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              "The last active administrator cannot be resigned.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /* =====================================================
       EMPLOYEE → RESIGNED

       This is soft delete.
       Employee history remains in database.
    ===================================================== */

    const [
      employeeResult,
    ] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          UPDATE employees

          SET
            employment_status =
              'RESIGNED'

          WHERE
            id = ?
        `,
        [
          employeeId,
        ],
      );

    if (
      employeeResult.affectedRows !==
      1
    ) {
      throw new Error(
        "EMPLOYEE_RESIGN_FAILED",
      );
    }

    /* =====================================================
       USER → INACTIVE

       Resigned employee must no longer
       be able to log into the system.
    ===================================================== */

    if (
      employee.user_id
    ) {
      const [
        userResult,
      ] =
        await connection.execute<
          ResultSetHeader
        >(
          `
            UPDATE users

            SET
              status =
                'INACTIVE'

            WHERE
              id = ?
          `,
          [
            employee.user_id,
          ],
        );

      if (
        userResult.affectedRows !==
        1
      ) {
        throw new Error(
          "EMPLOYEE_USER_DEACTIVATION_FAILED",
        );
      }
    }

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
          "Employee resigned successfully.",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    if (
      transactionStarted
    ) {
      await safeRollback(
        connection,
      );
    }

    console.error(
      "DELETE employee error:",
      error,
    );

    /* =====================================================
       AUTH
    ===================================================== */

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (
      authResponse
    ) {
      return authResponse;
    }

    if (
      error instanceof
        Error &&
      (
        error.message ===
          "EMPLOYEE_RESIGN_FAILED" ||
        error.message ===
          "EMPLOYEE_USER_DEACTIVATION_FAILED"
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Employee could not be resigned.",
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
          "Failed to resign employee.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}