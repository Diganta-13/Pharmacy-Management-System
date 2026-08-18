import {
  randomUUID,
} from "crypto";

import {
  NextResponse,
} from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

import {
  requireAdmin,
} from "@/lib/current-user";

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

type AdjustmentType =
  | "increase"
  | "decrease";

type BatchStatus =
  | "ACTIVE"
  | "DEPLETED"
  | "EXPIRED"
  | "BLOCKED";

interface BatchRow
  extends RowDataPacket {
  id: number;

  medicine_id: number;

  batch_no: string;

  expiry_date: string;

  current_quantity_base:
    | number
    | string;

  status: BatchStatus;
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
            "Administrator access is required to adjust stock.",
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
   POST
   /api/stock/adjust

   ADMIN ONLY

   Pharmacist:
   - may view stock
   - cannot manually increase/decrease stock

   Admin:
   - may perform manual adjustment
   - reason is mandatory
   - every adjustment is audited
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

       Do this BEFORE any stock mutation.
    ===================================================== */

    const currentAdmin =
      await requireAdmin(
        connection,
      );

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    let body: {
      batchId?: unknown;

      type?: unknown;

      quantity?: unknown;

      reason?: unknown;
    };

    try {
      body =
        (await request.json()) as {
          batchId?: unknown;

          type?: unknown;

          quantity?: unknown;

          reason?: unknown;
        };
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
       NORMALIZE INPUT
    ===================================================== */

    const batchId =
      Number(
        body.batchId,
      );

    const type =
      body.type;

    const quantity =
      Number(
        body.quantity,
      );

    const reason =
      typeof body.reason ===
      "string"
        ? body.reason.trim()
        : "";

    /* =====================================================
       VALIDATE BATCH
    ===================================================== */

    if (
      !Number.isInteger(
        batchId,
      ) ||
      batchId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid batch.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       VALIDATE TYPE
    ===================================================== */

    if (
      type !== "increase" &&
      type !== "decrease"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid adjustment type.",
        },
        {
          status: 400,
        },
      );
    }

    const adjustmentType:
      AdjustmentType =
      type;

    /* =====================================================
       VALIDATE QUANTITY
    ===================================================== */

    if (
      !Number.isInteger(
        quantity,
      ) ||
      quantity <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Quantity must be a positive whole number.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       VALIDATE REASON
    ===================================================== */

    if (!reason) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Adjustment reason is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      reason.length >
      255
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Adjustment reason cannot exceed 255 characters.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       LOCK BATCH

       FOR UPDATE prevents two stock adjustments
       from modifying the same batch simultaneously.
    ===================================================== */

    const [rows] =
      await connection.execute<
        BatchRow[]
      >(
        `
          SELECT
            id,

            medicine_id,

            batch_no,

            DATE_FORMAT(
              expiry_date,
              '%Y-%m-%d'
            ) AS expiry_date,

            current_quantity_base,

            status

          FROM medicine_batches

          WHERE
            id = ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          batchId,
        ],
      );

    /* =====================================================
       BATCH NOT FOUND
    ===================================================== */

    if (
      rows.length === 0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Batch not found.",
        },
        {
          status: 404,
        },
      );
    }

    const batch =
      rows[0];

    const currentQuantity =
      Number(
        batch.current_quantity_base,
      );

    if (
      !Number.isFinite(
        currentQuantity,
      ) ||
      currentQuantity < 0
    ) {
      throw new Error(
        "INVALID_BATCH_QUANTITY",
      );
    }

    /* =====================================================
       SAFETY:
       BLOCKED / EXPIRED BATCH

       Increasing stock in expired/blocked batches
       is not allowed.
    ===================================================== */

    if (
      adjustmentType ===
        "increase" &&
      (
        batch.status ===
          "BLOCKED" ||
        batch.status ===
          "EXPIRED"
      )
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Blocked or expired batch stock cannot be increased.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       SAFETY:
       STOCK CANNOT GO BELOW ZERO
    ===================================================== */

    if (
      adjustmentType ===
        "decrease" &&
      quantity >
        currentQuantity
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            `Batch ${batch.batch_no} only contains ${currentQuantity} base unit(s).`,
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       CALCULATE CHANGE
    ===================================================== */

    const quantityChange =
      adjustmentType ===
      "increase"
        ? quantity
        : -quantity;

    const newQuantity =
      currentQuantity +
      quantityChange;

    /* =====================================================
       DETERMINE NEW STATUS
    ===================================================== */

    let newStatus:
      BatchStatus =
      batch.status;

    if (
      newQuantity === 0
    ) {
      newStatus =
        "DEPLETED";
    } else if (
      adjustmentType ===
        "increase" &&
      (
        batch.status ===
          "ACTIVE" ||
        batch.status ===
          "DEPLETED"
      )
    ) {
      /*
       * A previously depleted valid batch
       * becomes ACTIVE after stock is added.
       */

      newStatus =
        "ACTIVE";
    }

    /* =====================================================
       UPDATE BATCH
    ===================================================== */

    await connection.execute(
      `
        UPDATE medicine_batches

        SET
          current_quantity_base = ?,

          status = ?

        WHERE
          id = ?
      `,
      [
        newQuantity,

        newStatus,

        batchId,
      ],
    );

    /* =====================================================
       AUDIT REFERENCE
    ===================================================== */

    const referenceNo =
      `ADJ-${randomUUID()
        .slice(
          0,
          8,
        )
        .toUpperCase()}`;

    /* =====================================================
       STOCK MOVEMENT AUDIT

       performed_by now records the ACTUAL
       authenticated administrator.
    ===================================================== */

    await connection.execute(
      `
        INSERT INTO stock_movements
        (
          medicine_id,

          batch_id,

          movement_type,

          quantity_change_base,

          reference_no,

          reason,

          performed_by
        )

        VALUES
        (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        batch.medicine_id,

        batchId,

        adjustmentType ===
        "increase"
          ? "ADJUSTMENT_IN"
          : "ADJUSTMENT_OUT",

        quantityChange,

        referenceNo,

        reason,

        currentAdmin.userId,
      ],
    );

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
          "Stock adjusted successfully.",

        data: {
          batchId,

          batchNo:
            batch.batch_no,

          previousQuantity:
            currentQuantity,

          quantityChange,

          newQuantity,

          newStatus,

          referenceNo,

          performedBy: {
            userId:
              currentAdmin.userId,

            fullName:
              currentAdmin.fullName,
          },
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    /* =====================================================
       ROLLBACK ONLY IF TRANSACTION STARTED
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
          "Stock adjustment rollback error:",
          rollbackError,
        );
      }
    }

    console.error(
      "Stock adjustment error:",
      error,
    );

    /* =====================================================
       AUTHORIZATION ERRORS
    ===================================================== */

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (authResponse) {
      return authResponse;
    }

    /* =====================================================
       INVALID DATABASE STOCK
    ===================================================== */

    if (
      error instanceof
        Error &&
      error.message ===
        "INVALID_BATCH_QUANTITY"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "The batch contains an invalid stock quantity.",
        },
        {
          status: 500,
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
          "Failed to adjust stock.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}