import { NextResponse } from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

interface CustomerRow extends RowDataPacket {
  id: number;
  customer_code: string;

  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;

  status:
    | "ACTIVE"
    | "INACTIVE";

  total_sales:
    | number
    | string;

  total_purchase_amount:
    | number
    | string;

  total_paid:
    | number
    | string;

  total_due:
    | number
    | string;

  last_visit:
    | string
    | null;

  created_at: string;
}

interface CustomerLockRow
  extends RowDataPacket {
  id: number;

  customer_code: string;

  status:
    | "ACTIVE"
    | "INACTIVE";
}

interface DuplicatePhoneRow
  extends RowDataPacket {
  id: number;
}

interface CustomerSaleRow
  extends RowDataPacket {
  invoice_no: string;

  sale_date: string;

  item_count:
    | number
    | string;

  grand_total:
    | number
    | string;

  paid_amount:
    | number
    | string;

  due_amount:
    | number
    | string;

  payment_status:
    | "PAID"
    | "PARTIAL"
    | "DUE";

  status:
    | "COMPLETED"
    | "CANCELLED";
}

/* =========================================================
   ERROR
========================================================= */

class CustomerError extends Error {
  status: number;

  constructor(
    message: string,
    status = 400,
  ) {
    super(message);

    this.status = status;
  }
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

function isValidCustomerCode(
  value: string,
) {
  return /^CUS-\d+$/i.test(
    value,
  );
}

function isValidEmail(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function normalizeStatus(
  value: unknown,
):
  | "ACTIVE"
  | "INACTIVE" {
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

  throw new CustomerError(
    "Invalid customer status.",
  );
}

/* =========================================================
   GET CUSTOMER PROFILE
========================================================= */

export async function GET(
  _request: Request,

  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } =
      await context.params;

    const customerCode =
      cleanString(
        id,
      ).toUpperCase();

    if (
      !isValidCustomerCode(
        customerCode,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid customer ID.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       CUSTOMER SUMMARY
    ===================================================== */

    const [rows] =
      await db.execute<
        CustomerRow[]
      >(
        `
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

          WHERE
            c.customer_code = ?

          GROUP BY
            c.id,
            c.customer_code,
            c.name,
            c.phone,
            c.email,
            c.address,
            c.status,
            c.created_at

          LIMIT 1
        `,
        [
          customerCode,
        ],
      );

    if (
      rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const customer =
      rows[0];

    /* =====================================================
       SALES HISTORY
    ===================================================== */

    const [saleRows] =
      await db.execute<
        CustomerSaleRow[]
      >(
        `
          SELECT
            s.invoice_no,

            DATE_FORMAT(
              s.sale_date,
              '%Y-%m-%dT%H:%i:%s'
            ) AS sale_date,

            COALESCE(
              SUM(
                si.quantity
              ),
              0
            ) AS item_count,

            s.grand_total,
            s.paid_amount,
            s.due_amount,
            s.payment_status,
            s.status

          FROM sales s

          LEFT JOIN sale_items si
            ON si.sale_id = s.id

          WHERE
            s.customer_id = ?

          GROUP BY
            s.id,
            s.invoice_no,
            s.sale_date,
            s.grand_total,
            s.paid_amount,
            s.due_amount,
            s.payment_status,
            s.status

          ORDER BY
            s.sale_date DESC,
            s.id DESC
        `,
        [
          customer.id,
        ],
      );

    return NextResponse.json({
      success: true,

      data: {
        id:
          customer.customer_code,

        databaseId:
          Number(
            customer.id,
          ),

        name:
          customer.name,

        phone:
          customer.phone ?? "",

        email:
          customer.email ?? "",

        address:
          customer.address ?? "",

        status:
          customer.status ===
          "ACTIVE"
            ? "active"
            : "inactive",

        totalSales:
          Number(
            customer.total_sales ??
              0,
          ),

        totalPurchaseAmount:
          Number(
            customer.total_purchase_amount ??
              0,
          ),

        totalPaid:
          Number(
            customer.total_paid ??
              0,
          ),

        totalDue:
          Number(
            customer.total_due ??
              0,
          ),

        lastVisit:
          customer.last_visit ??
          null,

        createdAt:
          customer.created_at,

        sales:
          saleRows.map(
            (sale) => ({
              invoice:
                sale.invoice_no,

              saleDate:
                sale.sale_date,

              itemCount:
                Number(
                  sale.item_count ??
                    0,
                ),

              amount:
                Number(
                  sale.grand_total ??
                    0,
                ),

              paidAmount:
                Number(
                  sale.paid_amount ??
                    0,
                ),

              dueAmount:
                Number(
                  sale.due_amount ??
                    0,
                ),

              paymentStatus:
                sale.payment_status,

              status:
                sale.status,
            }),
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET customer details error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load customer profile.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PATCH CUSTOMER
========================================================= */

export async function PATCH(
  request: Request,

  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    const { id } =
      await context.params;

    const customerCode =
      cleanString(
        id,
      ).toUpperCase();

    if (
      !isValidCustomerCode(
        customerCode,
      )
    ) {
      throw new CustomerError(
        "Invalid customer ID.",
      );
    }

    const body =
      await request.json();

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       LOCK CUSTOMER
    ===================================================== */

    const [customerRows] =
      await connection.execute<
        CustomerLockRow[]
      >(
        `
          SELECT
            id,
            customer_code,
            status

          FROM customers

          WHERE
            customer_code = ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          customerCode,
        ],
      );

    if (
      customerRows.length ===
      0
    ) {
      throw new CustomerError(
        "Customer was not found.",
        404,
      );
    }

    const customer =
      customerRows[0];

    /* =====================================================
       STATUS-ONLY UPDATE
    ===================================================== */

    if (
      cleanString(
        body.mode,
      ).toLowerCase() ===
      "status"
    ) {
      const newStatus =
        normalizeStatus(
          body.status,
        );

      await connection.execute(
        `
          UPDATE customers

          SET status = ?

          WHERE id = ?
        `,
        [
          newStatus,
          customer.id,
        ],
      );

      await connection.commit();

      transactionStarted =
        false;

      return NextResponse.json({
        success: true,

        message:
          newStatus === "ACTIVE"
            ? "Customer activated successfully."
            : "Customer deactivated successfully.",

        data: {
          id:
            customer.customer_code,

          databaseId:
            customer.id,

          status:
            newStatus ===
            "ACTIVE"
              ? "active"
              : "inactive",
        },
      });
    }

    /* =====================================================
       FULL EDIT
    ===================================================== */

    const name =
      cleanString(
        body.name,
      );

    const phone =
      cleanString(
        body.phone,
      );

    const email =
      cleanString(
        body.email,
      );

    const address =
      cleanString(
        body.address,
      );

    if (!name) {
      throw new CustomerError(
        "Customer full name is required.",
      );
    }

    if (
      name.length > 120
    ) {
      throw new CustomerError(
        "Customer name is too long.",
      );
    }

    /*
     * Registered customer must
     * always keep a phone number.
     */
    if (!phone) {
      throw new CustomerError(
        "Phone number is required for a registered customer.",
      );
    }

    if (
      !/^01\d{9}$/.test(
        phone,
      )
    ) {
      throw new CustomerError(
        "Please enter a valid 11-digit Bangladesh mobile number.",
      );
    }

    if (
      email &&
      !isValidEmail(
        email,
      )
    ) {
      throw new CustomerError(
        "Please enter a valid email address.",
      );
    }

    if (
      email.length > 150
    ) {
      throw new CustomerError(
        "Email address is too long.",
      );
    }

    if (
      address.length > 255
    ) {
      throw new CustomerError(
        "Customer address is too long.",
      );
    }

    /* =====================================================
       DUPLICATE PHONE
    ===================================================== */

    const [duplicateRows] =
      await connection.execute<
        DuplicatePhoneRow[]
      >(
        `
          SELECT id

          FROM customers

          WHERE
            phone = ?
            AND id <> ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          phone,
          customer.id,
        ],
      );

    if (
      duplicateRows.length >
      0
    ) {
      throw new CustomerError(
        "Another customer already uses this mobile number.",
        409,
      );
    }

    /*
     * No status field in Edit Customer UI.
     * Preserve current status unless a
     * valid one is explicitly supplied.
     */

    let status =
      customer.status;

    if (
      body.status !==
        undefined &&
      body.status !== null &&
      cleanString(
        body.status,
      )
    ) {
      status =
        normalizeStatus(
          body.status,
        );
    }

    await connection.execute(
      `
        UPDATE customers

        SET
          name = ?,
          phone = ?,
          email = ?,
          address = ?,
          status = ?

        WHERE id = ?
      `,
      [
        name,
        phone,
        email || null,
        address || null,
        status,
        customer.id,
      ],
    );

    await connection.commit();

    transactionStarted =
      false;

    return NextResponse.json({
      success: true,

      message:
        "Customer updated successfully.",

      data: {
        id:
          customer.customer_code,

        databaseId:
          customer.id,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error(
      "PATCH customer error:",
      error,
    );

    if (
      error instanceof
      CustomerError
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
        },
        {
          status:
            error.status,
        },
      );
    }

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
            "Another customer already uses this mobile number.",
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
            : "Failed to update customer.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}