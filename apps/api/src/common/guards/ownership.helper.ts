import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { DatabaseService } from "../../database/database.service";

type OwnershipConfig = {
  table: string;
  notFound: string;
  join?: {
    leftTable: string;
    leftCol: string;
    rightCol: string;
    selectCol: string;
    whereCol: string;
  };
};

// ponytail: as any on db queries — Kysely table names are strongly typed, these are runtime config strings
const OWNERSHIP_MAP: Record<string, OwnershipConfig> = {
  booking: { table: "booking", notFound: "Booking not found" },
  case_file: { table: "case_file", notFound: "Case file not found" },
  note: {
    table: "doctor_note",
    notFound: "Note not found",
    join: {
      leftTable: "case_file",
      leftCol: "case_file.id",
      rightCol: "doctor_note.case_file_id",
      selectCol: "case_file.doctor_id",
      whereCol: "doctor_note.id",
    },
  },
  payment: {
    table: "payment",
    notFound: "Payment not found",
    join: {
      leftTable: "booking",
      leftCol: "booking.id",
      rightCol: "payment.booking_id",
      selectCol: "booking.doctor_id",
      whereCol: "payment.id",
    },
  },
  document: {
    table: "case_file_document",
    notFound: "Document not found",
    join: {
      leftTable: "case_file",
      leftCol: "case_file.id",
      rightCol: "case_file_document.case_file_id",
      selectCol: "case_file.doctor_id",
      whereCol: "case_file_document.id",
    },
  },
};

export async function assertOwnership(
  db: DatabaseService,
  type: keyof typeof OWNERSHIP_MAP,
  entityId: string,
  doctorId: string
): Promise<void> {
  const cfg = OWNERSHIP_MAP[type];
  if (!cfg) {
    throw new NotFoundException(`${type} not found`);
  }

  let row: { doctor_id: string } | undefined;
  if (cfg.join) {
    row = await (db.db as any)
      .selectFrom(cfg.table)
      .innerJoin(cfg.join.leftTable, cfg.join.leftCol, cfg.join.rightCol)
      .select(cfg.join.selectCol)
      .where(cfg.join.whereCol, "=", entityId)
      .executeTakeFirst();
  } else {
    row = await (db.db as any)
      .selectFrom(cfg.table)
      .select("doctor_id")
      .where("id", "=", entityId)
      .executeTakeFirst();
  }

  if (!row) throw new NotFoundException(cfg.notFound);
  if (row.doctor_id !== doctorId) throw new ForbiddenException();
}
