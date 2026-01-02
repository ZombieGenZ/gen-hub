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
