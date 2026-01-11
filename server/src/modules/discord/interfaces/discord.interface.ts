/**
 * Interface cho kết quả tạo channel Discord
 */
export interface IDiscordChannelResult {
    success: boolean;
    channelId?: string;
    error?: string;
}

/**
 * Callback type cho reply từ Discord
 */
export type DiscordReplyCallback = (
    ticketCode: string,
    content: string,
    authorName: string,
    authorId: string,
) => Promise<void>;

/**
 * Interface cho action callbacks từ Discord với reason
 */
export interface IDiscordActionCallback {
    onClose: (channelId: string, userId: string, userName: string, reason: string) => Promise<void>;
    onReopen: (channelId: string, userId: string, userName: string, reason: string) => Promise<void>;
    onDelete: (channelId: string, userId: string, userName: string, reason: string) => Promise<void>;
    onReply: (ticketCode: string, content: string, authorName: string, authorId: string) => Promise<void>;
    onWhitelist: (channelId: string, userId: string, userName: string, matchType: string, value: string, reason: string) => Promise<void>;
    onBlacklist: (channelId: string, userId: string, userName: string, matchType: string, value: string, reason: string) => Promise<void>;
    onRemoveWhitelist: (channelId: string, userId: string, userName: string, matchType: string, value: string) => Promise<void>;
    onRemoveBlacklist: (channelId: string, userId: string, userName: string, matchType: string, value: string) => Promise<void>;
    onSetPriority: (channelId: string, userId: string, userName: string, priority: string) => Promise<void>;
    onSkip: (channelId: string, userId: string, userName: string, reason: string) => Promise<void>;
    onUnsetSkip: (channelId: string, userId: string, userName: string) => Promise<void>;
}
