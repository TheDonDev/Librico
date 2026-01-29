const crypto = require('crypto');
const path = require('path');
const nodemailer = require('nodemailer');

// MUST match the secret in main.js
const LICENSE_SECRET = 'your-super-secret-key-librico-2024'; 

function generateLicense(schoolName, expiryDate) {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    throw new Error('Expiry date must be in YYYY-MM-DD format.');
  }

  const data = JSON.stringify({ 
    school: schoolName, 
    expiry: expiryDate // Format: YYYY-MM-DD
  });
  
  // Create signature
  const signature = crypto.createHmac('sha256', LICENSE_SECRET).update(data).digest('hex');
  
  // Combine data and signature, then encode to Base64
  return Buffer.from(`${data}|${signature}`).toString('base64');
}

async function sendLicenseEmail(schoolName, email, licenseKey, expiryDate) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'donaldmwanga33@gmail.com',
      pass: 'qzdd cgnu sgmc gcan',
    },
  });

  await transporter.sendMail({
    from: '"Librico Admin" <donaldmwanga33@gmail.com>',
    to: email,
    subject: `Librico License Key for ${schoolName}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2c3e50;">Librico License Key</h2>
        <p>Hello,</p>
        <p>Here is the license key for <strong>${schoolName}</strong>.</p>
        <p><strong>Expiry Date:</strong> ${expiryDate}</p>
        <div style="background: #f8f9fa; padding: 15px; border: 1px solid #e9ecef; border-radius: 5px; word-break: break-all; font-family: monospace; margin: 20px 0; color: #e83e8c;">
          ${licenseKey}
        </div>
        <p>Please copy the key above and paste it into the <strong>License Settings</strong> page in the Librico application to activate your software.</p>
        <p>Best regards,<br/>The Librico Team</p>
      </div>
    `,
  });
  console.log(`✅ Email sent successfully to ${email}`);
}

// --- Command-Line Interface ---
const args = process.argv.slice(2);

if (args.length < 2) {
  const scriptName = path.basename(process.argv[1]);
  console.error(`\nUsage: node ${scriptName} "School Name" YYYY-MM-DD [Email]`);
  console.error(`Example: node ${scriptName} "Mundika High School" 2026-12-31 "client@school.com"\n`);
  process.exit(1);
}

const [schoolName, expiryDate, email] = args;

try {
  const key = generateLicense(schoolName, expiryDate);
  console.log('--- GENERATED LICENSE KEY ---');
  console.log(key);
  console.log('-----------------------------');
  console.log(`Licensed To: ${schoolName}`);
  console.log(`Expires On: ${expiryDate}`);

  if (email) {
    sendLicenseEmail(schoolName, email, key, expiryDate).catch(err => {
      console.error('❌ Failed to send email:', err);
    });
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}