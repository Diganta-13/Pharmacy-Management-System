import { NextResponse } from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

type ExpiryStatus =
  | "EXPIRED"
  | "CRITICAL"
  | "NEAR_EXPIRY";

type BatchStatus =
  | "ACTIVE"
  | "DEPLETED"
  | "EXPIRED"
  | "BLOCKED";

interface ExpiryReportRow
  extends RowDataPacket {
  batch_id: number;

  medicine_id: number;

  medicine_code: string;

  medicine_name: string;

  company_name:
    | string
    | null;

  batch_no: string;

  quantity_base:
    | number
    | string
    | null;

  base_unit:
    | string
    | null;

  expiry_date: string;

  days_left:
    | number
    | string;

  batch_status:
    BatchStatus;
}

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return 0;
  }

  return parsed;
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
   GET EXPIRY REPORT
========================================================= */

export async function GET() {
  try {
    /* =====================================================
       LOAD EXPIRY-RELATED BATCHES

       Final expiry policy:

       expiry_date < today
       -> EXPIRED

       today through next 15 days
       -> CRITICAL

       16 through 30 days
       -> NEAR EXPIRY

       More than 30 days
       -> not shown

       Zero/depleted stock
       -> not shown
    ===================================================== */

    const [rows] =
      await db.execute<
        ExpiryReportRow[]
      >(
        `
          SELECT

            mb.id
              AS batch_id,

            m.id
              AS medicine_id,

            m.medicine_code,

            m.name
              AS medicine_name,

            m.manufacturer
              AS company_name,

            mb.batch_no,

            mb.current_quantity_base
              AS quantity_base,

            COALESCE(
              (
                SELECT
                  mu.unit_name

                FROM medicine_units mu

                WHERE
                  mu.medicine_id =
                    m.id

                  AND mu.is_base_unit =
                    TRUE

                ORDER BY
                  mu.id ASC

                LIMIT 1
              ),
              'Unit'
            )
              AS base_unit,

            DATE_FORMAT(
              mb.expiry_date,
              '%Y-%m-%d'
            )
              AS expiry_date,

            DATEDIFF(
              mb.expiry_date,
              CURDATE()
            )
              AS days_left,

            mb.status
              AS batch_status


          FROM medicine_batches mb


          INNER JOIN medicines m
            ON m.id =
               mb.medicine_id


          WHERE
            m.status =
              'ACTIVE'

            /*
             * Only physical stock remaining.
             */
            AND mb.current_quantity_base >
              0

            /*
             * Completely depleted batch
             * does not need expiry reporting.
             */
            AND mb.status <>
              'DEPLETED'

            /*
             * Expired batches plus
             * next 30-day batches only.
             */
            AND mb.expiry_date <=
              DATE_ADD(
                CURDATE(),
                INTERVAL 30 DAY
              )


          ORDER BY
            mb.expiry_date ASC,
            m.name ASC,
            mb.batch_no ASC
        `,
      );

    /* =====================================================
       PROCESS REPORT ROWS
    ===================================================== */

    const items =
      rows.map(
        (
          row,
        ) => {
          const daysLeft =
            safeNumber(
              row.days_left,
            );

          let status:
            ExpiryStatus;

          /* ===============================================
             EXPIRED
          =============================================== */

          if (
            daysLeft < 0
          ) {
            status =
              "EXPIRED";
          }

          /* ===============================================
             0 - 15 DAYS
          =============================================== */

          else if (
            daysLeft <=
            15
          ) {
            status =
              "CRITICAL";
          }

          /* ===============================================
             16 - 30 DAYS
          =============================================== */

          else {
            status =
              "NEAR_EXPIRY";
          }

          return {
            id:
              Number(
                row.batch_id,
              ),

            medicineId:
              Number(
                row.medicine_id,
              ),

            medicineCode:
              row.medicine_code,

            medicineName:
              row.medicine_name,

            companyName:
              row.company_name ??
              "-",

            batchNo:
              row.batch_no,

            stock:
              round3(
                Math.max(
                  0,
                  safeNumber(
                    row.quantity_base,
                  ),
                ),
              ),

            baseUnit:
              row.base_unit ??
              "Unit",

            expiryDate:
              row.expiry_date,

            daysLeft,

            status,

            batchStatus:
              row.batch_status,
          };
        },
      );

    /* =====================================================
       SUMMARY
    ===================================================== */

    const expired =
      items.filter(
        (
          item,
        ) =>
          item.status ===
          "EXPIRED",
      ).length;

    const critical =
      items.filter(
        (
          item,
        ) =>
          item.status ===
          "CRITICAL",
      ).length;

    const nearExpiry =
      items.filter(
        (
          item,
        ) =>
          item.status ===
          "NEAR_EXPIRY",
      ).length;

    const totalAffected =
      expired +
      critical +
      nearExpiry;

    /* =====================================================
       TOTAL PHYSICAL QUANTITY AFFECTED
    ===================================================== */

    const totalAffectedStock =
      round3(
        items.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.stock,

          0,
        ),
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      data: {
        summary: {
          expired,

          critical,

          nearExpiry,

          totalAffected,

          totalAffectedStock,
        },

        items,
      },
    });
  } catch (error) {
    console.error(
      "GET expiry report error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load expiry report.",
      },
      {
        status: 500,
      },
    );
  }
}