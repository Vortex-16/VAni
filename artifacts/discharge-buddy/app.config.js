import fs from 'fs';
import path from 'path';

// Manual parser for a single .env file to avoid extra dependencies in the mobile app
const loadRootEnv = () => {
  try {
    const rootPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(rootPath)) {
      const content = fs.readFileSync(rootPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        // Skip comments and empty lines
        if (!line || line.startsWith('#')) return;
        
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const trimmedKey = key.trim();
          const value = valueParts.join('=').trim();
          
          // Only project variables that start with EXPO_PUBLIC_ or other allowed suffixes
          if (trimmedKey.startsWith('EXPO_PUBLIC_')) {
            process.env[trimmedKey] = value;
          }
        }
      });
      console.log('✅ Loaded environment variables from root .env');
    }
  } catch (err) {
    console.warn('⚠️ Could not load root .env file:', err.message);
  }
};

loadRootEnv();

export default ({ config }) => {
  return {
    ...config,
    // Add dynamic config here if needed
  };
};
