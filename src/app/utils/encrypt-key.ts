// Utility script to encrypt your OpenAI API key
// Run this in the browser console to encrypt your key

import { EncryptionService } from '../services/encryption.service';

export function encryptOpenAIKey(apiKey: string): string {
  const encryptionService = new EncryptionService();
  const encrypted = encryptionService.encryptApiKey(apiKey);
  console.log('Encrypted API Key:', encrypted);
  console.log('Copy this value to your environment files as encryptedOpenaiApiKey');
  return encrypted;
}

// Usage example:
// encryptOpenAIKey('your-actual-openai-api-key-here');

// To use this utility:
// 1. Open browser console
// 2. Import this function
// 3. Call encryptOpenAIKey('your-actual-api-key')
// 4. Copy the result to environment files