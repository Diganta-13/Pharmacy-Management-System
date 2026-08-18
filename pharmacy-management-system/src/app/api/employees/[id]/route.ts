import { NextResponse } from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

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

interface EmployeeLookupRow extends RowDataPacket {
  employee_id: number;

  employee_code: string;

  user_id: number | null;

  employment_status: EmploymentStatus;

  role_name: SystemRole | null;

  user_status: UserStatus | null;
}

interface RoleLookupRow extends RowDataPacket {
  id: number;

  name: SystemRole;
}

interface ExistingEmailRow extends RowDataPacket {
  id: number;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

/* =========================================================
   HELPERS
========================================================= */

function cleanString(
  value: unknown,
) {
  return typeof value === "string"
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
): "ACTIVE" | "INACTIVE" | null {
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

  const date =
    new Date(
      `${value}T00:00:00`,
    );

  return !Number.isNaN(
    date.getTime(),
  );
}

function parseEmployeeId(
  value: string,
) {
  const id =
    Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

/* =========================================================
   GET EMPLOYEE FOR UPDATE
========================================================= */

async function getEmployeeForUpdate(
  connection: Awaited<
    ReturnType<
      typeof db.getConnection
    >
  >,
  employeeId: number,
) {
  const [rows] =
    await connection.execute<
      EmployeeLookupRow[]
    >(
      `
        SELECT
          e.id AS employee_id,
          e.employee_code,
          e.user_id,
          e.employment_status,

          r.name AS role_name,

          u.status AS user_status

        FROM employees e

        LEFT JOIN users u
          ON u.id = e.user_id

        LEFT JOIN roles r
          ON r.id = u.role_id

        WHERE e.id = ?

        LIMIT 1

        FOR UPDATE
      `,
      [employeeId],
    );

  return rows[0] ?? null;
}

/* =========================================================
   CHECK IF EMPLOYEE IS LAST ACTIVE ADMIN
========================================================= */

async function isLastActiveAdmin(
  connection: Awaited<
    ReturnType<
      typeof db.getConnection
    >
  >,
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
          ON u.id = e.user_id

        INNER JOIN roles r
          ON r.id = u.role_id

        WHERE
          r.name = 'ADMIN'

          AND e.employment_status = 'ACTIVE'

          AND u.status = 'ACTIVE'
      `,
    );

  const total =
    Number(
      rows[0]?.total ?? 0,
    );

  return total <= 1;
}

/* =========================================================
   PATCH
   EDIT EMPLOYEE
========================================================= */

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } =
    await context.params;

  const employeeId =
    parseEmployeeId(id);

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
    const body =
      await request.json();

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
       VALIDATION
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
      name.length > 120
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

    if (
      !email ||
      !isValidEmail(email)
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

    if (
      address.length > 255
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

    if (!employee.user_id) {
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

    const [roleRows] =
      await connection.execute<
        RoleLookupRow[]
      >(
        `
          SELECT
            id,
            name

          FROM roles

          WHERE name = ?

          LIMIT 1
        `,
        [role],
      );

    if (
      roleRows.length === 0
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
       PROTECT LAST ACTIVE ADMIN

       An active last admin cannot be changed
       into PHARMACIST.
    ===================================================== */

    if (
      employee.role_name ===
        "ADMIN" &&
      role !== "ADMIN" &&
      employee.employment_status ===
        "ACTIVE" &&
      employee.user_status ===
        "ACTIVE"
    ) {
      const lastAdmin =
        await isLastActiveAdmin(
          connection,
        );

      if (lastAdmin) {
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
       DUPLICATE EMAIL CHECK
    ===================================================== */

    const [existingEmailRows] =
      await connection.execute<
        ExistingEmailRow[]
      >(
        `
          SELECT id

          FROM users

          WHERE
            email = ?

            AND id <> ?

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
    ===================================================== */

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

        WHERE id = ?
      `,
      [
        newRoleId,
        name,
        email,
        phone,
        employee.user_id,
      ],
    );

    /* =====================================================
       UPDATE EMPLOYEE
    ===================================================== */

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

        WHERE id = ?
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

    await connection.commit();

    transactionStarted =
      false;

    return NextResponse.json({
      success: true,

      message:
        "Employee updated successfully.",
    });
  } catch (error) {
    if (
      transactionStarted
    ) {
      await connection.rollback();
    }

    console.error(
      "PATCH employee error:",
      error,
    );

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

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to update employee.",
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
   ACTIVE ↔ INACTIVE
========================================================= */

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } =
    await context.params;

  const employeeId =
    parseEmployeeId(id);

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

  const body =
    await request.json();

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

  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();

    transactionStarted =
      true;

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

    if (!employee.user_id) {
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

      if (lastAdmin) {
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
       SYNC EMPLOYEE + USER STATUS
    ===================================================== */

    await connection.execute<
      ResultSetHeader
    >(
      `
        UPDATE employees

        SET employment_status = ?

        WHERE id = ?
      `,
      [
        status,
        employeeId,
      ],
    );

    await connection.execute<
      ResultSetHeader
    >(
      `
        UPDATE users

        SET status = ?

        WHERE id = ?
      `,
      [
        status,
        employee.user_id,
      ],
    );

    await connection.commit();

    transactionStarted =
      false;

    return NextResponse.json({
      success: true,

      message:
        status === "ACTIVE"
          ? "Employee activated successfully."
          : "Employee deactivated successfully.",
    });
  } catch (error) {
    if (
      transactionStarted
    ) {
      await connection.rollback();
    }

    console.error(
      "PUT employee status error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to change employee status.",
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
   SOFT DELETE → RESIGNED
========================================================= */

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } =
    await context.params;

  const employeeId =
    parseEmployeeId(id);

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
    await connection.beginTransaction();

    transactionStarted =
      true;

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

    if (
      employee.employment_status ===
      "RESIGNED"
    ) {
      await connection.commit();

      transactionStarted =
        false;

      return NextResponse.json({
        success: true,

        message:
          "Employee is already resigned.",
      });
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

      if (lastAdmin) {
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
       USER → INACTIVE

       Nothing is hard deleted.
    ===================================================== */

    await connection.execute<
      ResultSetHeader
    >(
      `
        UPDATE employees

        SET employment_status = 'RESIGNED'

        WHERE id = ?
      `,
      [employeeId],
    );

    if (
      employee.user_id
    ) {
      await connection.execute<
        ResultSetHeader
      >(
        `
          UPDATE users

          SET status = 'INACTIVE'

          WHERE id = ?
        `,
        [
          employee.user_id,
        ],
      );
    }

    await connection.commit();

    transactionStarted =
      false;

    return NextResponse.json({
      success: true,

      message:
        "Employee resigned successfully.",
    });
  } catch (error) {
    if (
      transactionStarted
    ) {
      await connection.rollback();
    }

    console.error(
      "DELETE employee error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to resign employee.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}