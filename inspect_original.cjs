const fs = require('fs');
const path = require('path');

const brainDir = path.join('C:', 'Users', 'Farhan Ayan Emon', '.gemini', 'antigravity-ide', 'brain', '13b46482-b865-405a-8064-3e7af421c86e');
const publicDir = path.join(__dirname, 'artifacts', 'web', 'public');

// List all images in brainDir and .user_uploaded
function findImages(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findImages(fullPath));
    } else if (file.endsWith('.jpg') || file.endsWith('.png')) {
      results.push(fullPath);
    }
  });
  return results;
}

const allImages = findImages(brainDir);
console.log('Found images:');
allImages.forEach(img => console.log(path.relative(brainDir, img)));

// Copy all images to publicDir so they are accessible via http://localhost:5000/<filename>
allImages.forEach(img => {
  const destName = path.basename(img);
  fs.copyFileSync(img, path.join(publicDir, destName));
});
console.log('All images copied to public directory for immediate preview!');
