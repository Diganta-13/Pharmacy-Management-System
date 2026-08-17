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
  getCurrentUserId,
} from "@/lib/current-user";

/* =========================================================
   TYPES
========================================================= */

type AdjustmentType =
  | "increase"
  | "decrease";

interface BatchRow
  extends RowDataPacket {
  id: number;

  medicine_id: number;

  batch_no: string;

  expiry_date: string;

  current_quantity_base:
    | number
    | string;

  status:
    | "ACTIVE"
    | "DEPLETED"
    | "EXPIRED"
    | "BLOCKED";
}

/* =========================================================
   POST ADJUSTMENT
========================================================= */

export async function POST(
  request: Request,
) {
  const connection =
    await db.getConnection();

  try {
    const body =
      await request.json();

    const batchId =
      Number(
        body.batchId,
      );

    const type =
      body.type as
        AdjustmentType;

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
       VALIDATION
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

    await connection.beginTransaction();

    const userId =
      await getCurrentUserId(
        connection,
      );

    /* =====================================================
       LOCK BATCH
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

          WHERE id = ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          batchId,
        ],
      );

    if (
      rows.length === 0
    ) {
      await connection.rollback();

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

    /* =====================================================
       SAFETY
    ===================================================== */

    if (
      type === "increase" &&
      (
        batch.status ===
          "BLOCKED" ||
        batch.status ===
          "EXPIRED"
      )
    ) {
      await connection.rollback();

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

    if (
      type === "decrease" &&
      quantity >
        currentQuantity
    ) {
      await connection.rollback();

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

    const quantityChange =
      type === "increase"
        ? quantity
        : -quantity;

    const newQuantity =
      currentQuantity +
      quantityChange;

    let newStatus:
      | "ACTIVE"
      | "DEPLETED"
      | "EXPIRED"
      | "BLOCKED" =
      batch.status;

    if (
      newQuantity === 0
    ) {
      newStatus =
        "DEPLETED";
    } else if (
      type === "increase"
    ) {
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

        WHERE id = ?
      `,
      [
        newQuantity,

        newStatus,

        batchId,
      ],
    );

    /* =====================================================
       AUDIT MOVEMENT
    ===================================================== */

    const referenceNo =
      `ADJ-${randomUUID()
        .slice(
          0,
          8,
        )
        .toUpperCase()}`;

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

        type === "increase"
          ? "ADJUSTMENT_IN"
          : "ADJUSTMENT_OUT",

        quantityChange,

        referenceNo,

        reason,

        userId,
      ],
    );

    await connection.commit();

    return NextResponse.json({
      success: true,

      message:
        "Stock adjusted successfully.",

      data: {
        newQuantity,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "Stock adjustment error:",
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
            "Current development user was not found.",
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