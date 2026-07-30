const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'genroboticstest@gmail.com',
    pass: 'aknd bfpf ninn ptab'
  }
});

const sendEmailNotification = async (toEmail, subject, text) => {
  try {
    console.log(`[MOCK SMTP] Prevented sending email to ${toEmail}. Subject: ${subject}`);
    /*
    const info = await transporter.sendMail({
      from: '"Gen ERP Notifications" <genroboticstest@gmail.com>',
      to: toEmail,
      subject: subject,
      text: text,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
               <h2 style="color: #0f172a;">Gen ERP Notification</h2>
               <p style="font-size: 16px; line-height: 1.5;">${text}</p>
               <br>
               <p style="font-size: 12px; color: #64748b;">This is an automated notification from your Gen ERP Dashboard.</p>
             </div>`
    });
    console.log(`Email sent to ${toEmail}: ${info.messageId}`);
    */
  } catch (err) {
    console.error(`Failed to send email to ${toEmail}:`, err);
  }
};

module.exports = {
  sendEmailNotification
};
