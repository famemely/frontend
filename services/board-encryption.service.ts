// ============================================================================
// Family Board Encryption Service
// Implements encryption using family auto shared keys for React Native
// Note: This is a simplified implementation for demo purposes
// In production, use a proper React Native encryption library like react-native-crypto
// ============================================================================

import { FamilyBoardEncryption, EncryptionResult, DecryptionResult } from '../types/board.types';
import { supabase } from './supabase.service';

class FamilyBoardEncryptionService implements FamilyBoardEncryption {
  private static instance: FamilyBoardEncryptionService;
  private familyKeys: { [key: string]: string } = {}; // Cache for family keys

  private constructor() {}

  static getInstance(): FamilyBoardEncryptionService {
    if (!FamilyBoardEncryptionService.instance) {
      FamilyBoardEncryptionService.instance = new FamilyBoardEncryptionService();
    }
    return FamilyBoardEncryptionService.instance;
  }

  /**
   * Generate a new family encryption key
   */
  generateFamilyKey(): string {
    // Generate a random 32-byte key (256-bit)
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return this.arrayBufferToBase64(array.buffer);
  }

  /**
   * Derive family key from family ID and user secret
   * This ensures all family members can generate the same key
   */
  async deriveFamilyKey(familyId: string, userSecret: string): Promise<string> {
    // Check cache first
    const cacheKey = `${familyId}:${userSecret}`;
    if (this.familyKeys[cacheKey]) {
      return this.familyKeys[cacheKey];
    }

    // For demo purposes, create a deterministic key from family ID and user secret
    // In production, this should use proper PBKDF2 with salt from database
    const combined = `${familyId}:${userSecret}`;
    const key = await this.simpleHash(combined);
    
    // Cache the key
    this.familyKeys[cacheKey] = key;
    
    return key;
  }

  /**
   * Encrypt text using family key (simplified implementation)
   */
  async encryptText(text: string, familyKey: string): Promise<EncryptionResult> {
    try {
      if (!text || !familyKey) {
        return {
          encrypted_data: '',
          success: false,
          error: 'Text and family key are required'
        };
      }

      // Simple XOR encryption for demo (use proper AES in production)
      const encrypted = this.xorEncrypt(text, familyKey);
      
      return {
        encrypted_data: encrypted,
        success: true
      };
    } catch (error) {
      return {
        encrypted_data: '',
        success: false,
        error: error instanceof Error ? error.message : 'Encryption failed'
      };
    }
  }

  /**
   * Decrypt text using family key (simplified implementation)
   */
  async decryptText(encryptedText: string, familyKey: string): Promise<DecryptionResult> {
    try {
      if (!encryptedText || !familyKey) {
        return {
          decrypted_data: '',
          success: false,
          error: 'Encrypted text and family key are required'
        };
      }

      // Simple XOR decryption for demo (use proper AES in production)
      const decrypted = this.xorDecrypt(encryptedText, familyKey);
      
      return {
        decrypted_data: decrypted,
        success: true
      };
    } catch (error) {
      return {
        decrypted_data: '',
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed'
      };
    }
  }

  /**
   * Initialize family encryption key for a new family
   */
  async initializeFamilyKey(familyId: string): Promise<string> {
    try {
      // Generate new family key
      const familyKey = this.generateFamilyKey();
      
      // Call Supabase function to store the encrypted key
      const { data, error } = await supabase.rpc('generate_family_encryption_key', {
        _family_id: familyId
      });

      if (error) {
        console.warn('Supabase function not available (using mock):', error);
        // For demo purposes, just return the generated key
        return familyKey;
      }

      return data || familyKey; // Returns the generated key
    } catch (error) {
      console.error('Error initializing family key:', error);
      // Fallback to demo key for development
      return this.generateFamilyKey();
    }
  }

  /**
   * Verify family encryption key
   */
  async verifyFamilyKey(familyId: string, familyKey: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('verify_family_encryption_key', {
        _family_id: familyId,
        _key: familyKey
      });

      if (error) {
        console.warn('Supabase function not available (using mock):', error);
        // For demo purposes, just check if the key looks valid
        return Boolean(familyKey && familyKey.length > 20);
      }

      return data === true;
    } catch (error) {
      console.error('Error verifying family key:', error);
      // Fallback validation for demo
      return Boolean(familyKey && familyKey.length > 20);
    }
  }

  // Helper methods for simplified encryption

  private async simpleHash(input: string): Promise<string> {
    // Simple hash function for demo purposes
    // In production, use proper PBKDF2 or similar
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to base64-like string with proper padding
    const hashStr = Math.abs(hash).toString(36);
    return (hashStr + '00000000000000000000000000000000').substring(0, 32);
  }

  private xorEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const textChar = text.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(textChar ^ keyChar);
    }
    return this.stringToBase64(result);
  }

  private xorDecrypt(encryptedBase64: string, key: string): string {
    const encrypted = this.base64ToString(encryptedBase64);
    let result = '';
    for (let i = 0; i < encrypted.length; i++) {
      const encryptedChar = encrypted.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(encryptedChar ^ keyChar);
    }
    return result;
  }

  private stringToBase64(str: string): string {
    // Simple base64 encoding
    return btoa(unescape(encodeURIComponent(str)));
  }

  private base64ToString(base64: string): string {
    // Simple base64 decoding
    return decodeURIComponent(escape(atob(base64)));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Encrypt multiple fields for a post
   */
  async encryptPostContent(
    content: { title?: string; content: string; metadata?: any },
    familyKey: string
  ): Promise<{
    title_encrypted: string | null;
    content_encrypted: string;
    metadata_encrypted: string | null;
  }> {
    try {
      const results = await Promise.all([
        content.title ? this.encryptText(content.title, familyKey) : Promise.resolve(null),
        this.encryptText(content.content, familyKey),
        content.metadata ? this.encryptText(JSON.stringify(content.metadata), familyKey) : Promise.resolve(null)
      ]);

      const [titleResult, contentResult, metadataResult] = results;

      if (!contentResult?.success) {
        throw new Error(`Failed to encrypt content: ${contentResult?.error}`);
      }

      if (titleResult && !titleResult.success) {
        throw new Error(`Failed to encrypt title: ${titleResult.error}`);
      }

      if (metadataResult && !metadataResult.success) {
        throw new Error(`Failed to encrypt metadata: ${metadataResult.error}`);
      }

      return {
        title_encrypted: titleResult?.encrypted_data || null,
        content_encrypted: contentResult.encrypted_data,
        metadata_encrypted: metadataResult?.encrypted_data || null
      };
    } catch (error) {
      console.error('Error encrypting post content:', error);
      throw error;
    }
  }

  /**
   * Decrypt multiple fields for a post
   */
  async decryptPostContent(
    encryptedContent: {
      title_encrypted: string | null;
      content_encrypted: string;
      metadata_encrypted: string | null;
    },
    familyKey: string
  ): Promise<{
    title?: string;
    content: string;
    metadata?: any;
  }> {
    try {
      const results = await Promise.all([
        encryptedContent.title_encrypted 
          ? this.decryptText(encryptedContent.title_encrypted, familyKey) 
          : Promise.resolve(null),
        this.decryptText(encryptedContent.content_encrypted, familyKey),
        encryptedContent.metadata_encrypted 
          ? this.decryptText(encryptedContent.metadata_encrypted, familyKey) 
          : Promise.resolve(null)
      ]);

      const [titleResult, contentResult, metadataResult] = results;

      if (!contentResult.success) {
        throw new Error(`Failed to decrypt content: ${contentResult.error}`);
      }

      if (titleResult && !titleResult.success) {
        throw new Error(`Failed to decrypt title: ${titleResult.error}`);
      }

      if (metadataResult && !metadataResult.success) {
        throw new Error(`Failed to decrypt metadata: ${metadataResult.error}`);
      }

      return {
        title: titleResult?.decrypted_data || undefined,
        content: contentResult.decrypted_data,
        metadata: metadataResult?.decrypted_data 
          ? JSON.parse(metadataResult.decrypted_data) 
          : undefined
      };
    } catch (error) {
      console.error('Error decrypting post content:', error);
      throw error;
    }
  }

  /**
   * Clear cached keys (for security)
   */
  clearKeyCache(): void {
    this.familyKeys = {};
  }

  /**
   * Get cached key count (for debugging)
   */
  getCachedKeyCount(): number {
    return Object.keys(this.familyKeys).length;
  }
}

// Export singleton instance
export const familyBoardEncryption = FamilyBoardEncryptionService.getInstance();

// Export class for testing
export { FamilyBoardEncryptionService };