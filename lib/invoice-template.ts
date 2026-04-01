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
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1a2332;
    background: #ffffff;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    position: relative;
    font-size: 13px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
</head>
<body>
<!-- ===== MAIN CONTAINER ===== -->
<div style="padding: 48px 52px 32px 52px; min-height: 297mm; display: flex; flex-direction: column;">

  <!-- ===== HEADER ===== -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
    <!-- Left: Logo + Company -->
    <div style="display: flex; align-items: center; gap: 14px;">
      <div style="width: 52px; height: 52px; background: #1a2332; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
        <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 1px;">LR</span>
      </div>
      <div>
        <div style="font-size: 20px; font-weight: 700; color: #1a2332; letter-spacing: 0.3px;">LR Consulting</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 1px;">C.R. Number: 190710 - 1</div>
      </div>
    </div>
    <!-- Right: INVOICE title + badge -->
    <div style="text-align: right;">
      <div style="font-size: 36px; font-weight: 800; color: #1a2332; letter-spacing: 1px; line-height: 1;">INVOICE</div>
      <div style="margin-top: 8px;">
        <span style="display: inline-block; background: #1a2332; color: #ffffff; font-size: 13px; font-weight: 600; padding: 4px 14px; border-radius: 4px; letter-spacing: 0.5px;">#${data.invoiceNumber}</span>
      </div>
    </div>
  </div>

  <!-- ===== DATE ROW ===== -->
  <div style="display: flex; gap: 0; margin-bottom: 32px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <div style="flex: 1; padding: 14px 20px; border-right: 1px solid #e5e7eb;">
      <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Invoice Date</div>
      <div style="font-size: 14px; font-weight: 600; color: #1a2332;">${data.invoiceDate}</div>
    </div>
    <div style="flex: 1; padding: 14px 20px; border-right: 1px solid #e5e7eb;">
      <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Due Date</div>
      <div style="font-size: 14px; font-weight: 600; color: #1a2332;">${data.dueDate}</div>
    </div>
    <div style="flex: 1; padding: 14px 20px;">
      <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Payment Terms</div>
      <div style="font-size: 14px; font-weight: 600; color: #1a2332;">${data.paymentTerms}</div>
    </div>
  </div>

  <!-- ===== FROM / BILL TO ===== -->
  <div style="display: flex; gap: 32px; margin-bottom: 36px;">
    <!-- FROM -->
    <div style="flex: 1;">
      <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">From</div>
      <div style="font-size: 14px; font-weight: 700; color: #1a2332; margin-bottom: 4px;">LR Consulting W.L.L</div>
      <div style="font-size: 12.5px; color: #4b5563; line-height: 1.7;">
        Bldg. 40, Road 1701, Block 317<br>
        Diplomatic Area<br>
        Kingdom of Bahrain<br>
        C.R. Number: 190710 - 1<br>
        ladislas2005@gmail.com<br>
        +973 3400 8825
      </div>
    </div>
    <!-- BILL TO -->
    <div style="flex: 1;">
      <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Bill To</div>
      <div style="font-size: 14px; font-weight: 700; color: #1a2332; margin-bottom: 4px;">ECODISTRIB</div>
      <div style="font-size: 12.5px; color: #4b5563; line-height: 1.7;">
        29 Rue Pradier<br>
        92410 Ville-d'Avray<br>
        France<br>
        SIREN: 903 879 492
      </div>
    </div>
  </div>

  <!-- ===== TABLE ===== -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <thead>
      <tr style="background: #f3f4f6;">
        <th style="text-align: left; padding: 12px 16px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e5e7eb;">Description</th>
        <th style="text-align: center; padding: 12px 16px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e5e7eb; width: 80px;">Qty</th>
        <th style="text-align: right; padding: 12px 16px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e5e7eb; width: 130px;">Unit Price</th>
        <th style="text-align: right; padding: 12px 16px; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e5e7eb; width: 130px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 16px; font-size: 13px; color: #1a2332; border-bottom: 1px solid #e5e7eb;">Commercial advisory services</td>
        <td style="padding: 16px; font-size: 13px; color: #1a2332; text-align: center; border-bottom: 1px solid #e5e7eb;">1</td>
        <td style="padding: 16px; font-size: 13px; color: #1a2332; text-align: right; border-bottom: 1px solid #e5e7eb;">${formattedAmount}</td>
        <td style="padding: 16px; font-size: 13px; color: #1a2332; text-align: right; border-bottom: 1px solid #e5e7eb;">${formattedAmount}</td>
      </tr>
    </tbody>
  </table>

  <!-- ===== TOTALS ===== -->
  <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
    <div style="width: 300px;">
      <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px;">
        <span style="color: #6b7280;">Subtotal</span>
        <span style="font-weight: 600; color: #1a2332;">${formattedAmount}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #e5e7eb;">
        <span style="color: #6b7280;">VAT (0%)</span>
        <span style="font-weight: 600; color: #1a2332;">${formatEuro(0)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; margin-top: 8px; background: #1a2332; border-radius: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Total Amount Due</span>
        <span style="font-size: 20px; font-weight: 800; color: #ffffff;">${formattedAmount}</span>
      </div>
    </div>
  </div>

  <!-- ===== VAT NOTE ===== -->
  <div style="font-size: 11px; color: #6b7280; font-style: italic; margin-bottom: 32px; padding: 10px 14px; background: #f9fafb; border-radius: 6px; border-left: 3px solid #e5e7eb;">
    VAT not applicable - Services provided outside Bahrain
  </div>

  <!-- ===== PAYMENT INFO ===== -->
  <div style="margin-bottom: 32px;">
    <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Payment Information</div>
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; font-size: 12.5px; color: #6b7280; width: 140px;">Bank Name</td>
          <td style="padding: 4px 0; font-size: 12.5px; font-weight: 600; color: #1a2332;">Al Salam Bank</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 12.5px; color: #6b7280;">Account Name</td>
          <td style="padding: 4px 0; font-size: 12.5px; font-weight: 600; color: #1a2332;">LR CONSULTING W.L.L</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 12.5px; color: #6b7280;">IBAN</td>
          <td style="padding: 4px 0; font-size: 12.5px; font-weight: 600; color: #1a2332;">BH32ALSA00387049100101</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 12.5px; color: #6b7280;">SWIFT Code</td>
          <td style="padding: 4px 0; font-size: 12.5px; font-weight: 600; color: #1a2332;">ALSABHBM</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- ===== THANK YOU ===== -->
  <div style="text-align: center; font-size: 15px; font-style: italic; color: #6b7280; margin-bottom: 24px; flex-grow: 1; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 24px;">
    Thank you for your business.
  </div>

  <!-- ===== FOOTER ===== -->
  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
    <div style="font-size: 11px; color: #9ca3af; line-height: 1.8;">
      <span style="font-weight: 600;">LR Consulting W.L.L</span> &nbsp;·&nbsp; C.R. Number: 190710 - 1<br>
      Bldg. 40, Road 1701, Block 317, Diplomatic Area, Kingdom of Bahrain<br>
      ladislas2005@gmail.com &nbsp;·&nbsp; +973 3400 8825
    </div>
  </div>

</div>
</body>
</html>`
}
