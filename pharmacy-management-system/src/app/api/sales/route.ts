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

/* =========================================================
   TYPES
========================================================= */

type PaymentStatus =
  | "paid"
  | "partial"
  | "due";

type PaymentMethod =
  | "Cash"
  | "bKash"
  | "Nagad"
  | "Card"
  | "Rocket";

type PaymentMethodDb =
  | "CASH"
  | "BKASH"
  | "NAGAD"
  | "CARD"
  | "ROCKET";

interface SaleRow
  extends RowDataPacket {
  invoice_no: string;

  customer_name: string;

  customer_mobile:
    | string
    | null;

  sale_date: string;

  item_count:
    | number
    | string;

  grand_total:
    | number
    | string;

  payment_status:
    | "PAID"
    | "PARTIAL"
    | "DUE";

  payment_method:
    | string
    | null;
}

interface SettingsRow
  extends RowDataPacket {
  vat_enabled: number;

  default_vat_rate:
    | number
    | string;

  invoice_prefix: string;
}

interface MedicineUnitRow
  extends RowDataPacket {
  medicine_id: number;

  medicine_code: string;

  medicine_name: string;

  unit_id: number;

  unit_name: string;

  conversion_to_base:
    | number
    | string;
}

interface BatchRow
  extends RowDataPacket {
  id: number;

  batch_no: string;

  expiry_date: string;

  current_quantity_base:
    | number
    | string;

  selling_price:
    | number
    | string
    | null;
}

interface CustomerRow
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

function paymentMethodToDb(
  method: PaymentMethod,
): PaymentMethodDb {
  switch (method) {
    case "bKash":
      return "BKASH";

    case "Nagad":
      return "NAGAD";

    case "Card":
      return "CARD";

    case "Rocket":
      return "ROCKET";

    default:
      return "CASH";
  }
}

function paymentMethodFromDb(
  method: string | null,
) {
  if (!method) {
    return "-";
  }

  const methods =
    method.split(",");

  return methods
    .map((value) => {
      const current =
        value.trim();

      switch (current) {
        case "BKASH":
          return "bKash";

        case "NAGAD":
          return "Nagad";

        case "CARD":
          return "Card";

        case "ROCKET":
          return "Rocket";

        case "BANK":
          return "Bank";

        default:
          return "Cash";
      }
    })
    .join(" + ");
}

function paymentStatusFromDb(
  status:
    | "PAID"
    | "PARTIAL"
    | "DUE",
): PaymentStatus {
  if (
    status === "PARTIAL"
  ) {
    return "partial";
  }

  if (
    status === "DUE"
  ) {
    return "due";
  }

  return "paid";
}

/* =========================================================
   GET RECENT SALES
========================================================= */

export async function GET() {
  try {
    const [rows] =
      await db.execute<
        SaleRow[]
      >(`
        SELECT
          s.invoice_no,

          s.customer_name,

          s.customer_mobile,

          DATE_FORMAT(
            s.sale_date,
            '%d-%m-%Y'
          ) AS sale_date,

          COALESCE(
            (
              SELECT
                SUM(si.quantity)

              FROM sale_items si

              WHERE
                si.sale_id = s.id
            ),
            0
          ) AS item_count,

          s.grand_total,

          s.payment_status,

          (
            SELECT
              GROUP_CONCAT(
                DISTINCT p.payment_method
                ORDER BY p.id
                SEPARATOR ','
              )

            FROM payments p

            WHERE
              p.sale_id = s.id
          ) AS payment_method

        FROM sales s

        WHERE
          s.status = 'COMPLETED'

        ORDER BY
          s.id DESC

        LIMIT 50
      `);

    return NextResponse.json({
      success: true,

      data:
        rows.map(
          (row) => ({
            invoice:
              row.invoice_no,

            customer:
              row.customer_name,

            mobile:
              row.customer_mobile ??
              "-",

            date:
              row.sale_date,

            items:
              Number(
                row.item_count,
              ),

            amount:
              Number(
                row.grand_total,
              ),

            method:
              paymentMethodFromDb(
                row.payment_method,
              ),

            status:
              paymentStatusFromDb(
                row.payment_status,
              ),
          }),
        ),
    });
  } catch (error) {
    console.error(
      "GET sales error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to load sales.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   CREATE SALE
========================================================= */

export async function POST(
  request: Request,
) {
  const connection =
    await db.getConnection();

  try {
    const body =
      await request.json();

    /* =====================================================
       CUSTOMER
    ===================================================== */

    const customerName =
      cleanString(
        body.customerName,
      );

    const mobileNumber =
      cleanString(
        body.mobileNumber,
      );

    if (
      mobileNumber &&
      !/^01\d{9}$/.test(
        mobileNumber,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid 11-digit mobile number.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       CART
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
            "Please add at least one medicine.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       DISCOUNT
    ===================================================== */

    const discountPercent =
      Number(
        body.discountPercent ??
          0,
      );

    if (
      !Number.isFinite(
        discountPercent,
      ) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Discount must be between 0 and 100.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       PAYMENT STATUS
    ===================================================== */

    const requestedPaymentStatus =
      body.paymentStatus as
        PaymentStatus;

    if (
      requestedPaymentStatus !==
        "paid" &&
      requestedPaymentStatus !==
        "partial" &&
      requestedPaymentStatus !==
        "due"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid payment status.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Real-world rule:
     *
     * Due/partial sale must be traceable
     * to an identifiable customer.
     */

    if (
      (
        requestedPaymentStatus ===
          "due" ||
        requestedPaymentStatus ===
          "partial"
      ) &&
      (
        !customerName ||
        !mobileNumber
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Customer name and mobile number are required for partial or due sales.",
        },
        {
          status: 400,
        },
      );
    }

    const paymentMethod =
      body.paymentMethod as
        PaymentMethod;

    if (
      requestedPaymentStatus !==
        "due" &&
      ![
        "Cash",
        "bKash",
        "Nagad",
        "Card",
        "Rocket",
      ].includes(
        paymentMethod,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid payment method.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    const userId =
      await getCurrentUserId(
        connection,
      );

    /* =====================================================
       SETTINGS

       Server calculates VAT.
       Never trust frontend VAT.
    ===================================================== */

    const [settingsRows] =
      await connection.execute<
        SettingsRow[]
      >(
        `
          SELECT
            vat_enabled,
            default_vat_rate,
            invoice_prefix

          FROM system_settings

          WHERE id = 1

          LIMIT 1
        `,
      );

    const settings =
      settingsRows[0];

    const vatEnabled =
      Boolean(
        settings?.vat_enabled ??
          false,
      );

    const vatRate =
      Number(
        settings
          ?.default_vat_rate ??
          0,
      );

    const invoicePrefix =
      settings
        ?.invoice_prefix ||
      "INV";

    /* =====================================================
       CUSTOMER RECORD

       If mobile is provided:
       - use existing customer
       - otherwise create one
    ===================================================== */

    let customerId:
      number | null =
      null;

    const customerSnapshotName =
      customerName ||
      "Walk-in Customer";

    if (mobileNumber) {
      const [customerRows] =
        await connection.execute<
          CustomerRow[]
        >(
          `
            SELECT id

            FROM customers

            WHERE phone = ?

            LIMIT 1

            FOR UPDATE
          `,
          [
            mobileNumber,
          ],
        );

      if (
        customerRows.length >
        0
      ) {
        customerId =
          Number(
            customerRows[0]
              .id,
          );

        /*
         * Only update the name when cashier
         * actually supplied a name.
         */
        if (customerName) {
          await connection.execute(
            `
              UPDATE customers

              SET
                name = ?,
                status = 'ACTIVE'

              WHERE id = ?
            `,
            [
              customerName,

              customerId,
            ],
          );
        }
      } else {
        const temporaryCode =
          `TMP-${randomUUID()}`;

        const [customerResult] =
          await connection.execute<
            ResultSetHeader
          >(
            `
              INSERT INTO customers
              (
                customer_code,
                name,
                phone,
                status
              )
              VALUES
              (?, ?, ?, 'ACTIVE')
            `,
            [
              temporaryCode,

              customerSnapshotName,

              mobileNumber,
            ],
          );

        customerId =
          customerResult.insertId;

        const customerCode =
          `CUS-${String(
            customerId,
          ).padStart(
            3,
            "0",
          )}`;

        await connection.execute(
          `
            UPDATE customers

            SET customer_code = ?

            WHERE id = ?
          `,
          [
            customerCode,

            customerId,
          ],
        );
      }
    }

    /* =====================================================
       CREATE SALE HEADER FIRST
    ===================================================== */

    const temporaryInvoice =
      `TMP-${randomUUID()}`;

    const [saleResult] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          INSERT INTO sales
          (
            invoice_no,
            customer_id,
            customer_name,
            customer_mobile,
            subtotal,
            discount_percent,
            discount_amount,
            vat_enabled,
            vat_rate,
            vat_amount,
            grand_total,
            payment_status,
            paid_amount,
            due_amount,
            status,
            sold_by
          )
          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            0,
            ?,
            0,
            ?,
            ?,
            0,
            0,
            'PAID',
            0,
            0,
            'COMPLETED',
            ?
          )
        `,
        [
          temporaryInvoice,

          customerId,

          customerSnapshotName,

          mobileNumber ||
            null,

          discountPercent,

          vatEnabled
            ? 1
            : 0,

          vatRate,

          userId,
        ],
      );

    const saleId =
      saleResult.insertId;

    const year =
      new Date()
        .getFullYear();

    const invoiceNo =
      `${invoicePrefix}-${year}-${String(
        saleId,
      ).padStart(
        3,
        "0",
      )}`;

    await connection.execute(
      `
        UPDATE sales

        SET invoice_no = ?

        WHERE id = ?
      `,
      [
        invoiceNo,

        saleId,
      ],
    );

    /* =====================================================
       NORMALIZE CART

       Same medicine + same unit is merged.

       Example:
       Napa Tablet 2
       Napa Tablet 3

       becomes:
       Napa Tablet 5
    ===================================================== */

    const normalizedMap =
      new Map<
        string,
        {
          medicineId: string;

          unitName: string;

          quantity: number;
        }
      >();

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
        ).toUpperCase();

      const unitName =
        cleanString(
          rawItem.unitName,
        );

      const quantity =
        Number(
          rawItem.quantity,
        );

      if (
        !medicineCode ||
        !unitName
      ) {
        throw new Error(
          `Invalid sale item ${index + 1}.`,
        );
      }

      /*
       * User requirement:
       *
       * Quantity can be:
       * 1 Tablet
       * 5 Tablet
       * 2 Strip
       * 3 Box
       * etc.
       *
       * But each packaging quantity is whole.
       */

      if (
        !Number.isInteger(
          quantity,
        ) ||
        quantity <= 0
      ) {
        throw new Error(
          `Quantity for item ${index + 1} must be a positive whole number.`,
        );
      }

      const key =
        `${medicineCode}::${unitName.toLowerCase()}`;

      const existing =
        normalizedMap.get(
          key,
        );

      if (existing) {
        existing.quantity +=
          quantity;
      } else {
        normalizedMap.set(
          key,
          {
            medicineId:
              medicineCode,

            unitName,

            quantity,
          },
        );
      }
    }

    const normalizedItems =
      Array.from(
        normalizedMap.values(),
      );

    let subtotal =
      0;

    const invoiceItems: Array<{
      id: string;

      medicineId: string;

      medicineName: string;

      baseUnit: string;

      unitName: string;

      conversionToBase: number;

      unitPrice: number;

      quantity: number;
    }> = [];

    /* =====================================================
       PROCESS EACH SALE ITEM

       MIXED UNITS ARE COMPLETELY VALID:

       DemoCal:
       1 Box
       5 Strip
       3 Tablet

       => three sale_items

       Each one converts to base stock.
    ===================================================== */

    for (
      const item of
      normalizedItems
    ) {
      /* ===================================================
         MEDICINE + UNIT
      =================================================== */

      const [unitRows] =
        await connection.execute<
          MedicineUnitRow[]
        >(
          `
            SELECT
              m.id AS medicine_id,

              m.medicine_code,

              m.name
                AS medicine_name,

              u.id
                AS unit_id,

              u.unit_name,

              u.conversion_to_base

            FROM medicines m

            INNER JOIN medicine_units u
              ON
                u.medicine_id =
                  m.id

            WHERE
              m.medicine_code = ?

              AND
              m.status = 'ACTIVE'

              AND
              u.unit_name = ?

              AND
              u.is_sellable = TRUE

            LIMIT 1
          `,
          [
            item.medicineId,

            item.unitName,
          ],
        );

      if (
        unitRows.length ===
        0
      ) {
        throw new Error(
          `${item.medicineId} / ${item.unitName} is not available for sale.`,
        );
      }

      const unit =
        unitRows[0];

      const conversion =
        Number(
          unit.conversion_to_base,
        );

      if (
        !Number.isFinite(
          conversion,
        ) ||
        conversion <= 0
      ) {
        throw new Error(
          `Invalid unit conversion for ${unit.medicine_name}.`,
        );
      }

      const requestedBase =
        item.quantity *
        conversion;

      /* ===================================================
         FEFO BATCH LOCK

         Important:
         Every later mixed-unit item sees stock already
         reduced by earlier items in THIS SAME transaction.

         Therefore:
         1 Box + 5 Strip + 3 Tablet
         cannot accidentally oversell the same batch stock.
      =================================================== */

      const [batchRows] =
        await connection.execute<
          BatchRow[]
        >(
          `
            SELECT
              b.id,

              b.batch_no,

              DATE_FORMAT(
                b.expiry_date,
                '%Y-%m-%d'
              ) AS expiry_date,

              b.current_quantity_base,

              bup.selling_price

            FROM medicine_batches b

            LEFT JOIN batch_unit_prices bup
              ON
                bup.batch_id =
                  b.id

                AND
                bup.medicine_unit_id =
                  ?

            WHERE
              b.medicine_id = ?

              AND
              b.status = 'ACTIVE'

              AND
              b.current_quantity_base > 0

              AND
              b.expiry_date >= CURDATE()

            ORDER BY
              b.expiry_date ASC,
              b.id ASC

            FOR UPDATE
          `,
          [
            unit.unit_id,

            unit.medicine_id,
          ],
        );

      const totalAvailable =
        batchRows.reduce(
          (
            total,
            batch,
          ) =>
            total +
            Number(
              batch.current_quantity_base,
            ),

          0,
        );

      if (
        requestedBase >
        totalAvailable
      ) {
        throw new Error(
          `Not enough ${unit.medicine_name} stock. Required: ${requestedBase}, available: ${totalAvailable}.`,
        );
      }

      let remaining =
        requestedBase;

      let lineRevenue =
        0;

      const allocations: Array<{
        batchId: number;

        allocatedBase: number;
      }> = [];

      /* ===================================================
         FEFO ALLOCATION
      =================================================== */

      for (
        const batch of
        batchRows
      ) {
        if (
          remaining <= 0
        ) {
          break;
        }

        const batchStock =
          Number(
            batch.current_quantity_base,
          );

        if (
          batchStock <= 0
        ) {
          continue;
        }

        /*
         * We cannot skip an earlier FEFO batch
         * just because its price is missing.
         *
         * That would silently violate FEFO.
         */

        if (
          batch.selling_price ===
          null
        ) {
          throw new Error(
            `Selling price is missing for ${unit.medicine_name}, batch ${batch.batch_no}, unit ${unit.unit_name}.`,
          );
        }

        const unitSellingPrice =
          Number(
            batch.selling_price,
          );

        if (
          !Number.isFinite(
            unitSellingPrice,
          ) ||
          unitSellingPrice <= 0
        ) {
          throw new Error(
            `Invalid selling price for ${unit.medicine_name}, batch ${batch.batch_no}.`,
          );
        }

        const allocatedBase =
          Math.min(
            remaining,
            batchStock,
          );

        /*
         * Example:
         *
         * Strip price = 25
         * Strip conversion = 10 Tablet
         *
         * Price per base Tablet = 2.50
         *
         * If FEFO allocation takes only
         * 4 tablets from this batch:
         *
         * revenue = 4 × 2.50 = 10
         */

        const pricePerBase =
          unitSellingPrice /
          conversion;

        lineRevenue +=
          allocatedBase *
          pricePerBase;

        const newQuantity =
          batchStock -
          allocatedBase;

        await connection.execute(
          `
            UPDATE medicine_batches

            SET
              current_quantity_base = ?,

              status =
                CASE
                  WHEN ? <= 0
                    THEN 'DEPLETED'

                  ELSE 'ACTIVE'
                END

            WHERE id = ?
          `,
          [
            newQuantity,

            newQuantity,

            batch.id,
          ],
        );

        allocations.push({
          batchId:
            batch.id,

          allocatedBase,
        });

        remaining -=
          allocatedBase;
      }

      if (
        remaining > 0
      ) {
        throw new Error(
          `FEFO allocation failed for ${unit.medicine_name}.`,
        );
      }

      const lineTotal =
        roundMoney(
          lineRevenue,
        );

      /*
       * If multiple batches have different prices,
       * store the effective weighted price.
       */

      const effectiveUnitPrice =
        roundMoney(
          lineTotal /
            item.quantity,
        );

      subtotal =
        roundMoney(
          subtotal +
          lineTotal,
        );

      /* ===================================================
         SALE ITEM
      =================================================== */

      const [saleItemResult] =
        await connection.execute<
          ResultSetHeader
        >(
          `
            INSERT INTO sale_items
            (
              sale_id,
              medicine_id,
              medicine_unit_id,
              unit_name_snapshot,
              conversion_to_base_snapshot,
              quantity,
              base_quantity,
              unit_price,
              line_total
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            saleId,

            unit.medicine_id,

            unit.unit_id,

            unit.unit_name,

            conversion,

            item.quantity,

            requestedBase,

            effectiveUnitPrice,

            lineTotal,
          ],
        );

      const saleItemId =
        saleItemResult.insertId;

      /* ===================================================
         ALLOCATION + STOCK MOVEMENT
      =================================================== */

      for (
        const allocation of
        allocations
      ) {
        await connection.execute(
          `
            INSERT INTO sale_item_batch_allocations
            (
              sale_item_id,
              batch_id,
              allocated_base_quantity
            )
            VALUES
            (?, ?, ?)
          `,
          [
            saleItemId,

            allocation.batchId,

            allocation.allocatedBase,
          ],
        );

        await connection.execute(
          `
            INSERT INTO stock_movements
            (
              medicine_id,
              batch_id,
              movement_type,
              quantity_change_base,
              sale_item_id,
              reference_no,
              reason,
              performed_by
            )
            VALUES
            (
              ?,
              ?,
              'SALE_OUT',
              ?,
              ?,
              ?,
              ?,
              ?
            )
          `,
          [
            unit.medicine_id,

            allocation.batchId,

            -allocation.allocatedBase,

            saleItemId,

            invoiceNo,

            "Medicine sale",

            userId,
          ],
        );
      }

      invoiceItems.push({
        id:
          `${item.medicineId}-${unit.unit_name}`,

        medicineId:
          item.medicineId,

        medicineName:
          unit.medicine_name,

        baseUnit:
          unit.unit_name ===
          "Bottle"
            ? "Bottle"
            : "",

        unitName:
          unit.unit_name,

        conversionToBase:
          conversion,

        unitPrice:
          effectiveUnitPrice,

        quantity:
          item.quantity,
      });
    }

    /* =====================================================
       TOTALS
    ===================================================== */

    const discountAmount =
      roundMoney(
        subtotal *
          (
            discountPercent /
            100
          ),
      );

    const afterDiscount =
      roundMoney(
        subtotal -
          discountAmount,
      );

    const vatAmount =
      vatEnabled
        ? roundMoney(
            afterDiscount *
              (
                vatRate /
                100
              ),
          )
        : 0;

    const grandTotal =
      roundMoney(
        afterDiscount +
          vatAmount,
      );

    /* =====================================================
       PAYMENT
    ===================================================== */

    let paidAmount =
      0;

    let dueAmount =
      0;

    let databasePaymentStatus:
      | "PAID"
      | "PARTIAL"
      | "DUE";

    if (
      requestedPaymentStatus ===
      "paid"
    ) {
      paidAmount =
        grandTotal;

      dueAmount =
        0;

      databasePaymentStatus =
        "PAID";
    } else if (
      requestedPaymentStatus ===
      "due"
    ) {
      paidAmount =
        0;

      dueAmount =
        grandTotal;

      databasePaymentStatus =
        "DUE";
    } else {
      paidAmount =
        Number(
          body.partialPaidAmount,
        );

      if (
        !Number.isFinite(
          paidAmount,
        ) ||
        paidAmount <= 0 ||
        paidAmount >=
          grandTotal
      ) {
        throw new Error(
          "Partial paid amount must be greater than 0 and less than the invoice total.",
        );
      }

      paidAmount =
        roundMoney(
          paidAmount,
        );

      dueAmount =
        roundMoney(
          grandTotal -
            paidAmount,
        );

      databasePaymentStatus =
        "PARTIAL";
    }

    /* =====================================================
       UPDATE SALE HEADER
    ===================================================== */

    await connection.execute(
      `
        UPDATE sales

        SET
          subtotal = ?,

          discount_percent = ?,

          discount_amount = ?,

          vat_enabled = ?,

          vat_rate = ?,

          vat_amount = ?,

          grand_total = ?,

          payment_status = ?,

          paid_amount = ?,

          due_amount = ?

        WHERE id = ?
      `,
      [
        subtotal,

        discountPercent,

        discountAmount,

        vatEnabled
          ? 1
          : 0,

        vatRate,

        vatAmount,

        grandTotal,

        databasePaymentStatus,

        paidAmount,

        dueAmount,

        saleId,
      ],
    );

    /* =====================================================
       PAYMENT RECORD

       Due sale creates no payment row.
    ===================================================== */

    if (
      paidAmount > 0
    ) {
      await connection.execute(
        `
          INSERT INTO payments
          (
            sale_id,
            amount,
            payment_method,
            received_by
          )
          VALUES
          (?, ?, ?, ?)
        `,
        [
          saleId,

          paidAmount,

          paymentMethodToDb(
            paymentMethod,
          ),

          userId,
        ],
      );
    }

    await connection.commit();

    return NextResponse.json(
      {
        success: true,

        message:
          "Sale completed successfully.",

        data: {
          invoice:
            invoiceNo,

          customer:
            customerSnapshotName,

          mobile:
            mobileNumber ||
            "-",

          date:
            new Date()
              .toLocaleDateString(
                "en-GB",
              )
              .replaceAll(
                "/",
                "-",
              ),

          items:
            invoiceItems,

          subtotal,

          discountPercent,

          discountAmount,

          vatEnabled,

          vatRatePercent:
            vatRate,

          vatAmount,

          total:
            grandTotal,

          paymentMethod:
            requestedPaymentStatus ===
            "due"
              ? "-"
              : paymentMethod,

          paymentStatus:
            requestedPaymentStatus,

          paidAmount,

          dueAmount,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    await connection.rollback();

    console.error(
      "POST sale error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message ===
        "CURRENT_USER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Development admin user was not found.",
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
          error instanceof Error
            ? error.message
            : "Failed to complete sale.",
      },
      {
        status: 400,
      },
    );
  } finally {
    connection.release();
  }
}