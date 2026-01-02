/**
 * Email Inbound Provider interfaces
 */

/**
 * Interface cho unlock token data từ Redis
 */
export interface IUnlockTokenData {
    code: string;
    ip: string;
    createdAt: number;
}

/**
 * Pub/Sub message structure từ Google Cloud
 */
export interface IPubSubMessage {
    message: {
        data: string; // Base64 encoded
        messageId: string;
        publishTime: string;
    };
    subscription: string;
}
