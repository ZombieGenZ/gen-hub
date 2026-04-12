/**
 * Interfaces cho Gmail API Service
 */

/**
 * Thông tin email được parse từ Gmail API
 */
export interface IGmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  historyId: string;
  internalDate: string;
  headers: {
    from?: string;
    to?: string;
    subject?: string;
    messageId?: string;
    inReplyTo?: string;
    references?: string[];
  };
  body: {
    text?: string;
    html?: string;
  };
}

/**
 * Notification từ Pub/Sub
 */
export interface IGmailPubSubNotification {
  emailAddress: string;
  historyId: string;
}

/**
 * Kết quả watch request
 */
export interface IGmailWatchResponse {
  historyId: string;
  expiration: string;
}

/**
 * History item từ Gmail API
 */
export interface IGmailHistoryItem {
  id: string;
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  messagesAdded?: Array<{
    message: {
      id: string;
      threadId: string;
      labelIds?: string[];
    };
  }>;
}

/**
 * Config cho Gmail API
 */
export interface IGmailApiConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  primaryEmail: string;
  pubsubTopic?: string;
  watchLabelIds?: string[];
  usePolling?: boolean;
  pollIntervalSeconds?: number;
}
