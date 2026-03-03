const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend'); // Ensure entire backend is scanned.

const badFields = [
  'userId',
  'transactions.orderId',
  'orderId',
  'email',
  'phone',
  'deliveryId',
  'restaurantId',
  'ticketId',
  'transactions.restaurantId'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Regex matches variants:
  // schema.index({ 'email': 1 });
  // schema.index({ phone: 1 }, {unique: true});
  // schema.index({ "transactions.orderId": 1});
  
  badFields.forEach(field => {
    // Escape specific chars for regex construction
    const escapedField = field.replace(/\./g, '\\.');
    // Match fields correctly (with or without quotes)
    // Matches: SchemaName.index({ 'email': 1 }, ...);
    const regex1 = new RegExp(`^\\s*\\w+\\.index\\(\\s*\\{\\s*(['"])?${escapedField}\\1\\s*:\\s*-?1\\s*\\}\\s*(?:,\\s*\\{[^\\}]+\\}\\s*)?\\);?[\\r\\n]?`, 'gm');
    
    content = content.replace(regex1, '');
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned redundant indexes in: ${filePath}`);
  }
}

function traverse(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if(file === 'node_modules' || file === '.git') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else if (file.endsWith('.js') && fullPath.includes('models')) {
      processFile(fullPath);
    }
  }
}

traverse(BACKEND_DIR);
console.log('Cleanup complete!');
