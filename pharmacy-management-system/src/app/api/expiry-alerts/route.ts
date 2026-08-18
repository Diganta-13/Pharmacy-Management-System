import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

type ExpiryStatus =
  | "EXPIRED"
  | "CRITICAL"
  | "NEAR_EXPIRY";

interface ExpiryBatchRow extends RowDataPacket {
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
    | string;

  base_unit:
    | string
    | null;

  expiry_date: string;

  days_left:
    | number
    | string;

  batch_status:
    | "ACTIVE"
    | "DEPLETED"
    | "EXPIRED"
    | "BLOCKED";
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
    !Number.isFinite(parsed)
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
      (value + Number.EPSILON) *
        1000,
    ) / 1000
  );
}

/* =========================================================
   GET EXPIRY ALERTS
========================================================= */

export async function GET() {
  try {
    const [rows] =
      await db.execute<
        ExpiryBatchRow[]
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
                  mu.medicine_id = m.id

                  AND mu.is_base_unit = TRUE

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
            ON m.id = mb.medicine_id

          WHERE
            m.status = 'ACTIVE'

            /*
             * No alert needed after all
             * physical quantity is finished.
             */
            AND mb.current_quantity_base > 0

            /*
             * DEPLETED batches are ignored.
             *
             * ACTIVE / EXPIRED / BLOCKED stock
             * may still need expiry attention
             * while physical stock remains.
             */
            AND mb.status <> 'DEPLETED'

            /*
             * Only expired or next-30-day
             * batches belong to this module.
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
       MAP STATUS
    ===================================================== */

    const items =
      rows.map(
        (row) => {
          const daysLeft =
            safeNumber(
              row.days_left,
            );

          let status:
            ExpiryStatus;

          /*
           * Before today
           */
          if (
            daysLeft < 0
          ) {
            status =
              "EXPIRED";
          }

          /*
           * Today through next 15 days
           */
          else if (
            daysLeft <= 15
          ) {
            status =
              "CRITICAL";
          }

          /*
           * 16 through 30 days
           */
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

            quantity:
              round3(
                Math.max(
                  0,
                  safeNumber(
                    row.quantity_base,
                  ),
                ),
              ),

            unit:
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

       These counts are BATCH counts.
    ===================================================== */

    const expired =
      items.filter(
        (item) =>
          item.status ===
          "EXPIRED",
      ).length;

    const expiring15 =
      items.filter(
        (item) =>
          item.status ===
          "CRITICAL",
      ).length;

    const expiring30 =
      items.filter(
        (item) =>
          item.status ===
          "NEAR_EXPIRY",
      ).length;

    const totalAffected =
      expired +
      expiring15 +
      expiring30;

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      data: {
        summary: {
          expired,

          expiring15,

          expiring30,

          totalAffected,
        },

        items,
      },
    });
  } catch (error) {
    console.error(
      "GET expiry alerts error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load expiry alerts.",
      },
      {
        status: 500,
      },
    );
  }
}