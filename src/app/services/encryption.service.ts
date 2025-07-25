import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  private readonly secretKey = 'NariCare2025SecretKey!@#$%^&*()';

  constructor() {}

  encrypt(text: string): string {
    try {
      // Simple XOR encryption for development phase
      let encrypted = '';
      for (let i = 0; i < text.length; i++) {
        const keyChar = this.secretKey.charCodeAt(i % this.secretKey.length);
        const textChar = text.charCodeAt(i);
        encrypted += String.fromCharCode(textChar ^ keyChar);
      }
      return btoa(encrypted); // Base64 encode
    } catch (error) {
      console.error('Encryption error:', error);
      return text; // Fallback to original text
    }
  }

  decrypt(encryptedText: string): string {
    try {
      const decoded = atob(encryptedText); // Base64 decode
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        const keyChar = this.secretKey.charCodeAt(i % this.secretKey.length);
        const encryptedChar = decoded.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedText; // Fallback to original text
    }
  }

  // Method to encrypt the API key from environment
  encryptApiKey(apiKey: string): string {
    return this.encrypt(apiKey);
  }

  // Method to decrypt the API key for use
  decryptApiKey(encryptedApiKey: string): string {
    return this.decrypt(encryptedApiKey);
  }
}