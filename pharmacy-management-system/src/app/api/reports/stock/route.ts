import { NextResponse } from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

type StockStatus =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

type ReorderMode =
  | "MANUAL"
  | "AUTO";

interface MedicineStockRow
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

  reorder_level_base:
    | number
    | string
    | null;

  available_stock_base:
    | number
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
   GET STOCK REPORT
========================================================= */

export async function GET() {
  try {
    /* =====================================================
       LOAD ACTIVE MEDICINES + VALID AVAILABLE STOCK

       Available stock includes only:

       - ACTIVE batch
       - expiry date >= today
       - quantity > 0

       Expired / Blocked / Depleted stock is excluded.
    ===================================================== */

    const [rows] =
      await db.execute<
        MedicineStockRow[]
      >(
        `
          SELECT

            m.id
              AS medicine_id,

            m.medicine_code,

            m.name
              AS medicine_name,

            c.name
              AS category_name,

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


            COALESCE(
              mis.reorder_mode,
              'MANUAL'
            )
              AS reorder_mode,


            CASE

              WHEN
                COALESCE(
                  mis.reorder_mode,
                  'MANUAL'
                ) =
                  'AUTO'

              THEN
                COALESCE(
                  mis.auto_reorder_level_base,
                  0
                )

              ELSE
                COALESCE(
                  mis.manual_reorder_level_base,
                  0
                )

            END
              AS reorder_level_base,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    mb.status =
                      'ACTIVE'

                    AND mb.expiry_date >=
                      CURDATE()

                    AND mb.current_quantity_base >
                      0

                  THEN
                    mb.current_quantity_base

                  ELSE
                    0

                END
              ),
              0
            )
              AS available_stock_base


          FROM medicines m


          INNER JOIN categories c
            ON c.id =
               m.category_id


          LEFT JOIN medicine_inventory_settings mis
            ON mis.medicine_id =
               m.id


          LEFT JOIN medicine_batches mb
            ON mb.medicine_id =
               m.id


          WHERE
            m.status =
              'ACTIVE'


          GROUP BY

            m.id,

            m.medicine_code,

            m.name,

            c.name,

            mis.reorder_mode,

            mis.manual_reorder_level_base,

            mis.auto_reorder_level_base


          ORDER BY
            m.name ASC
        `,
      );

    /* =====================================================
       PROCESS MEDICINE STOCK
    ===================================================== */

    const medicines =
      rows.map(
        (
          row,
        ) => {
          const availableStock =
            round3(
              safeNumber(
                row.available_stock_base,
              ),
            );

          const reorderLevel =
            round3(
              safeNumber(
                row.reorder_level_base,
              ),
            );

          const reorderMode:
            ReorderMode =
            row.reorder_mode ===
            "AUTO"
              ? "AUTO"
              : "MANUAL";

          let status:
            StockStatus =
            "IN_STOCK";

          /* ===============================================
             OUT OF STOCK
          =============================================== */

          if (
            availableStock <=
            0
          ) {
            status =
              "OUT_OF_STOCK";
          }

          /* ===============================================
             LOW STOCK
          =============================================== */

          else if (
            availableStock <=
            reorderLevel
          ) {
            status =
              "LOW_STOCK";
          }

          return {
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

            stock:
              availableStock,

            minimum:
              reorderLevel,

            baseUnit:
              row.base_unit ??
              "Unit",

            reorderMode,

            status,
          };
        },
      );

    /* =====================================================
       STOCK BY CATEGORY

       Existing inventory is already stored in each
       medicine's base-unit quantity.

       This report sums those valid base quantities
       category-wise for the chart.
    ===================================================== */

    const categoryMap =
      new Map<
        string,
        number
      >();

    for (
      const medicine of
      medicines
    ) {
      const current =
        categoryMap.get(
          medicine.category,
        ) ??
        0;

      categoryMap.set(
        medicine.category,

        round3(
          current +
            medicine.stock,
        ),
      );
    }

    const categoryStock =
      Array.from(
        categoryMap.entries(),
      )
        .map(
          (
            [
              category,
              totalStock,
            ],
          ) => ({
            category,

            totalStock:
              round3(
                totalStock,
              ),
          }),
        )
        .sort(
          (
            first,
            second,
          ) =>
            second.totalStock -
            first.totalStock,
        );

    /* =====================================================
       STOCK STATUS SUMMARY COUNTS
    ===================================================== */

    const inStock =
      medicines.filter(
        (
          medicine,
        ) =>
          medicine.status ===
          "IN_STOCK",
      ).length;

    const lowStock =
      medicines.filter(
        (
          medicine,
        ) =>
          medicine.status ===
          "LOW_STOCK",
      ).length;

    const outOfStock =
      medicines.filter(
        (
          medicine,
        ) =>
          medicine.status ===
          "OUT_OF_STOCK",
      ).length;

    const totalAvailableStock =
      round3(
        medicines.reduce(
          (
            total,
            medicine,
          ) =>
            total +
            medicine.stock,

          0,
        ),
      );

    /* =====================================================
       TABLE SORTING

       Out of Stock
       -> Low Stock
       -> In Stock

       Then medicine name.
    ===================================================== */

    const statusPriority:
      Record<
        StockStatus,
        number
      > = {
      OUT_OF_STOCK: 1,

      LOW_STOCK: 2,

      IN_STOCK: 3,
    };

    const sortedMedicines =
      [...medicines].sort(
        (
          first,
          second,
        ) => {
          const statusDifference =
            statusPriority[
              first.status
            ] -
            statusPriority[
              second.status
            ];

          if (
            statusDifference !==
            0
          ) {
            return statusDifference;
          }

          return first.medicineName.localeCompare(
            second.medicineName,
          );
        },
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      data: {
        summary: {
          totalMedicines:
            medicines.length,

          inStock,

          lowStock,

          outOfStock,

          totalAvailableStock,
        },

        categoryStock,

        medicines:
          sortedMedicines,
      },
    });
  } catch (error) {
    console.error(
      "GET stock report error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load stock report.",
      },
      {
        status: 500,
      },
    );
  }
}