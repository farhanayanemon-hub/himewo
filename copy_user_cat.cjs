const fs = require('fs');
const path = require('path');

const userUploadedPath = path.join(
  'C:', 'Users', 'Farhan Ayan Emon', '.gemini', 'antigravity-ide',
  'brain', '13b46482-b865-405a-8064-3e7af421c86e', '.user_uploaded', 'media_1788170262464.jpg'
);

const publicDir = path.join(__dirname, 'artifacts', 'web', 'public');

if (fs.existsSync(userUploadedPath)) {
  fs.copyFileSync(userUploadedPath, path.join(publicDir, 'original_user_pixel_cat.jpg'));
  fs.copyFileSync(userUploadedPath, path.join(publicDir, 'original_user_pixel_cat.png'));
  fs.copyFileSync(userUploadedPath, path.join(publicDir, 'logo.png'));
  fs.copyFileSync(userUploadedPath, path.join(publicDir, 'logo.jpg'));
  console.log('Successfully copied original user uploaded cat sticker to public directory!');
} else {
  console.error('User uploaded image not found!');
}
