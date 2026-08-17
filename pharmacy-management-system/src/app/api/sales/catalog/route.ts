import { NextResponse } from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

interface UnitRow
  extends RowDataPacket {
  medicine_db_id: number;

  medicine_code: string;

  medicine_name: string;

  generic_name:
    | string
    | null;

  category_name: string;

  base_unit: string;

  unit_id: number;

  unit_name: string;

  conversion_to_base:
    | number
    | string;

  selling_price:
    | number
    | string
    | null;
}

interface BatchRow
  extends RowDataPacket {
  medicine_id: number;

  batch_id: number;

  batch_no: string;

  expiry_date: string;

  stock_base_quantity:
    | number
    | string;

  batch_status:
    | "ACTIVE"
    | "DEPLETED"
    | "EXPIRED"
    | "BLOCKED";
}

interface SettingsRow
  extends RowDataPacket {
  vat_enabled: number;

  default_vat_rate:
    | number
    | string;
}

/* =========================================================
   GET SALES CATALOG

   Important:
   - only ACTIVE medicines
   - only SELLABLE units
   - displayed price comes from earliest valid FEFO batch
   - all batches are returned so frontend can show real stock
========================================================= */

export async function GET() {
  try {
    /* =====================================================
       MEDICINES + SELLABLE UNITS + FEFO PRICE
    ===================================================== */

    const [unitRows] =
      await db.execute<
        UnitRow[]
      >(`
        SELECT
          m.id AS medicine_db_id,

          m.medicine_code,

          m.name AS medicine_name,

          m.generic_name,

          c.name AS category_name,

          base_unit.unit_name AS base_unit,

          u.id AS unit_id,

          u.unit_name,

          u.conversion_to_base,

          (
            SELECT
              bup.selling_price

            FROM medicine_batches b

            INNER JOIN batch_unit_prices bup
              ON
                bup.batch_id = b.id
                AND
                bup.medicine_unit_id = u.id

            WHERE
              b.medicine_id = m.id

              AND
              b.status = 'ACTIVE'

              AND
              b.current_quantity_base > 0

              AND
              b.expiry_date >= CURDATE()

            ORDER BY
              b.expiry_date ASC,
              b.id ASC

            LIMIT 1
          ) AS selling_price

        FROM medicines m

        INNER JOIN categories c
          ON c.id = m.category_id

        INNER JOIN medicine_units base_unit
          ON
            base_unit.medicine_id = m.id
            AND
            base_unit.is_base_unit = TRUE

        INNER JOIN medicine_units u
          ON
            u.medicine_id = m.id
            AND
            u.is_sellable = TRUE

        WHERE
          m.status = 'ACTIVE'

        ORDER BY
          m.id ASC,
          u.conversion_to_base DESC,
          u.id ASC
      `);

    /* =====================================================
       BATCHES
    ===================================================== */

    const [batchRows] =
      await db.execute<
        BatchRow[]
      >(`
        SELECT
          b.medicine_id,

          b.id AS batch_id,

          b.batch_no,

          DATE_FORMAT(
            b.expiry_date,
            '%Y-%m-%d'
          ) AS expiry_date,

          b.current_quantity_base
            AS stock_base_quantity,

          b.status AS batch_status

        FROM medicine_batches b

        INNER JOIN medicines m
          ON m.id = b.medicine_id

        WHERE
          m.status = 'ACTIVE'

        ORDER BY
          b.medicine_id ASC,
          b.expiry_date ASC,
          b.id ASC
      `);

    /* =====================================================
       SETTINGS
    ===================================================== */

    const [settingsRows] =
      await db.execute<
        SettingsRow[]
      >(`
        SELECT
          vat_enabled,
          default_vat_rate

        FROM system_settings

        WHERE id = 1

        LIMIT 1
      `);

    /* =====================================================
       BUILD MEDICINE MAP
    ===================================================== */

    const medicineMap =
      new Map<
        number,
        {
          id: string;

          databaseId: number;

          name: string;

          genericName: string;

          category: string;

          baseUnit: string;

          units: Array<{
            id: string;

            unitName: string;

            conversionToBase: number;

            price: number;

            sellable: boolean;
          }>;

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

    for (
      const row of
      unitRows
    ) {
      if (
        !medicineMap.has(
          row.medicine_db_id,
        )
      ) {
        medicineMap.set(
          row.medicine_db_id,
          {
            id:
              row.medicine_code,

            databaseId:
              Number(
                row.medicine_db_id,
              ),

            name:
              row.medicine_name,

            genericName:
              row.generic_name ??
              "",

            category:
              row.category_name,

            baseUnit:
              row.base_unit,

            units: [],

            batches: [],
          },
        );
      }

      const medicine =
        medicineMap.get(
          row.medicine_db_id,
        );

      if (!medicine) {
        continue;
      }

      medicine.units.push({
        id:
          String(
            row.unit_id,
          ),

        unitName:
          row.unit_name,

        conversionToBase:
          Number(
            row.conversion_to_base,
          ),

        price:
          Number(
            row.selling_price ??
              0,
          ),

        sellable:
          true,
      });
    }

    /* =====================================================
       ATTACH BATCHES
    ===================================================== */

    for (
      const row of
      batchRows
    ) {
      const medicine =
        medicineMap.get(
          Number(
            row.medicine_id,
          ),
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
            row.stock_base_quantity,
          ),

        status:
          row.batch_status,
      });
    }

    const settings =
      settingsRows[0];

    return NextResponse.json({
      success: true,

      data:
        Array.from(
          medicineMap.values(),
        ),

      settings: {
        vatEnabled:
          Boolean(
            settings?.vat_enabled ??
              false,
          ),

        vatRatePercent:
          Number(
            settings
              ?.default_vat_rate ??
              0,
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET sales catalog error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to load sales catalog.",
      },
      {
        status: 500,
      },
    );
  }
}