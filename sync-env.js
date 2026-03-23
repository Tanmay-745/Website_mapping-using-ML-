import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUB_APPS = [
  'dashboard',
  'Legal mapping',
  'Barcode-1',
  'legal pro/AI Legal Portal',
  'CoverLetterApp'
];

function syncEnv() {
  const rootEnvPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(rootEnvPath)) {
    console.log('❌ Root .env file not found. Create one from .env.example first.');
    return;
  }

  const rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
  console.log('🔄 Syncing .env to sub-applications...');

  SUB_APPS.forEach(appDir => {
    const targetDir = path.join(__dirname, appDir);
    if (fs.existsSync(targetDir)) {
      const targetEnvPath = path.join(targetDir, '.env');
      fs.writeFileSync(targetEnvPath, rootEnvContent);
      console.log(`✅ Synced to ${appDir}`);
    } else {
      console.warn(`⚠️  Directory not found: ${appDir}`);
    }
  });

  console.log('✨ Environment synchronization complete!');
}

syncEnv();
