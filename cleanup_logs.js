// cleanup_logs.js
// This script recursively removes generic console.log lines
// and replaces a few instances globally.
// Execute via: node cleanup_logs.js

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend');
const FRONTEND_DIR = path.join(__dirname, 'frontend', 'src');
const FRONTEND_PAGES = path.join(__dirname, 'frontend', 'pages');

const IGNORE_FILES = ['logger.js', 'cleanup_logs.js', 'server.js']; // server.js handled manually
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];

function processFile(filePath) {
  if (IGNORE_FILES.includes(path.basename(filePath))) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Regex to simply eliminate basic forms of console.log();
  // It matches console.log(...) but properly prevents deleting console.error()
  // NOTE: Simple Regex for code rewriting can be dangerous; 
  // It removes lines mostly matching: `console.log(...);` optionally with spaces
  const replace1 = /^[ \t]*console\.log\([^;]*[;]?\n?/gm;
  // Also covers the lines without trailing newline safely by just matching string bounds
  // We avoid parsing inner parens but we match up to `;` or newlines simply
  
  let newContent = content.replace(replace1, '');

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Cleaned up logs in: ${filePath}`);
  }
}

function traverse(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (IGNORE_DIRS.includes(file)) continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

console.log('Starting MERN log cleanup...');
traverse(BACKEND_DIR);
traverse(FRONTEND_DIR);
if(fs.existsSync(FRONTEND_PAGES)) traverse(FRONTEND_PAGES);
console.log('Cleanup finished.');
