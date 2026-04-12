import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CipherService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly ivLength = 16; // AES block size

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('CIPHER_SECRET_KEY');
    if (!secret) {
      throw new Error(
        'CIPHER_SECRET_KEY is not defined in environment variables',
      );
    }
    // Ensure key is 32 bytes (256 bits)
    // We can use a hash or scrypt to derive a 32-byte key from the secret string,
    // or assume the secret provided is appropriate.
    // Ideally, provided secret should be strong. Here we hash it to ensure 32 bytes.
    this.key = crypto.createHash('sha256').update(String(secret)).digest();
  }

  encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Return IV:EncryptedData
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(text: string): string {
    if (!text) return text;
    const parts = text.split(':');
    if (parts.length !== 2) {
      // Not encrypted format, return as is or throw?
      // Safe to return as is if migration is gradual, but better to be strict if all must be encrypted.
      // Returning as is might expose raw data if it wasn't encrypted.
      // But standard format is IV:Data.
      return text;
    }

    try {
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      // Decryption failed (wrong key or corrupted data)
      console.error('Decryption failed:', error);
      return text; // Return original or empty? Original might be safer to debug but risks exposure if partially raw.
    }
  }
}
