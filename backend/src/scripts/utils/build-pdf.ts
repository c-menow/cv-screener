import PDFDocument from "pdfkit";
import type { CvData } from "../../types";

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.3);
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#222")
    .text(title.toUpperCase());
  doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).strokeColor("#ddd").stroke();
  doc.moveDown(0.4);
  doc.font("Helvetica").fillColor("#000");
}

export async function buildPdf(
  cvData: CvData,
  avatarBuffer?: Buffer | null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    if (avatarBuffer) {
      doc.image(avatarBuffer, 50, 50, { width: 80, height: 80 });
      doc.fontSize(20).text(cvData.name, 145, 55);
      doc.fontSize(12).fillColor("#666").text(cvData.title, 145, 78);
    } else {
      doc.fontSize(20).text(cvData.name);
      doc.fontSize(12).fillColor("#666").text(cvData.title);
    }
    doc.moveDown(3);
    doc.fillColor("#000");

    // Contact
    const c = cvData.contact || {};
    doc
      .fontSize(10)
      .fillColor("#444")
      .text(
        [c.email, c.phone, c.location, c.linkedin]
          .filter(Boolean)
          .join("   |   "),
      );
    doc.moveDown(1.5);
    doc.fillColor("#000");

    // Summary
    sectionHeader(doc, "Summary");
    doc.fontSize(10).text(cvData.summary);
    doc.moveDown(1);

    // Experience
    sectionHeader(doc, "Work Experience");
    for (const job of cvData.experience) {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`${job.role} — ${job.company}`, { continued: true });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#666")
        .text(`   ${job.dates}`, { align: "right" });
      doc.fillColor("#000").font("Helvetica").fontSize(10);
      for (const bullet of job.description) doc.text(`• ${bullet}`);
      doc.moveDown(0.7);
    }

    // Education
    sectionHeader(doc, "Education");
    for (const edu of cvData.education) {
      doc.fontSize(10).text(`${edu.degree}, ${edu.institution} (${edu.dates})`);
    }
    doc.moveDown(1);

    // Skills
    sectionHeader(doc, "Skills");
    doc.fontSize(10).text(cvData.skills.join("  •  "));

    doc.end();
  });
}
