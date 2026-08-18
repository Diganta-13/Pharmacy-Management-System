import { NextResponse } from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

type InventoryStatus =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "EXPIRED"
  | "BLOCKED";

interface MedicineSearchRow
  extends RowDataPacket {
  database_id: number;

  medicine_code: string;

  medicine_name: string;

  generic_name:
    | string
    | null;

  category_name: string;

  manufacturer:
    | string
    | null;

  dosage_form:
    | string
    | null;

  strength:
    | string
    | null;

  base_unit:
    | string
    | null;

  reorder_level_base:
    | number
    | string
    | null;

  available_stock_base:
    | number
    | string
    | null;

  physical_stock_base:
    | number
    | string
    | null;

  expired_stock_base:
    | number
    | string
    | null;

  blocked_stock_base:
    | number
    | string
    | null;

  batch_id:
    | number
    | null;

  batch_no:
    | string
    | null;

  expiry_date:
    | string
    | null;

  batch_status:
    | "ACTIVE"
    | "DEPLETED"
    | "EXPIRED"
    | "BLOCKED"
    | null;

  purchase_price_base:
    | number
    | string
    | null;

  mrp_base:
    | number
    | string
    | null;

  selling_price_base:
    | number
    | string
    | null;

  supplier_name:
    | string
    | null;
}

/* =========================================================
   HELPERS
========================================================= */

function numberValue(
  value: unknown,
) {
  const parsed =
    Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function getInventoryStatus(
  row: MedicineSearchRow,
): InventoryStatus {
  const available =
    numberValue(
      row.available_stock_base,
    );

  const expired =
    numberValue(
      row.expired_stock_base,
    );

  const blocked =
    numberValue(
      row.blocked_stock_base,
    );

  const reorderLevel =
    numberValue(
      row.reorder_level_base,
    );

  /*
   * Sellable stock always gets priority.
   */

  if (available > 0) {
    if (
      available <=
      reorderLevel
    ) {
      return "LOW_STOCK";
    }

    return "IN_STOCK";
  }

  /*
   * No sellable stock.
   *
   * If physical expired stock exists,
   * show Expired rather than Out of Stock.
   */

  if (expired > 0) {
    return "EXPIRED";
  }

  if (blocked > 0) {
    return "BLOCKED";
  }

  return "OUT_OF_STOCK";
}

function getStatusLabel(
  status: InventoryStatus,
) {
  switch (status) {
    case "IN_STOCK":
      return "In Stock";

    case "LOW_STOCK":
      return "Low Stock";

    case "OUT_OF_STOCK":
      return "Out of Stock";

    case "EXPIRED":
      return "Expired";

    case "BLOCKED":
      return "Blocked";
  }
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
  try {
    const [rows] =
      await db.execute<
        MedicineSearchRow[]
      >(`
        WITH stock_summary AS (
          SELECT
            b.medicine_id,

            SUM(
              CASE
                WHEN
                  b.status = 'ACTIVE'
                  AND b.current_quantity_base > 0
                  AND b.expiry_date >= CURDATE()
                THEN b.current_quantity_base
                ELSE 0
              END
            ) AS available_stock_base,

            SUM(
              CASE
                WHEN b.current_quantity_base > 0
                THEN b.current_quantity_base
                ELSE 0
              END
            ) AS physical_stock_base,

            SUM(
              CASE
                WHEN
                  b.current_quantity_base > 0
                  AND b.expiry_date < CURDATE()
                THEN b.current_quantity_base
                ELSE 0
              END
            ) AS expired_stock_base,

            SUM(
              CASE
                WHEN
                  b.current_quantity_base > 0
                  AND b.status = 'BLOCKED'
                THEN b.current_quantity_base
                ELSE 0
              END
            ) AS blocked_stock_base

          FROM medicine_batches b

          GROUP BY
            b.medicine_id
        ),

        ranked_batches AS (
          SELECT
            b.id,
            b.medicine_id,
            b.batch_no,

            DATE_FORMAT(
              b.expiry_date,
              '%Y-%m-%d'
            ) AS expiry_date,

            b.current_quantity_base,
            b.status,

            ROW_NUMBER() OVER (
              PARTITION BY
                b.medicine_id

              ORDER BY
                CASE
                  WHEN
                    b.status = 'ACTIVE'
                    AND b.current_quantity_base > 0
                    AND b.expiry_date >= CURDATE()
                  THEN 0

                  WHEN
                    b.current_quantity_base > 0
                  THEN 1

                  ELSE 2
                END,

                b.expiry_date ASC,
                b.id ASC
            ) AS row_no

          FROM medicine_batches b

          WHERE
            b.current_quantity_base > 0
        ),

        batch_price_base AS (
          SELECT
            bup.batch_id,

            MIN(
              bup.mrp /
              NULLIF(
                mu.conversion_to_base,
                0
              )
            ) AS mrp_base,

            MIN(
              bup.selling_price /
              NULLIF(
                mu.conversion_to_base,
                0
              )
            ) AS selling_price_base

          FROM batch_unit_prices bup

          INNER JOIN medicine_units mu
            ON
              mu.id =
                bup.medicine_unit_id

          GROUP BY
            bup.batch_id
        ),

        purchase_batch_info AS (
          SELECT
            pi.received_batch_id,

            p.supplier_id,

            s.name
              AS supplier_name,

            pi.unit_cost,

            pi.conversion_to_base_snapshot,

            ROW_NUMBER() OVER (
              PARTITION BY
                pi.received_batch_id

              ORDER BY
                COALESCE(
                  p.received_at,
                  p.updated_at,
                  p.created_at
                ) DESC,

                pi.id DESC
            ) AS row_no

          FROM purchase_items pi

          INNER JOIN purchases p
            ON
              p.id =
                pi.purchase_id

          INNER JOIN suppliers s
            ON
              s.id =
                p.supplier_id

          WHERE
            p.status = 'RECEIVED'

            AND
            pi.received_batch_id
              IS NOT NULL
        )

        SELECT
          m.id
            AS database_id,

          m.medicine_code,

          m.name
            AS medicine_name,

          m.generic_name,

          c.name
            AS category_name,

          m.manufacturer,

          m.dosage_form,

          m.strength,

          base_unit.unit_name
            AS base_unit,

          CASE
            WHEN
              mis.reorder_mode =
                'AUTO'
            THEN
              mis.auto_reorder_level_base

            ELSE
              mis.manual_reorder_level_base
          END
            AS reorder_level_base,

          COALESCE(
            ss.available_stock_base,
            0
          )
            AS available_stock_base,

          COALESCE(
            ss.physical_stock_base,
            0
          )
            AS physical_stock_base,

          COALESCE(
            ss.expired_stock_base,
            0
          )
            AS expired_stock_base,

          COALESCE(
            ss.blocked_stock_base,
            0
          )
            AS blocked_stock_base,

          rb.id
            AS batch_id,

          rb.batch_no,

          rb.expiry_date,

          rb.status
            AS batch_status,

          CASE
            WHEN
              pbi.unit_cost IS NULL
              OR
              pbi.conversion_to_base_snapshot
                IS NULL
              OR
              pbi.conversion_to_base_snapshot = 0

            THEN NULL

            ELSE
              pbi.unit_cost /
              pbi.conversion_to_base_snapshot
          END
            AS purchase_price_base,

          bpb.mrp_base,

          bpb.selling_price_base,

          pbi.supplier_name

        FROM medicines m

        INNER JOIN categories c
          ON
            c.id =
              m.category_id

        LEFT JOIN medicine_units
          base_unit
          ON
            base_unit.medicine_id =
              m.id

            AND
            base_unit.is_base_unit =
              TRUE

        LEFT JOIN
          medicine_inventory_settings
          mis
          ON
            mis.medicine_id =
              m.id

        LEFT JOIN stock_summary ss
          ON
            ss.medicine_id =
              m.id

        LEFT JOIN ranked_batches rb
          ON
            rb.medicine_id =
              m.id

            AND
            rb.row_no = 1

        LEFT JOIN
          batch_price_base bpb
          ON
            bpb.batch_id =
              rb.id

        LEFT JOIN
          purchase_batch_info pbi
          ON
            pbi.received_batch_id =
              rb.id

            AND
            pbi.row_no = 1

        WHERE
          m.status = 'ACTIVE'

        ORDER BY
          m.name ASC,
          m.id ASC
      `);

    const medicines =
      rows.map(
        (
          row,
          index,
        ) => {
          const status =
            getInventoryStatus(
              row,
            );

          return {
            serial:
              index + 1,

            databaseId:
              Number(
                row.database_id,
              ),

            id:
              row.medicine_code,

            name:
              row.medicine_name,

            genericName:
              row.generic_name ??
              "",

            category:
              row.category_name,

            companyName:
              row.manufacturer ??
              "",

            dosageForm:
              row.dosage_form ??
              "",

            strength:
              row.strength ??
              "",

            unit:
              row.base_unit ??
              "Unit",

            purchasePrice:
              row.purchase_price_base ===
              null
                ? null
                : numberValue(
                    row.purchase_price_base,
                  ),

            mrp:
              row.mrp_base ===
              null
                ? null
                : numberValue(
                    row.mrp_base,
                  ),

            sellingPrice:
              row.selling_price_base ===
              null
                ? null
                : numberValue(
                    row.selling_price_base,
                  ),

            stock:
              numberValue(
                row.available_stock_base,
              ),

            physicalStock:
              numberValue(
                row.physical_stock_base,
              ),

            reorderLevel:
              numberValue(
                row.reorder_level_base,
              ),

            batchId:
              row.batch_id ===
              null
                ? null
                : Number(
                    row.batch_id,
                  ),

            batchNo:
              row.batch_no ??
              "",

            expiryDate:
              row.expiry_date,

            supplier:
              row.supplier_name ??
              "",

            status,

            statusLabel:
              getStatusLabel(
                status,
              ),
          };
        },
      );

    return NextResponse.json({
      success: true,

      data: medicines,
    });
  } catch (error) {
    console.error(
      "GET pharmacist medicines error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load medicines.",
      },
      {
        status: 500,
      },
    );
  }
}