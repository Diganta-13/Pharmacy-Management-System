import {
  randomUUID,
} from "crypto";

import {
  NextResponse,
} from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

import {
  getCurrentUserId,
} from "@/lib/current-user";

import {
  PurchaseServiceError,
  receivePurchaseByNo,
} from "@/lib/purchase-service";

/* =========================================================
   TYPES
========================================================= */

type PurchaseStatus =
  | "Pending"
  | "Received";

interface PurchaseRow
  extends RowDataPacket {
  database_id: number;

  purchase_no: string;

  supplier_code: string;

  supplier_name: string;

  supplier_invoice_no:
    | string
    | null;

  purchase_date: string;

  status:
    | "PENDING"
    | "RECEIVED"
    | "CANCELLED";

  grand_total:
    | number
    | string;

  processed_by: string;

  received_by:
    | string
    | null;

  received_at:
    | string
    | null;
}

interface PurchaseItemRow
  extends RowDataPacket {
  item_id: number;

  purchase_id: number;

  medicine_code: string;

  medicine_name: string;

  generic_name:
    | string
    | null;

  base_unit: string;

  purchase_unit: string;

  conversion_to_base_snapshot:
    | number
    | string;

  quantity:
    | number
    | string;

  base_quantity:
    | number
    | string;

  unit_cost:
    | number
    | string;

  batch_no: string;

  expiry_date: string;

  received_batch_id:
    | number
    | null;

  pricing_unit_id:
    | number
    | null;

  pricing_unit_mrp:
    | number
    | string
    | null;

  pricing_conversion:
    | number
    | string
    | null;
}

interface PriceRow
  extends RowDataPacket {
  item_id: number;

  unit_name: string;

  conversion_to_base:
    | number
    | string;

  batch_mrp:
    | number
    | string
    | null;

  batch_selling_price:
    | number
    | string
    | null;

  pricing_unit_mrp:
    | number
    | string
    | null;

  pricing_conversion:
    | number
    | string
    | null;
}

interface SupplierRow
  extends RowDataPacket {
  id: number;

  name: string;
}

interface MedicineRow
  extends RowDataPacket {
  id: number;

  name: string;
}

interface UnitRow
  extends RowDataPacket {
  id: number;

  unit_name: string;

  conversion_to_base:
    | number
    | string;

  is_sellable: number;

  is_purchasable: number;
}

interface DuplicateInvoiceRow
  extends RowDataPacket {
  id: number;
}

/* =========================================================
   HELPERS
========================================================= */

function roundMoney(
  value: number,
) {
  return (
    Math.round(
      (value +
        Number.EPSILON) *
        100,
    ) / 100
  );
}

function cleanString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function validDate(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

function mapStatus(
  value:
    | "PENDING"
    | "RECEIVED"
    | "CANCELLED",
) {
  if (
    value === "RECEIVED"
  ) {
    return "Received";
  }

  if (
    value === "CANCELLED"
  ) {
    return "Cancelled";
  }

  return "Pending";
}

/* =========================================================
   GET PURCHASES
========================================================= */

export async function GET() {
  try {
    const [
      purchaseRows,
    ] =
      await db.execute<
        PurchaseRow[]
      >(`
        SELECT
          p.id AS database_id,

          p.purchase_no,

          s.supplier_code,

          s.name AS supplier_name,

          p.supplier_invoice_no,

          DATE_FORMAT(
            p.purchase_date,
            '%Y-%m-%d'
          ) AS purchase_date,

          p.status,

          p.grand_total,

          creator.full_name
            AS processed_by,

          receiver.full_name
            AS received_by,

          DATE_FORMAT(
            p.received_at,
            '%Y-%m-%dT%H:%i:%s'
          ) AS received_at

        FROM purchases p

        INNER JOIN suppliers s
          ON s.id =
             p.supplier_id

        INNER JOIN users creator
          ON creator.id =
             p.created_by

        LEFT JOIN users receiver
          ON receiver.id =
             p.received_by

        ORDER BY
          p.id DESC
      `);

    if (
      purchaseRows.length ===
      0
    ) {
      return NextResponse.json({
        success: true,

        data: [],
      });
    }

    const [itemRows] =
      await db.execute<
        PurchaseItemRow[]
      >(`
        SELECT
          pi.id AS item_id,

          pi.purchase_id,

          m.medicine_code,

          m.name
            AS medicine_name,

          m.generic_name,

          base_unit.unit_name
            AS base_unit,

          purchase_unit.unit_name
            AS purchase_unit,

          pi.conversion_to_base_snapshot,

          pi.quantity,

          pi.base_quantity,

          pi.unit_cost,

          pi.batch_no,

          DATE_FORMAT(
            pi.expiry_date,
            '%Y-%m-%d'
          ) AS expiry_date,

          pi.received_batch_id,

          pi.pricing_unit_id,

          pi.pricing_unit_mrp,

          pricing_unit.conversion_to_base
            AS pricing_conversion

        FROM purchase_items pi

        INNER JOIN medicines m
          ON m.id =
             pi.medicine_id

        INNER JOIN medicine_units purchase_unit
          ON purchase_unit.id =
             pi.purchase_unit_id

        INNER JOIN medicine_units base_unit
          ON
            base_unit.medicine_id =
              m.id

            AND
            base_unit.is_base_unit =
              TRUE

        LEFT JOIN medicine_units pricing_unit
          ON pricing_unit.id =
             pi.pricing_unit_id

        ORDER BY
          pi.purchase_id DESC,
          pi.id ASC
      `);

    const [priceRows] =
      await db.execute<
        PriceRow[]
      >(`
        SELECT
          pi.id AS item_id,

          u.unit_name,

          u.conversion_to_base,

          bup.mrp
            AS batch_mrp,

          bup.selling_price
            AS batch_selling_price,

          pi.pricing_unit_mrp,

          pricing_unit.conversion_to_base
            AS pricing_conversion

        FROM purchase_items pi

        INNER JOIN medicine_units u
          ON
            u.medicine_id =
              pi.medicine_id

            AND
            u.is_sellable =
              TRUE

        LEFT JOIN batch_unit_prices bup
          ON
            bup.batch_id =
              pi.received_batch_id

            AND
            bup.medicine_unit_id =
              u.id

        LEFT JOIN medicine_units pricing_unit
          ON pricing_unit.id =
             pi.pricing_unit_id

        ORDER BY
          pi.id ASC,
          u.conversion_to_base DESC
      `);

    const priceMap =
      new Map<
        number,
        Array<{
          unitName: string;

          conversionToBase: number;

          sellingPrice: number;

          mrp: number;
        }>
      >();

    for (
      const row of
      priceRows
    ) {
      let mrp =
        row.batch_mrp !==
        null
          ? Number(
              row.batch_mrp,
            )
          : 0;

      let sellingPrice =
        row.batch_selling_price !==
        null
          ? Number(
              row.batch_selling_price,
            )
          : 0;

      /*
       * Pending purchase has no batch price yet.
       * Rebuild it from stored primary MRP.
       */
      if (
        row.batch_mrp ===
          null &&
        row.pricing_unit_mrp !==
          null &&
        row.pricing_conversion !==
          null
      ) {
        const primaryMrp =
          Number(
            row.pricing_unit_mrp,
          );

        const primaryConversion =
          Number(
            row.pricing_conversion,
          );

        const unitConversion =
          Number(
            row.conversion_to_base,
          );

        if (
          primaryConversion >
          0
        ) {
          mrp =
            roundMoney(
              (
                primaryMrp *
                unitConversion
              ) /
                primaryConversion,
            );

          sellingPrice =
            mrp;
        }
      }

      const current =
        priceMap.get(
          row.item_id,
        ) ?? [];

      current.push({
        unitName:
          row.unit_name,

        conversionToBase:
          Number(
            row.conversion_to_base,
          ),

        sellingPrice,

        mrp,
      });

      priceMap.set(
        row.item_id,
        current,
      );
    }

    const itemMap =
      new Map<
        number,
        Array<{
          id: string;

          medicineId: string;

          medicine: string;

          genericName: string;

          baseUnit: string;

          purchaseUnit: string;

          conversionToBase: number;

          quantity: number;

          baseQuantity: number;

          unitCost: number;

          batchNo: string;

          expiryDate: string;

          unitPrices: Array<{
            unitName: string;

            conversionToBase: number;

            sellingPrice: number;

            mrp: number;
          }>;
        }>
      >();

    for (
      const row of
      itemRows
    ) {
      const current =
        itemMap.get(
          row.purchase_id,
        ) ?? [];

      current.push({
        id:
          `PITEM-${row.item_id}`,

        medicineId:
          row.medicine_code,

        medicine:
          row.medicine_name,

        genericName:
          row.generic_name ??
          "",

        baseUnit:
          row.base_unit,

        purchaseUnit:
          row.purchase_unit,

        conversionToBase:
          Number(
            row.conversion_to_base_snapshot,
          ),

        quantity:
          Number(
            row.quantity,
          ),

        baseQuantity:
          Number(
            row.base_quantity,
          ),

        unitCost:
          Number(
            row.unit_cost,
          ),

        batchNo:
          row.batch_no,

        expiryDate:
          row.expiry_date,

        unitPrices:
          priceMap.get(
            row.item_id,
          ) ?? [],
      });

      itemMap.set(
        row.purchase_id,
        current,
      );
    }

    return NextResponse.json({
      success: true,

      data:
        purchaseRows.map(
          (purchase) => ({
            id:
              purchase.purchase_no,

            databaseId:
              Number(
                purchase.database_id,
              ),

            supplierId:
              purchase.supplier_code,

            supplier:
              purchase.supplier_name,

            supplierInvoiceNo:
              purchase.supplier_invoice_no ??
              "",

            purchaseDate:
              purchase.purchase_date,

            status:
              mapStatus(
                purchase.status,
              ),

            items:
              itemMap.get(
                purchase.database_id,
              ) ?? [],

            totalAmount:
              Number(
                purchase.grand_total,
              ),

            processedBy:
              purchase.processed_by,

            receivedBy:
              purchase.received_by ??
              undefined,

            receivedAt:
              purchase.received_at ??
              undefined,
          }),
        ),
    });
  } catch (error) {
    console.error(
      "GET purchases error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to load purchases.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   CREATE PURCHASE
========================================================= */

export async function POST(
  request: Request,
) {
  const connection =
    await db.getConnection();

  try {
    const body =
      await request.json();

    const supplierCode =
      cleanString(
        body.supplierId,
      );

    const supplierInvoiceNo =
      cleanString(
        body.supplierInvoiceNo,
      );

    const purchaseDate =
      cleanString(
        body.purchaseDate,
      );

    const requestedStatus:
      PurchaseStatus =
      body.status ===
      "Received"
        ? "Received"
        : "Pending";

    if (!supplierCode) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Supplier is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !validDate(
        purchaseDate,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Valid purchase date is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Array.isArray(
        body.items,
      ) ||
      body.items.length ===
        0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "At least one purchase item is required.",
        },
        {
          status: 400,
        },
      );
    }

    await connection.beginTransaction();

    const userId =
      await getCurrentUserId(
        connection,
      );

    /* =====================================================
       SUPPLIER
    ===================================================== */

    const [supplierRows] =
      await connection.execute<
        SupplierRow[]
      >(
        `
          SELECT
            id,
            name

          FROM suppliers

          WHERE
            supplier_code = ?
            AND status = 'ACTIVE'

          LIMIT 1
        `,
        [
          supplierCode,
        ],
      );

    if (
      supplierRows.length ===
      0
    ) {
      throw new PurchaseServiceError(
        "Selected supplier is not available for purchasing.",
        400,
      );
    }

    const supplierId =
      supplierRows[0].id;

    /* =====================================================
       DUPLICATE SUPPLIER INVOICE
    ===================================================== */

    if (
      supplierInvoiceNo
    ) {
      const [duplicates] =
        await connection.execute<
          DuplicateInvoiceRow[]
        >(
          `
            SELECT id

            FROM purchases

            WHERE
              supplier_id = ?

              AND
              supplier_invoice_no = ?

              AND
              status <> 'CANCELLED'

            LIMIT 1
          `,
          [
            supplierId,

            supplierInvoiceNo,
          ],
        );

      if (
        duplicates.length >
        0
      ) {
        throw new PurchaseServiceError(
          "This supplier invoice number has already been used.",
          409,
          "DUPLICATE_SUPPLIER_INVOICE",
        );
      }
    }

    /* =====================================================
       CREATE PURCHASE HEADER
    ===================================================== */

    const temporaryNo =
      `TMP-${randomUUID()}`;

    const [purchaseResult] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          INSERT INTO purchases
          (
            purchase_no,
            supplier_id,
            supplier_invoice_no,
            purchase_date,
            status,
            subtotal,
            discount_amount,
            additional_cost,
            grand_total,
            created_by
          )
          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            'PENDING',
            0,
            0,
            0,
            0,
            ?
          )
        `,
        [
          temporaryNo,

          supplierId,

          supplierInvoiceNo ||
            null,

          purchaseDate,

          userId,
        ],
      );

    const purchaseId =
      purchaseResult.insertId;

    const purchaseYear =
      purchaseDate.slice(
        0,
        4,
      );

    const purchaseNo =
      `PUR-${purchaseYear}-${String(
        purchaseId,
      ).padStart(
        3,
        "0",
      )}`;

    await connection.execute(
      `
        UPDATE purchases

        SET purchase_no = ?

        WHERE id = ?
      `,
      [
        purchaseNo,

        purchaseId,
      ],
    );

    /* =====================================================
       ITEMS
    ===================================================== */

    let subtotal =
      0;

    const duplicateBatches =
      new Set<string>();

    for (
      let index = 0;
      index <
      body.items.length;
      index += 1
    ) {
      const rawItem =
        body.items[index];

      const medicineCode =
        cleanString(
          rawItem.medicineId,
        );

      const purchaseUnitName =
        cleanString(
          rawItem.purchaseUnit,
        );

      const batchNo =
        cleanString(
          rawItem.batchNo,
        );

      const expiryDate =
        cleanString(
          rawItem.expiryDate,
        );

      const quantity =
        Number(
          rawItem.quantity,
        );

      const unitCost =
        Number(
          rawItem.unitCost,
        );

      const primaryMrp =
        Number(
          rawItem.primaryMrp,
        );

      const itemNumber =
        index + 1;

      if (
        !medicineCode
      ) {
        throw new PurchaseServiceError(
          `Medicine is required for item ${itemNumber}.`,
        );
      }

      if (
        !purchaseUnitName
      ) {
        throw new PurchaseServiceError(
          `Purchase unit is required for item ${itemNumber}.`,
        );
      }

      if (
        !Number.isInteger(
          quantity,
        ) ||
        quantity <= 0
      ) {
        throw new PurchaseServiceError(
          `Quantity for item ${itemNumber} must be a positive whole number.`,
        );
      }

      if (
        !Number.isFinite(
          unitCost,
        ) ||
        unitCost <= 0
      ) {
        throw new PurchaseServiceError(
          `Purchase cost for item ${itemNumber} must be greater than zero.`,
        );
      }

      if (
        !batchNo
      ) {
        throw new PurchaseServiceError(
          `Batch number is required for item ${itemNumber}.`,
        );
      }

      if (
        !validDate(
          expiryDate,
        ) ||
        expiryDate <=
          purchaseDate
      ) {
        throw new PurchaseServiceError(
          `Expiry date for item ${itemNumber} must be after the purchase date.`,
        );
      }

      if (
        !Number.isFinite(
          primaryMrp,
        ) ||
        primaryMrp <= 0
      ) {
        throw new PurchaseServiceError(
          `Valid box/package MRP is required for item ${itemNumber}.`,
        );
      }

      const duplicateKey =
        `${medicineCode.toLowerCase()}-${batchNo.toLowerCase()}`;

      if (
        duplicateBatches.has(
          duplicateKey,
        )
      ) {
        throw new PurchaseServiceError(
          "The same medicine and batch number cannot be entered twice in one purchase.",
        );
      }

      duplicateBatches.add(
        duplicateKey,
      );

      /* ===================================================
         MEDICINE
      =================================================== */

      const [medicineRows] =
        await connection.execute<
          MedicineRow[]
        >(
          `
            SELECT
              id,
              name

            FROM medicines

            WHERE
              medicine_code = ?
              AND status = 'ACTIVE'

            LIMIT 1
          `,
          [
            medicineCode,
          ],
        );

      if (
        medicineRows.length ===
        0
      ) {
        throw new PurchaseServiceError(
          `Medicine ${medicineCode} is not available.`,
        );
      }

      const medicineId =
        medicineRows[0].id;

      /* ===================================================
         UNITS
      =================================================== */

      const [units] =
        await connection.execute<
          UnitRow[]
        >(
          `
            SELECT
              id,
              unit_name,
              conversion_to_base,
              is_sellable,
              is_purchasable

            FROM medicine_units

            WHERE medicine_id = ?

            ORDER BY
              conversion_to_base DESC
          `,
          [
            medicineId,
          ],
        );

      const purchaseUnit =
        units.find(
          (unit) =>
            unit.unit_name ===
              purchaseUnitName &&
            Boolean(
              unit.is_purchasable,
            ),
        );

      if (!purchaseUnit) {
        throw new PurchaseServiceError(
          `${purchaseUnitName} is not a valid purchasable unit for item ${itemNumber}.`,
        );
      }

      const pricingUnit =
        units
          .filter(
            (unit) =>
              Boolean(
                unit.is_sellable,
              ),
          )
          .sort(
            (
              first,
              second,
            ) =>
              Number(
                second.conversion_to_base,
              ) -
              Number(
                first.conversion_to_base,
              ),
          )[0];

      if (!pricingUnit) {
        throw new PurchaseServiceError(
          `No selling unit is configured for item ${itemNumber}.`,
        );
      }

      const conversion =
        Number(
          purchaseUnit
            .conversion_to_base,
        );

      const baseQuantity =
        quantity *
        conversion;

      const lineTotal =
        roundMoney(
          quantity *
          unitCost,
        );

      subtotal =
        roundMoney(
          subtotal +
          lineTotal,
        );

      await connection.execute(
        `
          INSERT INTO purchase_items
          (
            purchase_id,
            medicine_id,
            purchase_unit_id,
            batch_no,
            expiry_date,
            quantity,
            conversion_to_base_snapshot,
            base_quantity,
            unit_cost,
            line_total,
            pricing_unit_id,
            pricing_unit_mrp
          )
          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          purchaseId,

          medicineId,

          purchaseUnit.id,

          batchNo,

          expiryDate,

          quantity,

          conversion,

          baseQuantity,

          unitCost,

          lineTotal,

          pricingUnit.id,

          roundMoney(
            primaryMrp,
          ),
        ],
      );
    }

    /* =====================================================
       TOTAL
    ===================================================== */

    await connection.execute(
      `
        UPDATE purchases

        SET
          subtotal = ?,
          grand_total = ?

        WHERE id = ?
      `,
      [
        subtotal,

        subtotal,

        purchaseId,
      ],
    );

    /* =====================================================
       RECEIVE IMMEDIATELY IF REQUESTED
    ===================================================== */

    if (
      requestedStatus ===
      "Received"
    ) {
      await receivePurchaseByNo(
        connection,

        purchaseNo,

        userId,
      );
    }

    await connection.commit();

    return NextResponse.json(
      {
        success: true,

        message:
          requestedStatus ===
          "Received"
            ? "Purchase created and received successfully."
            : "Pending purchase created successfully.",

        data: {
          purchaseNo,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    await connection.rollback();

    console.error(
      "POST purchase error:",
      error,
    );

    if (
      error instanceof
      PurchaseServiceError
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            error.message,

          code:
            error.code,
        },
        {
          status:
            error.status,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "CURRENT_USER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Development admin user is missing. Import database/03_dev_admin.sql first.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to create purchase.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}