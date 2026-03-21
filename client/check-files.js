const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file === 'node_modules' || file === '.next' || file === '.git') continue;
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
          filelist = walkSync(filepath, filelist);
        } else {
          if (filepath.endsWith('.ts') || filepath.endsWith('.tsx') || filepath.endsWith('.js') || filepath.endsWith('.jsx')) {
              filelist.push(filepath);
          }
        }
      }
  } catch(e) {}
  return filelist;
};

const allFiles = walkSync(process.cwd());
const largeFiles = [];
const nameCounts = {};

for (const f of allFiles) {
    const lines = fs.readFileSync(f, 'utf8').split('\n').length;
    if (lines > 800) largeFiles.push({ file: f, lines });
    
    const name = path.basename(f);
    nameCounts[name] = (nameCounts[name] || 0) + 1;
}

largeFiles.sort((a,b) => b.lines - a.lines);
console.log('--- LARGE FILES (>800 lines) ---');
largeFiles.forEach(hf => console.log(`${hf.lines} ${hf.file}`));

console.log('\n--- DUPLICATE FILE NAMES ---');
Object.keys(nameCounts).forEach(name => {
    if (nameCounts[name] > 1 && name !== 'page.tsx' && name !== 'layout.tsx') console.log(`${name}: ${nameCounts[name]} times`);
});
