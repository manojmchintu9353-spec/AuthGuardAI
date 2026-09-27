const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendSecurityAlert({ toEmail, subject, heading, message, riskScore, imageBase64 }) {
  try {
    const mailOptions = {
      from: '"AuthGuardAI Security" <' + process.env.EMAIL_USER + '>',
      to: toEmail,
      subject: subject,
      html:
        '<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">' +
        '<h2 style="color: #7c3aed;">AuthGuardAI Security Alert</h2>' +
        '<h3>' + heading + '</h3>' +
        '<p>' + message + '</p>' +
        '<p><strong>Risk Score:</strong> ' + riskScore + '</p>' +
        (imageBase64 ? '<p><strong>Captured image of the attempted access is attached.</strong></p>' : '') +
        '<p style="color: #6b7280; font-size: 12px; margin-top: 30px;">' +
        'If this was not you, we recommend changing your password immediately.' +
        '</p>' +
        '</div>'
    };

    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      mailOptions.attachments = [
        {
          filename: "intruder-capture.jpg",
          content: base64Data,
          encoding: "base64"
        }
      ];
    }

    await transporter.sendMail(mailOptions);
    console.log("Security alert email sent to " + toEmail);
  } catch (error) {
    console.error("EMAIL SEND ERROR:", error.message);
  }
}

module.exports = { sendSecurityAlert };