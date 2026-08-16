const fs = require('fs');
const path = require('path');

const targets = [
  { name: '.next', path: path.join(__dirname, '../.next'), isDir: true },
  { name: 'out', path: path.join(__dirname, '../out'), isDir: true },
  { name: 'package-lock.json', path: path.join(__dirname, '../package-lock.json'), isDir: false },
  { name: 'pnpm-lock.yaml', path: path.join(__dirname, '../pnpm-lock.yaml'), isDir: false }
];

console.log('🧹 Starting workspace cleaner...');
let cleanedCount = 0;

targets.forEach((target) => {
  if (fs.existsSync(target.path)) {
    try {
      if (target.isDir) {
        fs.rmSync(target.path, { recursive: true, force: true });
        console.log(`✅ Removed directory: ${target.name}`);
      } else {
        fs.unlinkSync(target.path);
        console.log(`✅ Removed file: ${target.name}`);
      }
      cleanedCount++;
    } catch (err) {
      console.error(`❌ Failed to remove ${target.name}:`, err.message);
    }
  } else {
    console.log(`ℹ️  Skipped: ${target.name} (does not exist)`);
  }
});

console.log(`\n🎉 Workspace cleaning complete! ${cleanedCount} item(s) removed.`);
console.info('👉 Run "npm install" to rebuild your dependencies.');
