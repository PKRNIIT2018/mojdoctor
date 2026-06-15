import { Injectable, Inject } from "@nestjs/common";
import { sql } from "kysely";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class AdminService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async getOverview() {
    const db = this.database.db;

    const [
      doctorCount,
      bookingCount,
      patientRows,
      revenueRow,
      statusRows,
      recentBookings,
      doctors,
    ] = await Promise.all([
      db.selectFrom("doctor").select(db.fn.countAll<number>().as("count")).executeTakeFirst(),
      db.selectFrom("booking").select(db.fn.countAll<number>().as("count")).executeTakeFirst(),
      db.selectFrom("booking").select("patient_email").distinct().execute(),
      db
        .selectFrom("payment")
        .select(db.fn.sum<number>("amount").as("total"))
        .where("status", "=", "succeeded")
        .executeTakeFirst(),
      db
        .selectFrom("booking")
        .select(["status", db.fn.countAll<number>().as("count")])
        .groupBy("status")
        .execute(),
      db
        .selectFrom("booking")
        .innerJoin("doctor", "doctor.id", "booking.doctor_id")
        .select([
          "booking.id",
          "booking.patient_name",
          "booking.patient_email",
          "booking.status",
          "booking.created_at",
          "booking.doctor_id",
          "doctor.name as doctor_name",
        ])
        .orderBy("booking.created_at", "desc")
        .limit(10)
        .execute(),
      db
        .selectFrom("doctor")
        .select([
          "doctor.id",
          "doctor.name",
          "doctor.email",
          "doctor.specialty",
          "doctor.created_at",
        ])
        .orderBy("doctor.created_at", "desc")
        .execute(),
    ]);

    const uniquePatients = patientRows.length;
    const totalRevenue = Number(revenueRow?.total ?? 0);
    const statusCounts = statusRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});

    const bookingCountByDoctor = await db
      .selectFrom("booking")
      .select(["doctor_id", db.fn.countAll<number>().as("count")])
      .groupBy("doctor_id")
      .execute();

    const bookingMap = bookingCountByDoctor.reduce<Record<string, number>>((acc, row) => {
      acc[row.doctor_id] = Number(row.count);
      return acc;
    }, {});

    return {
      doctorCount: Number(doctorCount?.count ?? 0),
      bookingCount: Number(bookingCount?.count ?? 0),
      uniquePatients,
      totalRevenue,
      statusCounts,
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        patient_name: b.patient_name,
        patient_email: b.patient_email,
        status: b.status,
        created_at: b.created_at,
        doctor_id: b.doctor_id,
        doctor: b.doctor_name ? { name: b.doctor_name } : null,
      })),
      doctors: doctors.map((d) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        specialty: d.specialty,
        created_at: d.created_at,
        bookingCount: bookingMap[d.id] ?? 0,
      })),
    };
  }

  async getRevenueTrend() {
    const { rows } = await sql<{ month: string; total: number }>`
      SELECT to_char(captured_at, 'YYYY-MM') as month, SUM(amount) as total
      FROM payment
      WHERE status = 'succeeded' AND captured_at >= now() - interval '12 months'
      GROUP BY month ORDER BY month ASC
    `.execute(this.database.db);

    return rows.map((r) => ({ month: r.month, revenue: Number(r.total ?? 0) }));
  }

  async getBookingTrend() {
    const { rows } = await sql<{ month: string; count: number }>`
      SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM booking
      WHERE created_at >= now() - interval '12 months'
      GROUP BY month ORDER BY month ASC
    `.execute(this.database.db);

    return rows.map((r) => ({ month: r.month, bookings: Number(r.count) }));
  }
}
