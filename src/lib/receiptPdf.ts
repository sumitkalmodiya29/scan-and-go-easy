import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  size?: string | null;
}

export interface ReceiptData {
  orderId: string;
  total: number;
  items: ReceiptItem[];
  createdAt: string;
  customerName?: string;
  storeName?: string;
}

const GST_RATE = 0.05; // 5% GST split half CGST half SGST

export const generateReceiptPDF = (data: ReceiptData) => {
  const doc = new jsPDF({ unit: "mm", format: [80, 200 + data.items.length * 6] });
  const w = 80;
  let y = 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.storeName ?? "ScanGo Retail", w / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Self-Checkout Digital Receipt", w / 2, y, { align: "center" });
  y += 4;
  doc.text("GSTIN: 27ABCDE1234F1Z5", w / 2, y, { align: "center" });
  y += 4;
  doc.text("Mumbai, IN", w / 2, y, { align: "center" });
  y += 4;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, w - 4, y);
  y += 4;

  doc.setFontSize(8);
  doc.text(`Order: #${data.orderId.slice(0, 8).toUpperCase()}`, 4, y);
  y += 3.5;
  doc.text(`Date: ${new Date(data.createdAt).toLocaleString()}`, 4, y);
  y += 3.5;
  if (data.customerName) { doc.text(`Customer: ${data.customerName}`, 4, y); y += 3.5; }
  doc.line(4, y, w - 4, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Item", 4, y);
  doc.text("Qty", 48, y);
  doc.text("Amt", w - 4, y, { align: "right" });
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.line(4, y, w - 4, y);
  y += 3.5;

  data.items.forEach((it) => {
    const name = it.size ? `${it.name} (${it.size})` : it.name;
    const truncated = name.length > 24 ? name.slice(0, 23) + "…" : name;
    doc.text(truncated, 4, y);
    doc.text(String(it.quantity), 48, y);
    doc.text(`Rs.${(it.price * it.quantity).toFixed(2)}`, w - 4, y, { align: "right" });
    y += 4;
  });

  doc.line(4, y, w - 4, y);
  y += 4;

  const subtotal = data.total / (1 + GST_RATE);
  const gst = data.total - subtotal;
  const cgst = gst / 2;

  doc.text("Subtotal", 4, y);
  doc.text(`Rs.${subtotal.toFixed(2)}`, w - 4, y, { align: "right" }); y += 3.5;
  doc.text(`CGST 2.5%`, 4, y);
  doc.text(`Rs.${cgst.toFixed(2)}`, w - 4, y, { align: "right" }); y += 3.5;
  doc.text(`SGST 2.5%`, 4, y);
  doc.text(`Rs.${cgst.toFixed(2)}`, w - 4, y, { align: "right" }); y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL", 4, y);
  doc.text(`Rs.${data.total.toFixed(2)}`, w - 4, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Paid via UPI / Card (mock)", w / 2, y, { align: "center" });
  y += 5;

  // Barcode
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, data.orderId.slice(0, 12).toUpperCase(), {
      format: "CODE128", width: 1.4, height: 36, displayValue: true, fontSize: 10, margin: 0,
    });
    const img = canvas.toDataURL("image/png");
    doc.addImage(img, "PNG", 10, y, 60, 14);
    y += 18;
  } catch { /* ignore */ }

  doc.setFontSize(7);
  doc.text("Thank you for shopping with ScanGo!", w / 2, y, { align: "center" });
  y += 3;
  doc.text("Show exit QR within 10 minutes.", w / 2, y, { align: "center" });

  doc.save(`ScanGo-Receipt-${data.orderId.slice(0, 8).toUpperCase()}.pdf`);
};
