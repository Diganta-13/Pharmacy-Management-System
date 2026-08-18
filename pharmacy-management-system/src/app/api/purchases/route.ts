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

import type {
  PoolConnection,
} from "mysql2/promise";

import db from "@/lib/db";

import {
  requireAdmin,
} from "@/lib/current-user";

import {
  PurchaseServiceError,
  receivePurchaseByNo,
} from "@/lib/purchase-service";

/* =========================================================
   RUNTIME
========================================================= */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

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

type RawPurchaseItem = {
  medicineId?: unknown;

  purchaseUnit?: unknown;

  quantity?: unknown;

  unitCost?: unknown;

  batchNo?: unknown;

  expiryDate?: unknown;

  primaryMrp?: unknown;
};

type PurchaseRequestBody = {
  supplierId?: unknown;

  supplierInvoiceNo?: unknown;

  purchaseDate?: unknown;

  status?: unknown;

  items?: unknown;
};

/* =========================================================
   HELPERS
========================================================= */

function roundMoney(
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
   AUTH ERROR RESPONSE
========================================================= */

function getAuthErrorResponse(
  error: unknown,
) {
  if (
    !(error instanceof Error)
  ) {
    return null;
  }

  switch (error.message) {
    case "AUTHENTICATION_REQUIRED":
    case "INVALID_OR_EXPIRED_SESSION":
    case "CURRENT_USER_NOT_FOUND":
      return NextResponse.json(
        {
          success: false,

          message:
            "Authentication required. Please sign in again.",
        },
        {
          status: 401,
        },
      );

    case "USER_ACCOUNT_SUSPENDED":
      return NextResponse.json(
        {
          success: false,

          message:
            "Your account has been suspended.",
        },
        {
          status: 403,
        },
      );

    case "USER_ACCOUNT_INACTIVE":
      return NextResponse.json(
        {
          success: false,

          message:
            "Your account is inactive.",
        },
        {
          status: 403,
        },
      );

    case "SESSION_ROLE_MISMATCH":
      return NextResponse.json(
        {
          success: false,

          message:
            "Your account permissions have changed. Please sign in again.",
        },
        {
          status: 403,
        },
      );

    case "ADMIN_ACCESS_REQUIRED":
    case "ACCESS_DENIED":
      return NextResponse.json(
        {
          success: false,

          message:
            "Administrator access is required for purchase management.",
        },
        {
          status: 403,
        },
      );

    case "INVALID_USER_ROLE":
      return NextResponse.json(
        {
          success: false,

          message:
            "Your account does not have a valid system role.",
        },
        {
          status: 403,
        },
      );

    default:
      return null;
  }
}

/* =========================================================
   LOAD PURCHASE LIST

   Shared internally by GET.
========================================================= */

async function loadPurchases(
  connection: PoolConnection,
) {
  /* =======================================================
     PURCHASE HEADERS
  ======================================================= */

  const [
    purchaseRows,
  ] =
    await connection.execute<
      PurchaseRow[]
    >(
      `
        SELECT
          p.id AS database_id,

          p.purchase_no,

          s.supplier_code,

          s.name
            AS supplier_name,

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
      `,
    );

  /* =======================================================
     EMPTY
  ======================================================= */

  if (
    purchaseRows.length ===
    0
  ) {
    return [];
  }

  /* =======================================================
     PURCHASE ITEMS
  ======================================================= */

  const [
    itemRows,
  ] =
    await connection.execute<
      PurchaseItemRow[]
    >(
      `
        SELECT
          pi.id
            AS item_id,

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
      `,
    );

  /* =======================================================
     UNIT PRICES

     Received purchases:
     → batch_unit_prices

     Pending purchases:
     → rebuild from stored primary MRP
  ======================================================= */

  const [
    priceRows,
  ] =
    await connection.execute<
      PriceRow[]
    >(
      `
        SELECT
          pi.id
            AS item_id,

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
      `,
    );

  /* =======================================================
     PRICE MAP
  ======================================================= */

  const priceMap =
    new Map<
      number,
      Array<{
        unitName: string;

        conversionToBase:
          number;

        sellingPrice:
          number;

        mrp:
          number;
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
     * Pending purchase:
     * no received batch exists yet.
     *
     * Rebuild sellable-unit MRP
     * from primary pricing unit MRP.
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

  /* =======================================================
     ITEM MAP
  ======================================================= */

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

        conversionToBase:
          number;

        quantity: number;

        baseQuantity: number;

        unitCost: number;

        batchNo: string;

        expiryDate: string;

        unitPrices: Array<{
          unitName: string;

          conversionToBase:
            number;

          sellingPrice:
            number;

          mrp:
            number;
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

  /* =======================================================
     RESPONSE DATA
  ======================================================= */

  return purchaseRows.map(
    (
      purchase,
    ) => ({
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
  );
}

/* =========================================================
   GET
   /api/purchases

   ADMIN ONLY
========================================================= */

export async function GET() {
  const connection =
    await db.getConnection();

  try {
    /* =====================================================
       ADMIN AUTHORIZATION
    ===================================================== */

    await requireAdmin(
      connection,
    );

    /* =====================================================
       PURCHASE DATA
    ===================================================== */

    const purchases =
      await loadPurchases(
        connection,
      );

    return NextResponse.json(
      {
        success: true,

        data:
          purchases,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "GET purchases error:",
      error,
    );

    /* =====================================================
       AUTHORIZATION
    ===================================================== */

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (authResponse) {
      return authResponse;
    }

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
  } finally {
    connection.release();
  }
}

/* =========================================================
   POST
   /api/purchases

   CREATE PURCHASE

   ADMIN ONLY
========================================================= */

export async function POST(
  request: Request,
) {
  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    /* =====================================================
       ADMIN AUTHORIZATION

       Purchase creation must never be allowed
       for Pharmacist users.
    ===================================================== */

    const currentAdmin =
      await requireAdmin(
        connection,
      );

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    let body:
      PurchaseRequestBody;

    try {
      body =
        (await request.json()) as
          PurchaseRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       BASIC FIELDS
    ===================================================== */

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

    /* =====================================================
       VALIDATE SUPPLIER
    ===================================================== */

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

    /* =====================================================
       VALIDATE DATE
    ===================================================== */

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

    /* =====================================================
       VALIDATE ITEMS
    ===================================================== */

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

    const rawItems =
      body.items as
        RawPurchaseItem[];

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       SUPPLIER

       Only ACTIVE supplier can be used.
    ===================================================== */

    const [
      supplierRows,
    ] =
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

            AND
            status = 'ACTIVE'

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
      const [
        duplicates,
      ] =
        await connection.execute<
          DuplicateInvoiceRow[]
        >(
          `
            SELECT
              id

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

       created_by now always contains
       actual authenticated Admin user ID.
    ===================================================== */

    const temporaryNo =
      `TMP-${randomUUID()}`;

    const [
      purchaseResult,
    ] =
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

          currentAdmin.userId,
        ],
      );

    const purchaseId =
      purchaseResult.insertId;

    /* =====================================================
       PURCHASE NUMBER
    ===================================================== */

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

        SET
          purchase_no = ?

        WHERE
          id = ?
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
      rawItems.length;
      index += 1
    ) {
      const rawItem =
        rawItems[index];

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

      /* ===================================================
         MEDICINE REQUIRED
      =================================================== */

      if (
        !medicineCode
      ) {
        throw new PurchaseServiceError(
          `Medicine is required for item ${itemNumber}.`,
        );
      }

      /* ===================================================
         PURCHASE UNIT REQUIRED
      =================================================== */

      if (
        !purchaseUnitName
      ) {
        throw new PurchaseServiceError(
          `Purchase unit is required for item ${itemNumber}.`,
        );
      }

      /* ===================================================
         QUANTITY
      =================================================== */

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

      /* ===================================================
         PURCHASE COST
      =================================================== */

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

      /* ===================================================
         BATCH NUMBER
      =================================================== */

      if (
        !batchNo
      ) {
        throw new PurchaseServiceError(
          `Batch number is required for item ${itemNumber}.`,
        );
      }

      /* ===================================================
         EXPIRY DATE
      =================================================== */

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

      /* ===================================================
         PRIMARY MRP
      =================================================== */

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

      /* ===================================================
         DUPLICATE MEDICINE + BATCH
         INSIDE SAME PURCHASE
      =================================================== */

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

         Only ACTIVE medicines can be purchased.
      =================================================== */

      const [
        medicineRows,
      ] =
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

              AND
              status = 'ACTIVE'

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

      const [
        units,
      ] =
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

            WHERE
              medicine_id = ?

            ORDER BY
              conversion_to_base DESC
          `,
          [
            medicineId,
          ],
        );

      /* ===================================================
         PURCHASE UNIT
      =================================================== */

      const purchaseUnit =
        units.find(
          (
            unit,
          ) =>
            unit.unit_name ===
              purchaseUnitName &&
            Boolean(
              unit.is_purchasable,
            ),
        );

      if (
        !purchaseUnit
      ) {
        throw new PurchaseServiceError(
          `${purchaseUnitName} is not a valid purchasable unit for item ${itemNumber}.`,
        );
      }

      /* ===================================================
         PRIMARY PRICING UNIT

         Highest sellable conversion.
      =================================================== */

      const pricingUnit =
        units
          .filter(
            (
              unit,
            ) =>
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

      if (
        !pricingUnit
      ) {
        throw new PurchaseServiceError(
          `No selling unit is configured for item ${itemNumber}.`,
        );
      }

      /* ===================================================
         CONVERSION
      =================================================== */

      const conversion =
        Number(
          purchaseUnit
            .conversion_to_base,
        );

      if (
        !Number.isFinite(
          conversion,
        ) ||
        conversion <= 0
      ) {
        throw new PurchaseServiceError(
          `Invalid unit conversion for item ${itemNumber}.`,
        );
      }

      /* ===================================================
         BASE QUANTITY
      =================================================== */

      const baseQuantity =
        quantity *
        conversion;

      /* ===================================================
         LINE TOTAL
      =================================================== */

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

      /* ===================================================
         INSERT PURCHASE ITEM
      =================================================== */

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
       PURCHASE TOTAL
    ===================================================== */

    await connection.execute(
      `
        UPDATE purchases

        SET
          subtotal = ?,

          grand_total = ?

        WHERE
          id = ?
      `,
      [
        subtotal,

        subtotal,

        purchaseId,
      ],
    );

    /* =====================================================
       RECEIVE IMMEDIATELY

       If Admin chooses Received while
       creating the purchase:

       receivePurchaseByNo() handles:
       - batch creation
       - inventory update
       - batch prices
       - stock movements
       - received_by
       - received_at

       Actual authenticated Admin ID
       is recorded.
    ===================================================== */

    if (
      requestedStatus ===
      "Received"
    ) {
      await receivePurchaseByNo(
        connection,

        purchaseNo,

        currentAdmin.userId,
      );
    }

    /* =====================================================
       COMMIT
    ===================================================== */

    await connection.commit();

    transactionStarted =
      false;

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

          createdBy: {
            userId:
              currentAdmin.userId,

            fullName:
              currentAdmin.fullName,
          },
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    /* =====================================================
       ROLLBACK
    ===================================================== */

    if (
      transactionStarted
    ) {
      try {
        await connection.rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "Purchase rollback error:",
          rollbackError,
        );
      }
    }

    console.error(
      "POST purchase error:",
      error,
    );

    /* =====================================================
       AUTHORIZATION
    ===================================================== */

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (authResponse) {
      return authResponse;
    }

    /* =====================================================
       PURCHASE SERVICE ERRORS
    ===================================================== */

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

    /* =====================================================
       SERVER ERROR
    ===================================================== */

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