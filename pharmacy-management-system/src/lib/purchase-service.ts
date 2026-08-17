import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import type {
  PoolConnection,
} from "mysql2/promise";

/* =========================================================
   TYPES
========================================================= */

interface PurchaseRow
  extends RowDataPacket {
  id: number;

  purchase_no: string;

  status:
    | "PENDING"
    | "RECEIVED"
    | "CANCELLED";
}

interface PurchaseItemRow
  extends RowDataPacket {
  item_id: number;

  medicine_id: number;

  batch_no: string;

  expiry_date: string;

  base_quantity:
    | number
    | string;

  pricing_unit_id:
    | number
    | null;

  pricing_unit_mrp:
    | number
    | string
    | null;
}

interface BatchRow
  extends RowDataPacket {
  id: number;

  expiry_date: string;

  status:
    | "ACTIVE"
    | "DEPLETED"
    | "EXPIRED"
    | "BLOCKED";

  current_quantity_base:
    | number
    | string;
}

interface PricingUnitRow
  extends RowDataPacket {
  id: number;

  conversion_to_base:
    | number
    | string;
}

interface SellableUnitRow
  extends RowDataPacket {
  id: number;

  conversion_to_base:
    | number
    | string;
}

/* =========================================================
   SERVICE ERROR
========================================================= */

export class PurchaseServiceError
  extends Error {
  status: number;

  code: string;

  constructor(
    message: string,
    status = 400,
    code = "PURCHASE_ERROR",
  ) {
    super(message);

    this.name =
      "PurchaseServiceError";

    this.status =
      status;

    this.code =
      code;
  }
}

/* =========================================================
   MONEY
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

/* =========================================================
   TODAY
========================================================= */

function getTodayLocalDate() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      today.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

/* =========================================================
   RECEIVE PURCHASE

   Transaction must already be started by caller.

   Flow:

   Purchase PENDING
       ↓
   lock purchase
       ↓
   each purchase item
       ↓
   create/update batch
       ↓
   batch unit prices
       ↓
   stock movement PURCHASE_IN
       ↓
   purchase RECEIVED
========================================================= */

export async function receivePurchaseByNo(
  connection: PoolConnection,

  purchaseNo: string,

  userId: number,
) {
  /* =======================================================
     LOCK PURCHASE
  ======================================================= */

  const [purchaseRows] =
    await connection.execute<
      PurchaseRow[]
    >(
      `
        SELECT
          id,
          purchase_no,
          status

        FROM purchases

        WHERE purchase_no = ?

        LIMIT 1

        FOR UPDATE
      `,
      [purchaseNo],
    );

  if (
    purchaseRows.length === 0
  ) {
    throw new PurchaseServiceError(
      "Purchase not found.",
      404,
      "PURCHASE_NOT_FOUND",
    );
  }

  const purchase =
    purchaseRows[0];

  if (
    purchase.status ===
    "RECEIVED"
  ) {
    throw new PurchaseServiceError(
      "This purchase has already been received.",
      409,
      "PURCHASE_ALREADY_RECEIVED",
    );
  }

  if (
    purchase.status !==
    "PENDING"
  ) {
    throw new PurchaseServiceError(
      "Only pending purchases can be received.",
      409,
      "PURCHASE_NOT_PENDING",
    );
  }

  /* =======================================================
     ITEMS
  ======================================================= */

  const [items] =
    await connection.execute<
      PurchaseItemRow[]
    >(
      `
        SELECT
          id AS item_id,
          medicine_id,
          batch_no,

          DATE_FORMAT(
            expiry_date,
            '%Y-%m-%d'
          ) AS expiry_date,

          base_quantity,

          pricing_unit_id,

          pricing_unit_mrp

        FROM purchase_items

        WHERE purchase_id = ?

        ORDER BY id ASC

        FOR UPDATE
      `,
      [
        purchase.id,
      ],
    );

  if (
    items.length === 0
  ) {
    throw new PurchaseServiceError(
      "Purchase does not contain any items.",
      409,
      "PURCHASE_EMPTY",
    );
  }

  const today =
    getTodayLocalDate();

  /* =======================================================
     PROCESS ITEMS
  ======================================================= */

  for (
    const item of items
  ) {
    const baseQuantity =
      Number(
        item.base_quantity,
      );

    if (
      !Number.isFinite(
        baseQuantity,
      ) ||
      baseQuantity <= 0
    ) {
      throw new PurchaseServiceError(
        `Invalid stock quantity for purchase item ${item.item_id}.`,
      );
    }

    /*
     * A pending order may remain pending for months.
     * Do not allow receiving medicine that is already expired.
     */
    if (
      item.expiry_date <=
      today
    ) {
      throw new PurchaseServiceError(
        `Batch ${item.batch_no} is expired and cannot be received.`,
        409,
        "EXPIRED_BATCH",
      );
    }

    /* =====================================================
       FIND EXISTING BATCH
    ===================================================== */

    const [batchRows] =
      await connection.execute<
        BatchRow[]
      >(
        `
          SELECT
            id,

            DATE_FORMAT(
              expiry_date,
              '%Y-%m-%d'
            ) AS expiry_date,

            status,

            current_quantity_base

          FROM medicine_batches

          WHERE
            medicine_id = ?
            AND batch_no = ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          item.medicine_id,

          item.batch_no,
        ],
      );

    let batchId: number;

    if (
      batchRows.length >
      0
    ) {
      const existingBatch =
        batchRows[0];

      /*
       * Same medicine + batch number should not have
       * different expiry dates.
       */
      if (
        existingBatch.expiry_date !==
        item.expiry_date
      ) {
        throw new PurchaseServiceError(
          `Batch ${item.batch_no} already exists with a different expiry date.`,
          409,
          "BATCH_EXPIRY_MISMATCH",
        );
      }

      if (
        existingBatch.status ===
          "BLOCKED" ||
        existingBatch.status ===
          "EXPIRED"
      ) {
        throw new PurchaseServiceError(
          `Batch ${item.batch_no} cannot receive additional stock because its current status is ${existingBatch.status}.`,
          409,
          "BATCH_NOT_RECEIVABLE",
        );
      }

      batchId =
        Number(
          existingBatch.id,
        );

      await connection.execute(
        `
          UPDATE medicine_batches

          SET
            current_quantity_base =
              current_quantity_base + ?,

            status = 'ACTIVE'

          WHERE id = ?
        `,
        [
          baseQuantity,

          batchId,
        ],
      );
    } else {
      const [batchResult] =
        await connection.execute<
          ResultSetHeader
        >(
          `
            INSERT INTO medicine_batches
            (
              medicine_id,
              batch_no,
              expiry_date,
              current_quantity_base,
              status
            )
            VALUES
            (?, ?, ?, ?, 'ACTIVE')
          `,
          [
            item.medicine_id,

            item.batch_no,

            item.expiry_date,

            baseQuantity,
          ],
        );

      batchId =
        batchResult.insertId;
    }

    /* =====================================================
       ATTACH BATCH TO PURCHASE ITEM
    ===================================================== */

    await connection.execute(
      `
        UPDATE purchase_items

        SET received_batch_id = ?

        WHERE id = ?
      `,
      [
        batchId,

        item.item_id,
      ],
    );

    /* =====================================================
       BATCH PRICES
    ===================================================== */

    if (
      !item.pricing_unit_id ||
      item.pricing_unit_mrp ===
        null
    ) {
      throw new PurchaseServiceError(
        `Pricing information is missing for batch ${item.batch_no}.`,
        409,
        "PRICE_MISSING",
      );
    }

    const primaryMrp =
      Number(
        item.pricing_unit_mrp,
      );

    if (
      !Number.isFinite(
        primaryMrp,
      ) ||
      primaryMrp <= 0
    ) {
      throw new PurchaseServiceError(
        `Invalid MRP for batch ${item.batch_no}.`,
      );
    }

    const [pricingRows] =
      await connection.execute<
        PricingUnitRow[]
      >(
        `
          SELECT
            id,
            conversion_to_base

          FROM medicine_units

          WHERE
            id = ?
            AND medicine_id = ?

          LIMIT 1
        `,
        [
          item.pricing_unit_id,

          item.medicine_id,
        ],
      );

    if (
      pricingRows.length ===
      0
    ) {
      throw new PurchaseServiceError(
        `Pricing unit is no longer available for batch ${item.batch_no}.`,
        409,
        "PRICING_UNIT_NOT_FOUND",
      );
    }

    const primaryConversion =
      Number(
        pricingRows[0]
          .conversion_to_base,
      );

    if (
      primaryConversion <= 0
    ) {
      throw new PurchaseServiceError(
        "Invalid primary pricing conversion.",
      );
    }

    const [sellableUnits] =
      await connection.execute<
        SellableUnitRow[]
      >(
        `
          SELECT
            id,
            conversion_to_base

          FROM medicine_units

          WHERE
            medicine_id = ?
            AND is_sellable = TRUE

          ORDER BY
            conversion_to_base DESC
        `,
        [
          item.medicine_id,
        ],
      );

    if (
      sellableUnits.length ===
      0
    ) {
      throw new PurchaseServiceError(
        `Medicine for batch ${item.batch_no} has no sellable units.`,
        409,
        "NO_SELLABLE_UNITS",
      );
    }

    for (
      const unit of
      sellableUnits
    ) {
      const conversion =
        Number(
          unit.conversion_to_base,
        );

      const calculatedPrice =
        roundMoney(
          (
            primaryMrp *
            conversion
          ) /
            primaryConversion,
        );

      await connection.execute(
        `
          INSERT INTO batch_unit_prices
          (
            batch_id,
            medicine_unit_id,
            mrp,
            selling_price
          )
          VALUES
          (?, ?, ?, ?)

          ON DUPLICATE KEY UPDATE
            mrp =
              VALUES(mrp),

            selling_price =
              VALUES(selling_price)
        `,
        [
          batchId,

          unit.id,

          calculatedPrice,

          calculatedPrice,
        ],
      );
    }

    /* =====================================================
       STOCK MOVEMENT AUDIT
    ===================================================== */

    await connection.execute(
      `
        INSERT INTO stock_movements
        (
          medicine_id,
          batch_id,
          movement_type,
          quantity_change_base,
          purchase_item_id,
          reference_no,
          reason,
          performed_by
        )
        VALUES
        (
          ?,
          ?,
          'PURCHASE_IN',
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `,
      [
        item.medicine_id,

        batchId,

        baseQuantity,

        item.item_id,

        purchase.purchase_no,

        "Purchase received",

        userId,
      ],
    );
  }

  /* =======================================================
     MARK RECEIVED
  ======================================================= */

  await connection.execute(
    `
      UPDATE purchases

      SET
        status = 'RECEIVED',

        received_by = ?,

        received_at = NOW()

      WHERE id = ?
    `,
    [
      userId,

      purchase.id,
    ],
  );

  return {
    purchaseNo:
      purchase.purchase_no,

    itemCount:
      items.length,
  };
}