import type { CapacitorConfig } from '@capacitor/cli';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvValue(key: string): string {
  if (process.env[key]) return process.env[key]!;
  try {
    const envFile = path.resolve(__dirname, '.env');
    if (fs.existsSync(envFile)) {
      const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k.trim() === key) {
          return v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch {}
  return '';
}

const serverClientId = loadEnvValue('VITE_WEBSDK_CLIENT_ID');

const config: CapacitorConfig = {
  appId: 'com.vyhbz.app',
  appName: 'VybHz',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId,
      // iOS needs the iOS OAuth client ID; Android/web use the web client ID
      iosClientId: '835333652848-q9nosshusfsfmidscimcibesu3mqo8au.apps.googleusercontent.com',
      clientId: serverClientId,
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
