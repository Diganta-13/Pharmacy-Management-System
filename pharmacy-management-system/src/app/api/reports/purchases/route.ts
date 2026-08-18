import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

type PurchaseStatus =
  | "PENDING"
  | "RECEIVED"
  | "CANCELLED";

interface PurchaseReportRow
  extends RowDataPacket {
  purchase_id: number;

  purchase_no: string;

  supplier_name: string;

  supplier_invoice_no:
    | string
    | null;

  purchase_date: string;

  purchase_status:
    PurchaseStatus;

  medicine_code: string;

  medicine_name: string;

  quantity:
    | number
    | string;

  purchase_unit:
    | string
    | null;

  unit_cost:
    | number
    | string;

  line_total:
    | number
    | string;

  batch_no: string;

  expiry_date: string;
}

interface PurchaseSummaryRow
  extends RowDataPacket {
  total_purchases:
    | number
    | string
    | null;

  total_purchase_amount:
    | number
    | string
    | null;

  pending_count:
    | number
    | string
    | null;

  received_count:
    | number
    | string
    | null;

  cancelled_count:
    | number
    | string
    | null;
}

interface SettingsRow
  extends RowDataPacket {
  currency_code:
    | string
    | null;
}

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
) {
  const parsed =
    Number(
      value,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    parsed,
  );
}

function round2(
  value: number,
) {
  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) *
        100,
    ) / 100
  );
}

function round3(
  value: number,
) {
  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) *
        1000,
    ) / 1000
  );
}

/* =========================================================
   GET PURCHASE REPORT
========================================================= */

export async function GET(
  request: NextRequest,
) {
  try {
    /* =====================================================
       OPTIONAL FILTERS

       Examples:

       /api/reports/purchases

       /api/reports/purchases?status=RECEIVED

       /api/reports/purchases?year=2026

       /api/reports/purchases?year=2026&status=PENDING
    ===================================================== */

    const statusParam =
      request.nextUrl.searchParams
        .get(
          "status",
        )
        ?.trim()
        .toUpperCase();

    const yearParam =
      request.nextUrl.searchParams.get(
        "year",
      );

    /* =====================================================
       VALIDATE STATUS
    ===================================================== */

    let selectedStatus:
      PurchaseStatus | null =
      null;

    if (
      statusParam &&
      statusParam !==
        "ALL"
    ) {
      if (
        statusParam !==
          "PENDING" &&
        statusParam !==
          "RECEIVED" &&
        statusParam !==
          "CANCELLED"
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Invalid purchase status.",
          },
          {
            status:
              400,
          },
        );
      }

      selectedStatus =
        statusParam;
    }

    /* =====================================================
       VALIDATE YEAR
    ===================================================== */

    let selectedYear:
      number | null =
      null;

    if (
      yearParam !==
      null
    ) {
      const parsedYear =
        Number(
          yearParam,
        );

      if (
        !Number.isInteger(
          parsedYear,
        ) ||
        parsedYear <
          2000 ||
        parsedYear >
          2100
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Invalid report year.",
          },
          {
            status:
              400,
          },
        );
      }

      selectedYear =
        parsedYear;
    }

    /* =====================================================
       BUILD WHERE CLAUSE
    ===================================================== */

    const conditions:
      string[] = [];

    const params:
      Array<
        string | number
      > = [];

    if (
      selectedStatus
    ) {
      conditions.push(
        "p.status = ?",
      );

      params.push(
        selectedStatus,
      );
    }

    if (
      selectedYear !==
      null
    ) {
      conditions.push(
        "YEAR(p.purchase_date) = ?",
      );

      params.push(
        selectedYear,
      );
    }

    const whereClause =
      conditions.length >
      0
        ? `WHERE ${conditions.join(
            " AND ",
          )}`
        : "";

    /* =====================================================
       PURCHASE ITEM REPORT

       One row per medicine/item inside a purchase.

       Example:

       PUR-001
       Napa
       5 Box
       240 Unit Cost
       1200 Total
    ===================================================== */

    const [rows] =
      await db.execute<
        PurchaseReportRow[]
      >(
        `
          SELECT

            p.id
              AS purchase_id,

            p.purchase_no,

            s.name
              AS supplier_name,

            p.supplier_invoice_no,

            DATE_FORMAT(
              p.purchase_date,
              '%Y-%m-%d'
            )
              AS purchase_date,

            p.status
              AS purchase_status,

            m.medicine_code,

            m.name
              AS medicine_name,

            pi.quantity,

            mu.unit_name
              AS purchase_unit,

            pi.unit_cost,

            pi.line_total,

            pi.batch_no,

            DATE_FORMAT(
              pi.expiry_date,
              '%Y-%m-%d'
            )
              AS expiry_date


          FROM purchases p


          INNER JOIN suppliers s
            ON s.id =
               p.supplier_id


          INNER JOIN purchase_items pi
            ON pi.purchase_id =
               p.id


          INNER JOIN medicines m
            ON m.id =
               pi.medicine_id


          INNER JOIN medicine_units mu
            ON mu.id =
               pi.purchase_unit_id


          ${whereClause}


          ORDER BY
            p.purchase_date DESC,

            p.id DESC,

            pi.id ASC
        `,
        params,
      );

    /* =====================================================
       FORMAT ITEMS
    ===================================================== */

    const items =
      rows.map(
        (
          row,
        ) => ({
          purchaseId:
            Number(
              row.purchase_id,
            ),

          purchaseNo:
            row.purchase_no,

          supplier:
            row.supplier_name,

          supplierInvoiceNo:
            row.supplier_invoice_no ??
            "-",

          medicineCode:
            row.medicine_code,

          medicineName:
            row.medicine_name,

          quantity:
            round3(
              safeNumber(
                row.quantity,
              ),
            ),

          unit:
            row.purchase_unit ??
            "Unit",

          unitCost:
            round2(
              safeNumber(
                row.unit_cost,
              ),
            ),

          total:
            round2(
              safeNumber(
                row.line_total,
              ),
            ),

          batchNo:
            row.batch_no,

          expiryDate:
            row.expiry_date,

          purchaseDate:
            row.purchase_date,

          status:
            row.purchase_status,
        }),
      );

    /* =====================================================
       PURCHASE SUMMARY

       IMPORTANT:

       Total purchase amount is based on
       purchase header grand_total.

       Because one purchase can contain many items,
       we must NOT sum p.grand_total after joining
       purchase_items, otherwise the same purchase
       total would be counted multiple times.

       CANCELLED purchases are excluded from
       total purchase amount.
    ===================================================== */

    const summaryConditions:
      string[] = [];

    const summaryParams:
      Array<
        string | number
      > = [];

    if (
      selectedYear !==
      null
    ) {
      summaryConditions.push(
        "YEAR(p.purchase_date) = ?",
      );

      summaryParams.push(
        selectedYear,
      );
    }

    const summaryWhereClause =
      summaryConditions.length >
      0
        ? `WHERE ${summaryConditions.join(
            " AND ",
          )}`
        : "";

    const [summaryRows] =
      await db.execute<
        PurchaseSummaryRow[]
      >(
        `
          SELECT

            COUNT(
              p.id
            )
              AS total_purchases,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    p.status <>
                      'CANCELLED'

                  THEN
                    p.grand_total

                  ELSE
                    0

                END
              ),
              0
            )
              AS total_purchase_amount,


            SUM(
              CASE

                WHEN
                  p.status =
                    'PENDING'

                THEN
                  1

                ELSE
                  0

              END
            )
              AS pending_count,


            SUM(
              CASE

                WHEN
                  p.status =
                    'RECEIVED'

                THEN
                  1

                ELSE
                  0

              END
            )
              AS received_count,


            SUM(
              CASE

                WHEN
                  p.status =
                    'CANCELLED'

                THEN
                  1

                ELSE
                  0

              END
            )
              AS cancelled_count


          FROM purchases p


          ${summaryWhereClause}
        `,
        summaryParams,
      );

    const summary =
      summaryRows[0];

    /* =====================================================
       CURRENCY
    ===================================================== */

    const [settingsRows] =
      await db.execute<
        SettingsRow[]
      >(
        `
          SELECT
            currency_code

          FROM system_settings

          WHERE
            id = 1

          LIMIT 1
        `,
      );

    const currencyCode =
      settingsRows[0]
        ?.currency_code ??
      "BDT";

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      data: {
        filters: {
          year:
            selectedYear,

          status:
            selectedStatus ??
            "ALL",
        },

        currencyCode,

        summary: {
          totalPurchases:
            Math.round(
              safeNumber(
                summary
                  ?.total_purchases,
              ),
            ),

          totalPurchaseAmount:
            round2(
              safeNumber(
                summary
                  ?.total_purchase_amount,
              ),
            ),

          pending:
            Math.round(
              safeNumber(
                summary
                  ?.pending_count,
              ),
            ),

          received:
            Math.round(
              safeNumber(
                summary
                  ?.received_count,
              ),
            ),

          cancelled:
            Math.round(
              safeNumber(
                summary
                  ?.cancelled_count,
              ),
            ),
        },

        items,
      },
    });
  } catch (error) {
    console.error(
      "GET purchase report error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load purchase report.",
      },
      {
        status:
          500,
      },
    );
  }
}