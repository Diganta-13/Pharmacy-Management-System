import { NextResponse } from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

interface StockRow
  extends RowDataPacket {
  database_medicine_id: number;

  medicine_code: string;

  medicine_name: string;

  generic_name:
    | string
    | null;

  category_name: string;

  base_unit:
    | string
    | null;

  reorder_mode:
    | "MANUAL"
    | "AUTO"
    | null;

  reorder_level_base:
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

  stock_base_quantity:
    | number
    | string
    | null;

  batch_status:
    | "ACTIVE"
    | "DEPLETED"
    | "EXPIRED"
    | "BLOCKED"
    | null;
}

/* =========================================================
   GET STOCK
========================================================= */

export async function GET() {
  try {
    const [rows] =
      await db.execute<
        StockRow[]
      >(`
        SELECT
          m.id
            AS database_medicine_id,

          m.medicine_code,

          m.name
            AS medicine_name,

          m.generic_name,

          c.name
            AS category_name,

          base_unit.unit_name
            AS base_unit,

          mis.reorder_mode,

          CASE
            WHEN mis.reorder_mode = 'AUTO'
              THEN mis.auto_reorder_level_base

            ELSE
              mis.manual_reorder_level_base
          END AS reorder_level_base,

          b.id
            AS batch_id,

          b.batch_no,

          DATE_FORMAT(
            b.expiry_date,
            '%Y-%m-%d'
          ) AS expiry_date,

          b.current_quantity_base
            AS stock_base_quantity,

          b.status
            AS batch_status

        FROM medicines m

        INNER JOIN categories c
          ON c.id = m.category_id

        LEFT JOIN medicine_units base_unit
          ON
            base_unit.medicine_id = m.id
            AND base_unit.is_base_unit = TRUE

        LEFT JOIN medicine_inventory_settings mis
          ON mis.medicine_id = m.id

        LEFT JOIN medicine_batches b
          ON b.medicine_id = m.id

        ORDER BY
          m.id ASC,
          b.expiry_date ASC,
          b.id ASC
      `);

    const medicineMap =
      new Map<
        number,
        {
          id: string;

          databaseId: number;

          medicineName: string;

          genericName: string;

          category: string;

          baseUnit: string;

          reorderLevelBase: number;

          reorderMode:
            | "MANUAL"
            | "AUTO";

          batches: Array<{
            id: string;

            batchNo: string;

            expiryDate: string;

            stockBaseQuantity: number;

            status:
              | "ACTIVE"
              | "DEPLETED"
              | "EXPIRED"
              | "BLOCKED";
          }>;
        }
      >();

    for (const row of rows) {
      if (
        !medicineMap.has(
          row.database_medicine_id,
        )
      ) {
        medicineMap.set(
          row.database_medicine_id,
          {
            id:
              row.medicine_code,

            databaseId:
              Number(
                row.database_medicine_id,
              ),

            medicineName:
              row.medicine_name,

            genericName:
              row.generic_name ??
              "",

            category:
              row.category_name,

            baseUnit:
              row.base_unit ??
              "Unit",

            reorderLevelBase:
              Number(
                row.reorder_level_base ??
                  0,
              ),

            reorderMode:
              row.reorder_mode ??
              "MANUAL",

            batches: [],
          },
        );
      }

      if (
        row.batch_id !== null &&
        row.batch_no !== null &&
        row.expiry_date !== null
      ) {
        const medicine =
          medicineMap.get(
            row.database_medicine_id,
          );

        if (!medicine) {
          continue;
        }

        medicine.batches.push({
          id:
            String(
              row.batch_id,
            ),

          batchNo:
            row.batch_no,

          expiryDate:
            row.expiry_date,

          stockBaseQuantity:
            Number(
              row.stock_base_quantity ??
                0,
            ),

          status:
            row.batch_status ??
            "ACTIVE",
        });
      }
    }

    return NextResponse.json({
      success: true,

      data:
        Array.from(
          medicineMap.values(),
        ),
    });
  } catch (error) {
    console.error(
      "GET stock error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to load stock.",
      },
      {
        status: 500,
      },
    );
  }
}