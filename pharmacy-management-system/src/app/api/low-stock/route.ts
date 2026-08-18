import { NextResponse } from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

type ReorderMode =
  | "MANUAL"
  | "AUTO";

type AlertStatus =
  | "OUT_OF_STOCK"
  | "LOW_STOCK"
  | "OK";

interface LowStockRow
  extends RowDataPacket {

  medicine_id: number;

  medicine_code: string;

  medicine_name: string;

  category_name: string;

  base_unit:
    | string
    | null;

  reorder_mode:
    | ReorderMode
    | null;

  manual_reorder_level_base:
    | number
    | string
    | null;

  auto_reorder_level_base:
    | number
    | string
    | null;

  available_quantity_base:
    | number
    | string
    | null;

  supplier_name:
    | string
    | null;

  lead_time_days:
    | number
    | string
    | null;

  last_average_daily_sales:
    | number
    | string
    | null;

  last_calculated_at:
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
   GET LOW STOCK ALERTS
========================================================= */

export async function GET() {
  try {
    /* =====================================================
       LOAD ACTIVE MEDICINES
    ===================================================== */

    const [rows] =
      await db.execute<
        LowStockRow[]
      >(
        `
          SELECT

            /* =============================================
               MEDICINE
            ============================================= */

            m.id
              AS medicine_id,

            m.medicine_code,

            m.name
              AS medicine_name,

            c.name
              AS category_name,


            /* =============================================
               BASE UNIT
            ============================================= */

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


            /* =============================================
               REORDER SETTINGS
            ============================================= */

            COALESCE(
              mis.reorder_mode,
              'MANUAL'
            )
              AS reorder_mode,


            COALESCE(
              mis.manual_reorder_level_base,
              0
            )
              AS manual_reorder_level_base,


            COALESCE(
              mis.auto_reorder_level_base,
              0
            )
              AS auto_reorder_level_base,


            /* =============================================
               AVAILABLE STOCK

               IMPORTANT:

               Only:
               - ACTIVE batch
               - non-expired batch
               - quantity > 0

               is counted.

               BLOCKED / EXPIRED / DEPLETED batches
               do not become available stock.
            ============================================= */

            COALESCE(
              (
                SELECT
                  SUM(
                    mb.current_quantity_base
                  )

                FROM medicine_batches mb

                WHERE
                  mb.medicine_id =
                    m.id

                  AND mb.status =
                    'ACTIVE'

                  AND mb.expiry_date >=
                    CURDATE()

                  AND mb.current_quantity_base >
                    0
              ),

              0
            )
              AS available_quantity_base,


            /* =============================================
               SUPPLIER

               Priority:

               1. Active linked/preferred supplier
               2. Recently used active supplier
               3. Not Assigned
            ============================================= */

            COALESCE(
              (
                SELECT
                  s.name

                FROM medicine_suppliers ms

                INNER JOIN suppliers s
                  ON s.id =
                     ms.supplier_id

                WHERE
                  ms.medicine_id =
                    m.id

                  AND ms.status =
                    'ACTIVE'

                  AND s.status =
                    'ACTIVE'

                ORDER BY
                  ms.is_preferred DESC,
                  ms.supplier_id ASC

                LIMIT 1
              ),

              (
                SELECT
                  s2.name

                FROM purchase_items pi

                INNER JOIN purchases p
                  ON p.id =
                     pi.purchase_id

                INNER JOIN suppliers s2
                  ON s2.id =
                     p.supplier_id

                WHERE
                  pi.medicine_id =
                    m.id

                  AND p.status IN
                    (
                      'PENDING',
                      'RECEIVED'
                    )

                  AND s2.status =
                    'ACTIVE'

                ORDER BY
                  p.purchase_date DESC,
                  p.id DESC

                LIMIT 1
              ),

              'Not Assigned'
            )
              AS supplier_name,


            /* =============================================
               SUPPLIER LEAD TIME

               If no medicine supplier mapping:
               fallback = 7 days
            ============================================= */

            COALESCE(
              (
                SELECT
                  ms3.lead_time_days

                FROM medicine_suppliers ms3

                INNER JOIN suppliers s3
                  ON s3.id =
                     ms3.supplier_id

                WHERE
                  ms3.medicine_id =
                    m.id

                  AND ms3.status =
                    'ACTIVE'

                  AND s3.status =
                    'ACTIVE'

                ORDER BY
                  ms3.is_preferred DESC,
                  ms3.supplier_id ASC

                LIMIT 1
              ),

              7
            )
              AS lead_time_days,


            /* =============================================
               AUTO CALCULATION INFO
            ============================================= */

            COALESCE(
              mis.last_average_daily_sales,
              0
            )
              AS last_average_daily_sales,


            DATE_FORMAT(
              mis.last_calculated_at,
              '%Y-%m-%dT%H:%i:%s'
            )
              AS last_calculated_at


          FROM medicines m


          INNER JOIN categories c
            ON c.id =
               m.category_id


          LEFT JOIN medicine_inventory_settings mis
            ON mis.medicine_id =
               m.id


          WHERE
            m.status =
              'ACTIVE'


          ORDER BY
            m.name ASC
        `,
      );

    /* =====================================================
       PROCESS EACH MEDICINE
    ===================================================== */

    const processed =
      rows.map(
        (row) => {
          /* =================================================
             AVAILABLE QUANTITY
          ================================================= */

          const availableQty =
            round3(
              safeNumber(
                row.available_quantity_base,
              ),
            );

          /* =================================================
             MANUAL LEVEL
          ================================================= */

          const manualReorderLevel =
            round3(
              safeNumber(
                row.manual_reorder_level_base,
              ),
            );

          /* =================================================
             AUTO LEVEL
          ================================================= */

          const autoReorderLevel =
            round3(
              safeNumber(
                row.auto_reorder_level_base,
              ),
            );

          /* =================================================
             REORDER MODE
          ================================================= */

          const reorderMode:
            ReorderMode =
            row.reorder_mode ===
            "AUTO"
              ? "AUTO"
              : "MANUAL";

          /* =================================================
             EFFECTIVE MINIMUM REQUIRED

             MANUAL:
             manual level

             AUTO:
             calculated/fallback auto level
          ================================================= */

          const minimumRequired =
            reorderMode ===
            "AUTO"
              ? autoReorderLevel
              : manualReorderLevel;

          /* =================================================
             STATUS
          ================================================= */

          let status:
            AlertStatus =
            "OK";

          /*
           * Zero valid stock means
           * OUT OF STOCK.
           */

          if (
            availableQty <= 0
          ) {
            status =
              "OUT_OF_STOCK";
          }

          /*
           * Positive stock but quantity is
           * equal to or below effective
           * reorder level.
           */

          else if (
            availableQty <=
            minimumRequired
          ) {
            status =
              "LOW_STOCK";
          }

          /* =================================================
             SHORTAGE

             Useful later for purchase planning.
          ================================================= */

          const shortageQty =
            round3(
              Math.max(
                0,

                minimumRequired -
                  availableQty,
              ),
            );

          return {
            /* ===============================================
               IDENTITY
            =============================================== */

            id:
              row.medicine_code,

            databaseId:
              Number(
                row.medicine_id,
              ),

            medicineName:
              row.medicine_name,

            category:
              row.category_name,


            /* ===============================================
               INVENTORY
            =============================================== */

            availableQty,

            minimumRequired,

            manualReorderLevel,

            autoReorderLevel,

            baseUnit:
              row.base_unit ??
              "Unit",


            /* ===============================================
               SUPPLIER
            =============================================== */

            supplier:
              row.supplier_name ??
              "Not Assigned",

            leadTimeDays:
              Math.max(
                1,

                Number(
                  row.lead_time_days ??
                    7,
                ),
              ),


            /* ===============================================
               REORDER
            =============================================== */

            reorderMode,

            averageDailySales:
              round3(
                safeNumber(
                  row.last_average_daily_sales,
                ),
              ),

            lastCalculatedAt:
              row.last_calculated_at ??
              null,


            /* ===============================================
               ALERT
            =============================================== */

            shortageQty,

            status,
          };
        },
      );

    /* =====================================================
       KEEP ONLY ALERTED MEDICINES

       Expiry is NOT included here.
       Expiry Alerts is a separate module.
    ===================================================== */

    const alerts =
      processed
        .filter(
          (item) =>
            item.status !==
            "OK",
        )

        .sort(
          (
            first,
            second,
          ) => {
            /* ===============================================
               OUT OF STOCK FIRST
            =============================================== */

            if (
              first.status !==
              second.status
            ) {
              return first.status ===
                "OUT_OF_STOCK"
                ? -1
                : 1;
            }

            /* ===============================================
               LOWER STOCK FIRST
            =============================================== */

            if (
              first.availableQty !==
              second.availableQty
            ) {
              return (
                first.availableQty -
                second.availableQty
              );
            }

            /* ===============================================
               ALPHABETICAL
            =============================================== */

            return first.medicineName.localeCompare(
              second.medicineName,
            );
          },
        );

    /* =====================================================
       SUMMARY
    ===================================================== */

    const outOfStock =
      alerts.filter(
        (item) =>
          item.status ===
          "OUT_OF_STOCK",
      ).length;

    const lowStock =
      alerts.filter(
        (item) =>
          item.status ===
          "LOW_STOCK",
      ).length;

    const totalAffected =
      outOfStock +
      lowStock;

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      data: {
        summary: {
          outOfStock,

          lowStock,

          totalAffected,
        },

        items:
          alerts,
      },
    });
  } catch (error) {
    console.error(
      "GET low stock alerts error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load low stock alerts.",
      },
      {
        status: 500,
      },
    );
  }
}