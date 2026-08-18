import { randomUUID } from "crypto";

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

type EmployeeShift =
  | "FULL_DAY"
  | "MORNING"
  | "EVENING";

type EmploymentStatus =
  | "ACTIVE"
  | "INACTIVE";

type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

type SystemRole =
  | "ADMIN"
  | "PHARMACIST";

interface EmployeeRow extends RowDataPacket {
  database_id: number;
  user_id: number | null;
  employee_code: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role_name: SystemRole | null;
  designation: string | null;
  shift: EmployeeShift;
  joining_date: string | null;
  salary: number | string | null;
  address: string | null;
  emergency_contact: string | null;
  employment_status: EmploymentStatus;
  user_status: UserStatus | null;
}

interface RoleRow extends RowDataPacket {
  id: number;
  name: SystemRole;
  description: string | null;
}

interface ExistingUserRow extends RowDataPacket {
  id: number;
}

interface RoleLookupRow extends RowDataPacket {
  id: number;
  name: SystemRole;
}

/* =========================================================
   HELPERS
========================================================= */

function cleanString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeEmail(value: unknown) {
  return cleanString(value).toLowerCase();
}

function getRoleLabel(
  role: SystemRole | null,
) {
  switch (role) {
    case "ADMIN":
      return "Admin";

    case "PHARMACIST":
      return "Pharmacist";

    default:
      return "";
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function isValidBangladeshPhone(
  phone: string,
) {
  return /^01\d{9}$/.test(phone);
}

function isValidDateString(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date =
    new Date(`${value}T00:00:00`);

  return !Number.isNaN(
    date.getTime(),
  );
}

function normalizeRole(
  value: unknown,
): SystemRole | null {
  const role =
    cleanString(value).toUpperCase();

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
    cleanString(value).toUpperCase();

  if (
    shift === "FULL_DAY" ||
    shift === "MORNING" ||
    shift === "EVENING"
  ) {
    return shift;
  }

  return null;
}

/* =========================================================
   GET EMPLOYEES
========================================================= */

export async function GET() {
  try {
    const [rows] =
      await db.execute<EmployeeRow[]>(`
        SELECT
          e.id AS database_id,
          e.user_id,
          e.employee_code,

          u.full_name,
          u.phone,
          u.email,

          r.name AS role_name,

          e.designation,
          e.shift,

          DATE_FORMAT(
            e.joining_date,
            '%Y-%m-%d'
          ) AS joining_date,

          e.salary,
          e.address,
          e.emergency_contact,

          e.employment_status,

          u.status AS user_status

        FROM employees e

        LEFT JOIN users u
          ON u.id = e.user_id

        LEFT JOIN roles r
          ON r.id = u.role_id

        WHERE
          e.employment_status IN (
            'ACTIVE',
            'INACTIVE'
          )

        ORDER BY
          e.created_at DESC,
          e.id DESC
      `);

    /* =====================================================
       SUMMARY
    ===================================================== */

    const totalEmployees =
      rows.length;

    const activeEmployees =
      rows.filter(
        (employee) =>
          employee.employment_status ===
          "ACTIVE",
      ).length;

    const inactiveEmployees =
      rows.filter(
        (employee) =>
          employee.employment_status ===
          "INACTIVE",
      ).length;

    const monthlyPayroll =
      rows.reduce(
        (total, employee) => {
          if (
            employee.employment_status !==
            "ACTIVE"
          ) {
            return total;
          }

          return (
            total +
            Number(employee.salary ?? 0)
          );
        },
        0,
      );

    /* =====================================================
       FORMAT EMPLOYEES
    ===================================================== */

    const employees =
      rows.map((row) => ({
        id: row.employee_code,

        databaseId:
          Number(row.database_id),

        userId:
          row.user_id
            ? Number(row.user_id)
            : null,

        name:
          row.full_name ?? "",

        phone:
          row.phone ?? "",

        email:
          row.email ?? "",

        role:
          row.role_name ?? null,

        roleLabel:
          getRoleLabel(
            row.role_name,
          ),

        designation:
          row.designation ?? "",

        shift:
          row.shift,

        shiftLabel:
          getShiftLabel(
            row.shift,
          ),

        joiningDate:
          row.joining_date,

        salary:
          Number(row.salary ?? 0),

        address:
          row.address ?? "",

        emergencyContact:
          row.emergency_contact ?? "",

        status:
          row.employment_status,

        statusLabel:
          row.employment_status ===
          "ACTIVE"
            ? "Active"
            : "Inactive",

        userStatus:
          row.user_status,

        hasLoginAccount:
          Boolean(row.user_id),
      }));

    /* =====================================================
       ROLES
    ===================================================== */

    const [roleRows] =
      await db.execute<RoleRow[]>(`
        SELECT
          id,
          name,
          description

        FROM roles

        WHERE name IN (
          'ADMIN',
          'PHARMACIST'
        )

        ORDER BY FIELD(
          name,
          'ADMIN',
          'PHARMACIST'
        )
      `);

    const roles =
      roleRows.map((role) => ({
        id: Number(role.id),

        value: role.name,

        label:
          getRoleLabel(role.name),

        description:
          role.description ?? "",
      }));

    return NextResponse.json({
      success: true,

      data: {
        summary: {
          totalEmployees,
          activeEmployees,
          inactiveEmployees,
          monthlyPayroll,
        },

        employees,

        roles,
      },
    });
  } catch (error) {
    console.error(
      "GET employees error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load employees.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST / ADD EMPLOYEE
========================================================= */

export async function POST(
  request: Request,
) {
  const connection =
    await db.getConnection();

  let transactionStarted = false;

  try {
    const body =
      await request.json();

    const name =
      cleanString(body.name);

    const email =
      normalizeEmail(body.email);

    const phone =
      cleanString(body.phone);

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const role =
      normalizeRole(body.role);

    const designation =
      cleanString(body.designation);

    const shift =
      normalizeShift(body.shift);

    const joiningDate =
      cleanString(body.joiningDate);

    const address =
      cleanString(body.address);

    const emergencyContact =
      cleanString(
        body.emergencyContact,
      );

    const salary =
      Number(body.salary);

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
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee email is required.",
        },
        { status: 400 },
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee phone number is required.",
        },
        { status: 400 },
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee login password is required.",
        },
        { status: 400 },
      );
    }

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Role must be Admin or Pharmacist.",
        },
        { status: 400 },
      );
    }

    if (!shift) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select a valid employee shift.",
        },
        { status: 400 },
      );
    }

    if (!joiningDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Joining date is required.",
        },
        { status: 400 },
      );
    }

    if (name.length > 120) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee name is too long.",
        },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid email address.",
        },
        { status: 400 },
      );
    }

    if (email.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee email is too long.",
        },
        { status: 400 },
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
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be at least 8 characters long.",
        },
        { status: 400 },
      );
    }

    if (password.length > 72) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password cannot exceed 72 characters.",
        },
        { status: 400 },
      );
    }

    if (
      designation.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Designation is too long.",
        },
        { status: 400 },
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
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(salary) ||
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
        { status: 400 },
      );
    }

    if (address.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Employee address is too long.",
        },
        { status: 400 },
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
        { status: 400 },
      );
    }

    /* =====================================================
       TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted = true;

    /* ROLE */

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

    if (roleRows.length === 0) {
      await connection.rollback();

      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message:
            "Selected role does not exist.",
        },
        { status: 400 },
      );
    }

    const roleId =
      Number(roleRows[0].id);

    /* DUPLICATE EMAIL */

    const [existingUsers] =
      await connection.execute<
        ExistingUserRow[]
      >(
        `
          SELECT id
          FROM users
          WHERE email = ?
          LIMIT 1
          FOR UPDATE
        `,
        [email],
      );

    if (
      existingUsers.length > 0
    ) {
      await connection.rollback();

      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message:
            "A user with this email address already exists.",
        },
        { status: 409 },
      );
    }

    /* PASSWORD HASH */

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    /* CREATE USER */

    const [userResult] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          INSERT INTO users
          (
            role_id,
            full_name,
            email,
            password_hash,
            phone,
            status
          )
          VALUES
          (?, ?, ?, ?, ?, 'ACTIVE')
        `,
        [
          roleId,
          name,
          email,
          passwordHash,
          phone,
        ],
      );

    const userId =
      Number(userResult.insertId);

    /* CREATE EMPLOYEE */

    const temporaryEmployeeCode =
      `TMP-EMP-${randomUUID()}`;

    const [employeeResult] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          INSERT INTO employees
          (
            user_id,
            employee_code,
            designation,
            shift,
            joining_date,
            salary,
            address,
            emergency_contact,
            employment_status
          )
          VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        `,
        [
          userId,
          temporaryEmployeeCode,
          designation || null,
          shift,
          joiningDate,
          salary,
          address || null,
          emergencyContact || null,
        ],
      );

    const employeeDatabaseId =
      Number(
        employeeResult.insertId,
      );

    const employeeCode =
      `EMP-${String(
        employeeDatabaseId,
      ).padStart(3, "0")}`;

    await connection.execute(
      `
        UPDATE employees
        SET employee_code = ?
        WHERE id = ?
      `,
      [
        employeeCode,
        employeeDatabaseId,
      ],
    );

    await connection.commit();

    transactionStarted = false;

    return NextResponse.json(
      {
        success: true,

        message:
          "Employee added successfully.",

        data: {
          id: employeeCode,
          databaseId:
            employeeDatabaseId,
          userId,
          name,
          email,
          phone,
          role,
          roleLabel:
            getRoleLabel(role),
          designation,
          shift,
          shiftLabel:
            getShiftLabel(shift),
          joiningDate,
          salary,
          address,
          emergencyContact,
          status: "ACTIVE",
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error(
      "POST employee error:",
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
            "An employee/user with the same unique information already exists.",
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
            : "Failed to add employee.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}