import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

interface CustomerListRow extends RowDataPacket {
  id: number;
  customer_code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: "ACTIVE" | "INACTIVE";

  total_sales: number | string;
  total_purchase_amount: number | string;
  total_paid: number | string;
  total_due: number | string;

  last_visit: string | null;
  created_at: string;
}

interface ExistingCustomerRow extends RowDataPacket {
  id: number;
}

/* =========================================================
   HELPERS
========================================================= */

function cleanString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeCustomerStatus(
  value: unknown,
): "ACTIVE" | "INACTIVE" {
  return cleanString(value).toUpperCase() === "INACTIVE"
    ? "INACTIVE"
    : "ACTIVE";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================================================
   GET CUSTOMERS
========================================================= */

export async function GET() {
  try {
    const [rows] =
      await db.execute<CustomerListRow[]>(`
        SELECT
          c.id,
          c.customer_code,
          c.name,
          c.phone,
          c.email,
          c.address,
          c.status,

          COUNT(
            CASE
              WHEN s.status = 'COMPLETED'
              THEN 1
            END
          ) AS total_sales,

          COALESCE(
            SUM(
              CASE
                WHEN s.status = 'COMPLETED'
                THEN s.grand_total
                ELSE 0
              END
            ),
            0
          ) AS total_purchase_amount,

          COALESCE(
            SUM(
              CASE
                WHEN s.status = 'COMPLETED'
                THEN s.paid_amount
                ELSE 0
              END
            ),
            0
          ) AS total_paid,

          COALESCE(
            SUM(
              CASE
                WHEN s.status = 'COMPLETED'
                THEN s.due_amount
                ELSE 0
              END
            ),
            0
          ) AS total_due,

          DATE_FORMAT(
            MAX(
              CASE
                WHEN s.status = 'COMPLETED'
                THEN s.sale_date
                ELSE NULL
              END
            ),
            '%Y-%m-%dT%H:%i:%s'
          ) AS last_visit,

          DATE_FORMAT(
            c.created_at,
            '%Y-%m-%dT%H:%i:%s'
          ) AS created_at

        FROM customers c

        LEFT JOIN sales s
          ON s.customer_id = c.id

        GROUP BY
          c.id,
          c.customer_code,
          c.name,
          c.phone,
          c.email,
          c.address,
          c.status,
          c.created_at

        ORDER BY
          c.created_at DESC,
          c.id DESC
      `);

    const customers =
      rows.map((row) => ({
        id: row.customer_code,

        databaseId: Number(row.id),

        name: row.name,

        phone: row.phone ?? "",

        email: row.email ?? "",

        address: row.address ?? "",

        status:
          row.status === "ACTIVE"
            ? "active"
            : "inactive",

        totalSales:
          Number(row.total_sales ?? 0),

        totalPurchaseAmount:
          Number(
            row.total_purchase_amount ?? 0,
          ),

        totalPaid:
          Number(row.total_paid ?? 0),

        totalDue:
          Number(row.total_due ?? 0),

        lastVisit:
          row.last_visit ?? null,

        createdAt:
          row.created_at,
      }));

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error(
      "GET customers error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load customers.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST CUSTOMER
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

    const phone =
      cleanString(body.phone);

    const email =
      cleanString(body.email);

    const address =
      cleanString(body.address);

    const status =
      normalizeCustomerStatus(
        body.status,
      );

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer full name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (name.length > 120) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer name is too long.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Real-world rule:
     * manually registered customer must have phone.
     *
     * Walk-in customers should NOT create
     * customer master records.
     */
    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phone number is required for a registered customer.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !/^01\d{9}$/.test(phone)
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

    if (
      email &&
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

    if (email.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email address is too long.",
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
            "Customer address is too long.",
        },
        {
          status: 400,
        },
      );
    }

    await connection.beginTransaction();

    transactionStarted = true;

    /* =====================================================
       DUPLICATE PHONE
    ===================================================== */

    const [existingRows] =
      await connection.execute<
        ExistingCustomerRow[]
      >(
        `
          SELECT id

          FROM customers

          WHERE phone = ?

          LIMIT 1

          FOR UPDATE
        `,
        [phone],
      );

    if (
      existingRows.length > 0
    ) {
      await connection.rollback();

      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message:
            "A customer with this mobile number already exists.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       INSERT
    ===================================================== */

    const temporaryCode =
      `TMP-${randomUUID()}`;

    const [result] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          INSERT INTO customers
          (
            customer_code,
            name,
            phone,
            email,
            address,
            status
          )
          VALUES
          (?, ?, ?, ?, ?, ?)
        `,
        [
          temporaryCode,
          name,
          phone,
          email || null,
          address || null,
          status,
        ],
      );

    const customerId =
      result.insertId;

    const customerCode =
      `CUS-${String(
        customerId,
      ).padStart(3, "0")}`;

    await connection.execute(
      `
        UPDATE customers

        SET customer_code = ?

        WHERE id = ?
      `,
      [
        customerCode,
        customerId,
      ],
    );

    await connection.commit();

    transactionStarted = false;

    return NextResponse.json(
      {
        success: true,

        message:
          "Customer added successfully.",

        data: {
          id: customerCode,

          databaseId:
            customerId,
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
      "POST customer error:",
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
            "A customer with this mobile number already exists.",
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
            : "Failed to add customer.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}