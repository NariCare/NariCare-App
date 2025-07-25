import { Injectable } from '@angular/core';
import { EncryptionService } from './encryption.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiKeyService {
  private decryptedKeys: { [key: string]: string } = {};

  constructor(private encryptionService: EncryptionService) {
    this.initializeKeys();
  }

  private initializeKeys(): void {
    try {
      // Decrypt OpenAI API key
      if (environment.encryptedOpenaiApiKey) {
        this.decryptedKeys['openai'] = this.encryptionService.decryptApiKey(
          environment.encryptedOpenaiApiKey
        );
      }
    } catch (error) {
      console.error('Error decrypting API keys:', error);
    }
  }

  getOpenAIKey(): string {
    return this.decryptedKeys['openai'] || '';
  }

  // Method to validate if API key is properly decrypted
  isOpenAIKeyValid(): boolean {
    const key = this.getOpenAIKey();
    return key.startsWith('sk-') && key.length > 20;
  }

  // Method to encrypt a new API key (for development use)
  encryptNewKey(apiKey: string): string {
    return this.encryptionService.encryptApiKey(apiKey);
  }
}