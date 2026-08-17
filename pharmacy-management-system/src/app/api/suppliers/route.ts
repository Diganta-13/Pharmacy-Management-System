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

type SupplierStatus =
  | "active"
  | "inactive";

interface SupplierRow
  extends RowDataPacket {
  database_id: number;

  supplier_code: string;

  name: string;

  contact_person: string | null;

  phone: string | null;

  email: string | null;

  address: string | null;

  trade_license_no: string | null;

  status:
    | "ACTIVE"
    | "INACTIVE";

  linked_medicines:
    | number
    | string;

  total_purchases:
    | number
    | string;
}

interface ExistingSupplierRow
  extends RowDataPacket {
  id: number;
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

function parseStatus(
  value: unknown,
): SupplierStatus | null {
  if (
    value === "active" ||
    value === "inactive"
  ) {
    return value;
  }

  return null;
}

function validEmail(
  email: string,
) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function formatSupplier(
  row: SupplierRow,
) {
  return {
    id:
      row.supplier_code,

    databaseId:
      Number(
        row.database_id,
      ),

    name:
      row.name,

    contactPerson:
      row.contact_person ??
      "",

    phone:
      row.phone ?? "",

    email:
      row.email ?? "",

    address:
      row.address ?? "",

    tradeLicenseNo:
      row.trade_license_no ??
      "",

    status:
      row.status === "ACTIVE"
        ? ("active" as const)
        : ("inactive" as const),

    linkedMedicines:
      Number(
        row.linked_medicines ??
          0,
      ),

    totalPurchases:
      Number(
        row.total_purchases ??
          0,
      ),
  };
}

/* =========================================================
   GET ALL SUPPLIERS
========================================================= */

export async function GET() {
  try {
    const [rows] =
      await db.execute<
        SupplierRow[]
      >(`
        SELECT
          s.id AS database_id,
          s.supplier_code,
          s.name,
          s.contact_person,
          s.phone,
          s.email,
          s.address,
          s.trade_license_no,
          s.status,

          (
            SELECT COUNT(*)

            FROM medicine_suppliers ms

            WHERE
              ms.supplier_id = s.id
          ) AS linked_medicines,

          (
            SELECT COUNT(*)

            FROM purchases p

            WHERE
              p.supplier_id = s.id
          ) AS total_purchases

        FROM suppliers s

        ORDER BY
          s.id ASC
      `);

    return NextResponse.json({
      success: true,

      data:
        rows.map(
          formatSupplier,
        ),
    });
  } catch (error) {
    console.error(
      "GET suppliers error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to load suppliers.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   CREATE SUPPLIER
========================================================= */

export async function POST(
  request: Request,
) {
  const connection =
    await db.getConnection();

  try {
    const body =
      await request.json();

    const name =
      cleanString(
        body.name,
      );

    const contactPerson =
      cleanString(
        body.contactPerson,
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

    const tradeLicenseNo =
      cleanString(
        body.tradeLicenseNo,
      );

    const status =
      parseStatus(
        body.status ??
          "active",
      );

    if (!name) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Supplier name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      name.length > 150
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Supplier name is too long.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      phone.length > 20
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Phone number is too long.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !validEmail(email)
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

    if (!status) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid supplier status.",
        },
        {
          status: 400,
        },
      );
    }

    await connection.beginTransaction();

    /* =====================================================
       DUPLICATE NAME CHECK
    ===================================================== */

    const [existingRows] =
      await connection.execute<
        ExistingSupplierRow[]
      >(
        `
          SELECT id

          FROM suppliers

          WHERE name = ?

          LIMIT 1
        `,
        [name],
      );

    if (
      existingRows.length >
      0
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,

          message:
            "A supplier with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       INSERT WITH TEMP CODE
    ===================================================== */

    const temporaryCode =
      `TMP-${randomUUID()}`;

    const [insertResult] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          INSERT INTO suppliers
          (
            supplier_code,
            name,
            contact_person,
            phone,
            email,
            address,
            trade_license_no,
            status
          )
          VALUES
          (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          temporaryCode,

          name,

          contactPerson ||
            null,

          phone || null,

          email || null,

          address || null,

          tradeLicenseNo ||
            null,

          status === "active"
            ? "ACTIVE"
            : "INACTIVE",
        ],
      );

    const supplierId =
      insertResult.insertId;

    const supplierCode =
      `SUP-${String(
        supplierId,
      ).padStart(3, "0")}`;

    await connection.execute(
      `
        UPDATE suppliers

        SET supplier_code = ?

        WHERE id = ?
      `,
      [
        supplierCode,
        supplierId,
      ],
    );

    await connection.commit();

    return NextResponse.json(
      {
        success: true,

        message:
          "Supplier created successfully.",

        data: {
          id:
            supplierCode,

          databaseId:
            supplierId,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    await connection.rollback();

    console.error(
      "POST supplier error:",
      error,
    );

    const databaseError =
      error as {
        code?: string;
      };

    if (
      databaseError.code ===
      "ER_DUP_ENTRY"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Duplicate supplier data detected.",
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
          "Failed to create supplier.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}