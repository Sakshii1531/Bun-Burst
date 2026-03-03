const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend', 'modules');

// The fields throwing duplicate warnings:
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

  // We want to find schema.index({ field: 1 }) or schema.index({ field: 1 }, {...})
  // and remove them if they are single field indexes corresponding to our duplicates.
  
  badFields.forEach(field => {
    // Regex explanation:
    // Match something like "SchemaName.index({ 'userId': 1 });"
    // Or "SchemaName.index({ userId: 1 })"
    // Also optional spaces and optional index options (like { unique: true })
    
    // Safely escape the field name for regex (for dots in 'transactions.orderId')
    const escapedField = field.replace(/\./g, '\\.');
    
    // Match cases: schema.index({ field: 1 })
    // With optional quotes around field name
    const regexStr = `^\\s*\\w+\\.index\\(\\s*\\{\\s*(['"]?)${escapedField}\\1\\s*:\\s*[1|-1]\\s*\\}\\s*(?:,\\s*\\{[^}]+\\}\\s*)?\\);?[\\r\\n]?`;
    const regex = new RegExp(regexStr, 'gm');
    
    content = content.replace(regex, '');
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed redundant indexes in: ${filePath}`);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else if (file.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

console.log("Scanning model files for redundant single-field schema.index()...");
traverse(BACKEND_DIR);
console.log("Done.");
