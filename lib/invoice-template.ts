import { formatEuro } from './format-invoice'

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  paymentTerms: string
  amount: number
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const formattedAmount = formatEuro(data.amount)
  const formattedZero = formatEuro(0)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${data.invoiceNumber} — LR Consulting</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #2c3e50;
    background: #ffffff;
    width: 210mm;
    height: 297mm;
    margin: 0 auto;
    font-size: 12px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    padding: 12mm;
    height: 297mm;
    display: flex;
    flex-direction: column;
  }
  .label {
    font-size: 9px;
    font-weight: 700;
    color: #888888;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
</style>
</head>
<body>
<div class="page">

  <!-- ===== 1. HEADER ===== -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
    <table><tr>
      <td style="width:40px;height:40px;background-color:#192a45;color:#ffffff;font-family:'Didot','Bodoni MT','Book Antiqua','Palatino',serif;font-size:19px;font-weight:400;font-style:normal;text-align:center;vertical-align:middle;border-radius:6px;letter-spacing:3px">LR</td>
      <td style="padding-left:12px;vertical-align:middle">
        <div style="font-size:18px;font-weight:700;color:#192a45">LR Consulting</div>
        <div style="font-size:10px;color:#888">C.R. Number: 190710 - 1</div>
      </td>
    </tr></table>
    <div style="text-align: right;">
      <div style="font-size: 28px; font-weight: 800; color: #192a45; letter-spacing: 1px; line-height: 1;">INVOICE</div>
      <div style="margin-top: 6px;">
        <span style="display: inline-block; background-color: #192a45; color: #ffffff; font-size: 16px; font-weight: 700; padding: 4px 16px; border-radius: 4px;">#${data.invoiceNumber}</span>
      </div>
    </div>
  </div>

  <!-- ===== 2. DATES ROW ===== -->
  <div style="display: flex; justify-content: space-between; background-color: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 16px; margin-bottom: 12px;">
    <div style="flex: 1; padding-right: 16px; border-right: 1px solid #e0e0e0;">
      <div class="label" style="margin-bottom: 3px;">Invoice Date</div>
      <div style="font-size: 13px; font-weight: 600; color: #192a45;">${data.invoiceDate}</div>
    </div>
    <div style="flex: 1; padding: 0 16px; border-right: 1px solid #e0e0e0;">
      <div class="label" style="margin-bottom: 3px;">Due Date</div>
      <div style="font-size: 13px; font-weight: 600; color: #192a45;">${data.dueDate}</div>
    </div>
    <div style="flex: 1; padding-left: 16px;">
      <div class="label" style="margin-bottom: 3px;">Payment Terms</div>
      <div style="font-size: 13px; font-weight: 600; color: #192a45;">${data.paymentTerms}</div>
    </div>
  </div>

  <!-- ===== 3. FROM / BILL TO ===== -->
  <div style="display: flex; gap: 12px; margin-bottom: 12px;">
    <div style="flex: 1; border: 1px solid #e0e0e0; border-radius: 4px; padding: 16px; position: relative;">
      <div style="background-color: #f1f5f9; padding: 6px 12px; font-size: 10px; font-weight: 700; color: #888888; letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid #e0e0e0; margin: -16px -16px 12px -16px;">From</div>
      <div style="font-size: 12px; font-weight: 700; color: #192a45; margin-bottom: 4px;">LR Consulting W.L.L</div>
      <div style="font-size: 10px; color: #666666; line-height: 1.6;">
        Bldg. 40, Road 1701, Block 317<br>
        Diplomatic Area<br>
        Kingdom of Bahrain<br>
        C.R. Number: 190710 - 1<br>
        ladislas2005@gmail.com<br>
        +973 3400 8825
      </div>
    </div>
    <div style="flex: 1; border: 1px solid #e0e0e0; border-radius: 4px; padding: 16px; position: relative;">
      <div style="background-color: #f1f5f9; padding: 6px 12px; font-size: 10px; font-weight: 700; color: #888888; letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid #e0e0e0; margin: -16px -16px 12px -16px;">Bill To</div>
      <div style="font-size: 12px; font-weight: 700; color: #192a45; margin-bottom: 4px;">ECODISTRIB</div>
      <div style="font-size: 10px; color: #666666; line-height: 1.6;">
        29 Rue Pradier<br>
        92410 Ville-d'Avray<br>
        France<br>
        SIREN: 903 879 492
      </div>
    </div>
  </div>

  <!-- ===== 4. SERVICES PROVIDED ===== -->
  <div style="margin-bottom: 4px;">
    <div style="font-size: 13px; font-weight: 700; color: #192a45; margin-bottom: 8px;">Services Provided</div>
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="text-align: left; padding: 10px; font-size: 11px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">Description</th>
          <th style="text-align: center; padding: 10px; font-size: 11px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; width: 60px;">Qty</th>
          <th style="text-align: right; padding: 10px; font-size: 11px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; width: 110px;">Unit Price</th>
          <th style="text-align: right; padding: 10px; font-size: 11px; font-weight: 700; color: #666666; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e0e0e0; width: 110px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 10px; font-size: 11px; color: #2c3e50; border-right: 1px solid #e0e0e0;">Commercial advisory services</td>
          <td style="padding: 10px; font-size: 11px; color: #2c3e50; text-align: center; border-right: 1px solid #e0e0e0;">1</td>
          <td style="padding: 10px; font-size: 11px; color: #2c3e50; text-align: right; border-right: 1px solid #e0e0e0;">${formattedAmount}</td>
          <td style="padding: 10px; font-size: 11px; color: #2c3e50; text-align: right;">${formattedAmount}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ===== TOTALS ===== -->
  <div style="display: flex; justify-content: flex-end; margin-bottom: 6px;">
    <div style="width: 280px;">
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 10px;">
        <span style="color: #666666;">Subtotal</span>
        <span style="font-weight: 600; color: #2c3e50;">${formattedAmount}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 10px; border-bottom: 1px solid #e0e0e0;">
        <span style="color: #666666;">VAT (0%)</span>
        <span style="font-weight: 600; color: #2c3e50;">${formattedZero}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; margin-top: 6px; background: #192a45; border-radius: 4px; width: 100%;">
        <span style="font-size: 13px; font-weight: 700; color: #ffffff; white-space: nowrap;">Total Amount Due</span>
        <span style="font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1; white-space: nowrap;">${formattedAmount}</span>
      </div>
    </div>
  </div>

  <!-- ===== 5. VAT NOTE ===== -->
  <div style="font-size: 10px; color: #888888; font-style: italic; margin-bottom: 12px; text-align: right;">
    VAT not applicable - Services provided outside Bahrain
  </div>

  <!-- ===== 6. PAYMENT INFORMATION ===== -->
  <div style="margin-bottom: 12px;">
    <div style="border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden;">
      <div style="background-color: #f1f5f9; padding: 8px 16px; font-weight: 700; font-size: 12px; color: #192a45; border-bottom: 1px solid #e0e0e0;">PAYMENT INFORMATION</div>
      <div style="display: flex; border-bottom: 1px solid #e0e0e0;">
        <div style="flex: 1; padding: 10px 14px; border-right: 1px solid #e0e0e0;">
          <div class="label" style="margin-bottom: 3px;">Bank</div>
          <div style="font-size: 12px; font-weight: 600; color: #192a45;">Al Salam Bank</div>
        </div>
        <div style="flex: 1; padding: 10px 14px;">
          <div class="label" style="margin-bottom: 3px;">Account Name</div>
          <div style="font-size: 12px; font-weight: 600; color: #192a45;">LR CONSULTING W.L.L</div>
        </div>
      </div>
      <div style="display: flex;">
        <div style="flex: 1; padding: 10px 14px; border-right: 1px solid #e0e0e0;">
          <div class="label" style="margin-bottom: 3px;">IBAN</div>
          <div style="font-size: 12px; font-weight: 600; color: #192a45;">BH32ALSA00387049100101</div>
        </div>
        <div style="flex: 1; padding: 10px 14px;">
          <div class="label" style="margin-bottom: 3px;">SWIFT/BIC</div>
          <div style="font-size: 12px; font-weight: 600; color: #192a45;">ALSABHBM</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== 7. THANK YOU ===== -->
  <div style="text-align: center; font-size: 14px; font-style: italic; color: #888888; flex-grow: 1; display: flex; align-items: center; justify-content: center;">
    Thank you for your business.
  </div>

  <!-- ===== 8. FOOTER ===== -->
  <div style="border-top: 2px solid #192a45; padding-top: 12px; text-align: center;">
    <div style="font-size: 12px; font-weight: 700; color: #192a45; margin-bottom: 2px;">LR Consulting W.L.L</div>
    <div style="font-size: 9px; color: #888888; line-height: 1.6;">
      C.R. Number: 190710 - 1 &nbsp;|&nbsp; Bldg. 40, Road 1701, Block 317, Diplomatic Area, Kingdom of Bahrain<br>
      +973 3400 8825 &nbsp;|&nbsp; ladislas2005@gmail.com
    </div>
  </div>

</div>
</body>
</html>`
}
