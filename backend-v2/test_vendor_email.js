const nodemailer = require('nodemailer');

async function testVendorEmail() {
  const vendorEmail = 'nvdia@gmail.com'; // from DB
  const vendorName = 'NVIDIA';
  const poNo = '2026-GRI/PO/73';

  console.log(`Attempting to send PO email to: ${vendorEmail}`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'genroboticstest@gmail.com',
      pass: 'aknd bfpf ninn ptab'
    }
  });

  try {
    const info = await transporter.sendMail({
      from: '"Genrobotic ERP" <genroboticstest@gmail.com>',
      to: vendorEmail,
      subject: `Purchase Order Request: ${poNo} from Genrobotic Innovations`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #1e3a8a;">PURCHASE ORDER</h2>
          <p>Dear <strong>${vendorName}</strong>,</p>
          <p>We are pleased to place an order with your company. Please find the details of <strong>Purchase Order #${poNo}</strong> below.</p>
          <table style="width:100%; border-collapse:collapse; margin:20px 0;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0;">
                <th style="text-align:left; padding:10px;">Item</th>
                <th style="text-align:right; padding:10px;">Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding:10px;">Test Item A</td><td style="text-align:right; padding:10px;">5 Nos</td></tr>
            </tbody>
          </table>
          <p>Kindly acknowledge this order at your earliest convenience.</p>
          <p style="color:#1e3a8a; font-weight:700;">Genrobotic Procurement Team</p>
        </div>
      `
    });

    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', info.messageId);
    console.log('Accepted by:', info.accepted);
  } catch (err) {
    console.error('❌ EMAIL FAILED:', err.message);
  }

  process.exit(0);
}

testVendorEmail();
