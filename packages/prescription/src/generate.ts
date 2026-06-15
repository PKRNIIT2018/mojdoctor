export interface PrescriptionData {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  validUntil?: string;
  issuedAt: Date;
  prescriptionId: string;
  doctorCredentials?: string;
}

export async function generatePrescriptionPdf(data: PrescriptionData): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 40, left: 50, right: 50 },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const leftMargin = 50;
  let y = 40;

  doc.fontSize(22).font("Helvetica-Bold").text("PRESCRIPTION", leftMargin, y, { align: "center" });
  y += 40;

  doc.moveTo(leftMargin, y).lineTo(545, y).stroke("#333");
  y += 20;

  doc.fontSize(10).font("Helvetica");
  doc.text(`Issued: ${data.issuedAt.toLocaleDateString()}`, leftMargin, y);
  doc.text(`Ref: ${data.prescriptionId}`, { align: "right" });
  y += 30;

  doc.fontSize(12).font("Helvetica-Bold").text("Patient Information", leftMargin, y);
  y += 18;
  doc.fontSize(10).font("Helvetica");
  doc.text(`Name: ${data.patientName}`, leftMargin, y);
  y += 14;
  doc.text(`Email: ${data.patientEmail}`, leftMargin, y);
  y += 30;

  doc.fontSize(12).font("Helvetica-Bold").text("Prescribing Doctor", leftMargin, y);
  y += 18;
  doc.fontSize(10).font("Helvetica");
  doc.text(`Dr. ${data.doctorName}`, leftMargin, y);
  y += 14;
  if (data.doctorCredentials) {
    doc.text(data.doctorCredentials, leftMargin, y);
    y += 20;
  } else {
    y += 6;
  }
  y += 10;

  doc.moveTo(leftMargin, y).lineTo(545, y).stroke("#ccc");
  y += 20;

  doc.fontSize(14).font("Helvetica-Bold").text("Medication", leftMargin, y);
  y += 24;

  doc.fontSize(11).font("Helvetica");
  doc.text(data.medicationName, leftMargin, y, { underline: true });
  y += 20;

  doc.fontSize(10).font("Helvetica");
  doc.text(`Dosage: ${data.dosage}`, leftMargin, y);
  y += 18;

  if (data.instructions) {
    doc.text(`Instructions: ${data.instructions}`, leftMargin, y, {
      width: 500,
      align: "left",
    });
    y += 30;
  } else {
    y += 12;
  }

  if (data.validUntil) {
    doc.text(`Valid until: ${data.validUntil}`, leftMargin, y);
    y += 18;
  }

  y += 20;
  doc.moveTo(leftMargin, y).lineTo(545, y).stroke("#ccc");
  y += 30;

  doc.fontSize(8).font("Helvetica").fillColor("#666");
  doc.text("This is an electronically generated prescription.", leftMargin, y, { align: "center" });
  doc.text("Digital signature verification available upon request.", leftMargin, y + 12, {
    align: "center",
  });

  doc.end();
  return done;
}
