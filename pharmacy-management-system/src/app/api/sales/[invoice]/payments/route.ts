import { NextResponse } from "next/server";

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

type PaymentMethodDb =
  | "CASH"
  | "BKASH"
  | "NAGAD"
  | "CARD"
  | "ROCKET"
  | "BANK";

interface SaleRow extends RowDataPacket {
  id: number;

  invoice_no: string;

  customer_id:
    | number
    | null;

  grand_total:
    | number
    | string;

  paid_amount:
    | number
    | string;

  due_amount:
    | number
    | string;

  payment_status:
    | "PAID"
    | "PARTIAL"
    | "DUE";

  status:
    | "COMPLETED"
    | "CANCELLED";
}

/* =========================================================
   ERROR
========================================================= */

class PaymentError extends Error {
  status: number;

  constructor(
    message: string,
    status = 400,
  ) {
    super(message);

    this.status = status;
  }
}

/* =========================================================
   HELPERS
========================================================= */

function cleanString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

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

/* =========================================================
   POST PAYMENT
========================================================= */

export async function POST(
  request: Request,

  context: {
    params: Promise<{
      invoice: string;
    }>;
  },
) {
  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    const { invoice } =
      await context.params;

    const invoiceNo =
      cleanString(
        decodeURIComponent(
          invoice,
        ),
      );

    if (
      !invoiceNo ||
      invoiceNo.length > 50
    ) {
      throw new PaymentError(
        "Invalid invoice number.",
      );
    }

    const body =
      await request.json();

    const amount =
      roundMoney(
        Number(
          body.amount,
        ),
      );

    const paymentMethod =
      cleanString(
        body.paymentMethod,
      ).toUpperCase() as PaymentMethodDb;

    const transactionReference =
      cleanString(
        body.transactionReference,
      );

    const notes =
      cleanString(
        body.notes,
      );

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      throw new PaymentError(
        "Payment amount must be greater than 0.",
      );
    }

    const allowedMethods:
      PaymentMethodDb[] =
      [
        "CASH",
        "BKASH",
        "NAGAD",
        "CARD",
        "ROCKET",
        "BANK",
      ];

    if (
      !allowedMethods.includes(
        paymentMethod,
      )
    ) {
      throw new PaymentError(
        "Invalid payment method.",
      );
    }

    if (
      transactionReference.length >
      150
    ) {
      throw new PaymentError(
        "Transaction reference is too long.",
      );
    }

    if (
      notes.length > 255
    ) {
      throw new PaymentError(
        "Payment note is too long.",
      );
    }

    /* =====================================================
       TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted =
      true;

    /*
     * FOR UPDATE is important.
     *
     * If two cashiers try to collect
     * the same invoice simultaneously,
     * only one can modify it at a time.
     */

    const [saleRows] =
      await connection.execute<
        SaleRow[]
      >(
        `
          SELECT
            id,
            invoice_no,
            customer_id,
            grand_total,
            paid_amount,
            due_amount,
            payment_status,
            status

          FROM sales

          WHERE
            invoice_no = ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          invoiceNo,
        ],
      );

    if (
      saleRows.length ===
      0
    ) {
      throw new PaymentError(
        "Invoice was not found.",
        404,
      );
    }

    const sale =
      saleRows[0];

    if (
      sale.status !==
      "COMPLETED"
    ) {
      throw new PaymentError(
        "Payment cannot be collected for a cancelled sale.",
      );
    }

    const grandTotal =
      roundMoney(
        Number(
          sale.grand_total,
        ),
      );

    const currentPaid =
      roundMoney(
        Number(
          sale.paid_amount,
        ),
      );

    const currentDue =
      roundMoney(
        Number(
          sale.due_amount,
        ),
      );

    if (
      currentDue <= 0
    ) {
      throw new PaymentError(
        "This invoice has no outstanding due.",
      );
    }

    if (
      amount >
      currentDue
    ) {
      throw new PaymentError(
        `Payment cannot exceed the outstanding due of ৳${currentDue}.`,
      );
    }

    /* =====================================================
       CURRENT USER
    ===================================================== */

    const userId =
      await getCurrentUserId(
        connection,
      );

    /* =====================================================
       NEW BALANCE
    ===================================================== */

    const newPaidAmount =
      roundMoney(
        currentPaid +
          amount,
      );

    let newDueAmount =
      roundMoney(
        currentDue -
          amount,
      );

    /*
     * Handle tiny decimal rounding residue.
     */
    if (
      Math.abs(
        newDueAmount,
      ) < 0.01
    ) {
      newDueAmount = 0;
    }

    if (
      newDueAmount < 0
    ) {
      throw new PaymentError(
        "Payment exceeds outstanding due.",
      );
    }

    if (
      newPaidAmount >
      grandTotal + 0.01
    ) {
      throw new PaymentError(
        "Payment exceeds invoice total.",
      );
    }

    const newPaymentStatus:
      | "PAID"
      | "PARTIAL" =
      newDueAmount === 0
        ? "PAID"
        : "PARTIAL";

    /* =====================================================
       PAYMENT AUDIT RECORD
    ===================================================== */

    const [paymentResult] =
      await connection.execute<
        ResultSetHeader
      >(
        `
          INSERT INTO payments
          (
            sale_id,
            amount,
            payment_method,
            transaction_reference,
            received_by,
            notes
          )
          VALUES
          (?, ?, ?, ?, ?, ?)
        `,
        [
          sale.id,

          amount,

          paymentMethod,

          transactionReference ||
            null,

          userId,

          notes || null,
        ],
      );

    /* =====================================================
       UPDATE SALE
    ===================================================== */

    await connection.execute(
      `
        UPDATE sales

        SET
          paid_amount = ?,
          due_amount = ?,
          payment_status = ?

        WHERE id = ?
      `,
      [
        newPaidAmount,

        newDueAmount,

        newPaymentStatus,

        sale.id,
      ],
    );

    await connection.commit();

    transactionStarted =
      false;

    return NextResponse.json(
      {
        success: true,

        message:
          newDueAmount === 0
            ? "Invoice fully paid."
            : "Payment collected successfully.",

        data: {
          paymentId:
            paymentResult.insertId,

          invoice:
            invoiceNo,

          amountReceived:
            amount,

          paidAmount:
            newPaidAmount,

          dueAmount:
            newDueAmount,

          paymentStatus:
            newPaymentStatus,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error(
      "Collect payment error:",
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

    if (
      error instanceof
      PaymentError
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
        },
        {
          status:
            error.status,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to collect payment.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}