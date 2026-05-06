import { toast } from "sonner";

export type LabelField = {
  label: string;
  value: string;
};

export type LabelConfig = {
  title?: string;           // e.g. "PATRIOTI MUSHROOMS"
  barcodeValue: string;     // The barcode string to encode
  fields: LabelField[];     // Info rows to display
  copies: number;           // Number of copies to print
  copyLabel?: string;       // e.g. "Box" → "Box 1 of 3"
};

/**
 * Opens a print window with barcode labels using Code 128 barcode format.
 * Uses JsBarcode CDN to render actual barcode lines.
 */
export function printLabels(config: LabelConfig) {
  const { title = "PATRIOTI MUSHROOMS", barcodeValue, fields, copies, copyLabel = "Box" } = config;

  const printWindow = window.open("", "_blank", "width=500,height=600");
  if (!printWindow) {
    toast.error("Pop-up blocked. Please allow pop-ups for printing.");
    return;
  }

  // Build pages HTML
  let pagesHtml = "";
  for (let i = 1; i <= copies; i++) {
    const fieldsHtml = fields
      .filter(f => f.value)
      .map(f => `<div class="info-row"><span class="info-label">${f.label}:</span> <span class="info-value">${f.value}</span></div>`)
      .join("\n          ");

    pagesHtml += `
      <div class="label-page">
        <div class="brand">${title}</div>
        <div class="barcode-section">
          <svg class="barcode" id="barcode-${i}"></svg>
        </div>
        <div class="info-grid">
          ${fieldsHtml}
        </div>
        ${copies > 1 ? `<div class="copy-info">${copyLabel} ${i} of ${copies}</div>` : ""}
      </div>`;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Labels - ${barcodeValue}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<style>
  @page {
    size: 100mm 60mm;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
  }
  .label-page {
    width: 100mm;
    height: 60mm;
    padding: 3mm 4mm;
    page-break-after: always;
    display: flex;
    flex-direction: column;
  }
  .label-page:last-child {
    page-break-after: auto;
  }
  .brand {
    font-size: 10pt;
    font-weight: bold;
    text-align: center;
    letter-spacing: 1px;
    margin-bottom: 1mm;
  }
  .barcode-section {
    text-align: center;
    margin-bottom: 1mm;
  }
  .barcode-section svg {
    width: 90mm;
    height: 16mm;
  }
  .info-grid {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.8mm;
  }
  .info-row {
    font-size: 8.5pt;
    line-height: 1.2;
    display: flex;
    gap: 1mm;
  }
  .info-label {
    font-weight: bold;
    color: #333;
    min-width: 18mm;
    flex-shrink: 0;
  }
  .info-value {
    color: #000;
  }
  .copy-info {
    font-size: 7pt;
    text-align: center;
    color: #666;
    border-top: 0.3mm solid #ccc;
    padding-top: 0.5mm;
    margin-top: 0.5mm;
  }
  @media screen {
    body {
      background: #f0f0f0;
      padding: 10px;
    }
    .label-page {
      background: white;
      border: 1px dashed #ccc;
      margin-bottom: 10px;
      transform: scale(2);
      transform-origin: top left;
      margin-right: 100mm;
      margin-bottom: 60mm;
    }
  }
</style></head>
<body>
  ${pagesHtml}
  <script>
    // Wait for JsBarcode to load, then render all barcodes
    function renderBarcodes() {
      for (var i = 1; i <= ${copies}; i++) {
        try {
          JsBarcode("#barcode-" + i, "${barcodeValue}", {
            format: "CODE128",
            width: 2,
            height: 40,
            displayValue: true,
            fontSize: 10,
            font: "Arial",
            textMargin: 1,
            margin: 0
          });
        } catch(e) {
          console.error("Barcode error:", e);
        }
      }
    }

    window.onload = function() {
      renderBarcodes();
      // Small delay to ensure barcodes are rendered before printing
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    };
  <\/script>
</body></html>`);
  printWindow.document.close();
}
