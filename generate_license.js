const crypto = require('crypto');
const path = require('path');

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

// --- Command-Line Interface ---
const args = process.argv.slice(2);

if (args.length !== 2) {
  const scriptName = path.basename(process.argv[1]);
  console.error(`\nUsage: node ${scriptName} "School Name" YYYY-MM-DD`);
  console.error(`Example: node ${scriptName} "Mundika High School" 2026-12-31\n`);
  process.exit(1);
}

const [schoolName, expiryDate] = args;

try {
  const key = generateLicense(schoolName, expiryDate);
  console.log('--- GENERATED LICENSE KEY ---');
  console.log(key);
  console.log('-----------------------------');
  console.log(`Licensed To: ${schoolName}`);
  console.log(`Expires On: ${expiryDate}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}