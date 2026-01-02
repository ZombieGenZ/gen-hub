import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    Client,
    GatewayIntentBits,
    TextChannel,
    ChannelType,
    Message,
    EmbedBuilder,
    Guild,
    CategoryChannel,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    Interaction,
    CacheType,
    ActivityType,
} from 'discord.js';
import { PrismaService } from '../../prisma/prisma.service';
import { IDiscordChannelResult, DiscordReplyCallback } from './interfaces';

/**
 * DiscordService
 * Service để tích hợp Discord cho support tickets
 * - Tự động tạo channel khi có contact mới
 * - Lắng nghe reply trong channel và forward đến contact API
 * - Có thể bật/tắt qua DISCORD_ENABLED trong .env
 */
@Injectable()
export class DiscordService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DiscordService.name);
    private client: Client | null = null;
    private guild: Guild | null = null;
    private category: CategoryChannel | null = null;
    private closedCategory: CategoryChannel | null = null;

    private readonly isEnabled: boolean;
    private readonly botToken: string;
    private readonly guildId: string;
    private readonly categoryId: string;
    private readonly closedCategoryId: string;

    // Callback để xử lý reply từ Discord
    private onReplyCallback: DiscordReplyCallback | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly prismaService: PrismaService,
    ) {
        // Kiểm tra xem Discord integration có được bật không
        const enabledValue = this.configService.get<string>('DISCORD_ENABLED');
        this.isEnabled = enabledValue === 'true' || enabledValue === '1';

        this.botToken = this.configService.get<string>('DISCORD_BOT_TOKEN') || '';
        this.guildId = this.configService.get<string>('DISCORD_GUILD_ID') || '';
        this.categoryId = this.configService.get<string>('DISCORD_SUPPORT_CATEGORY_ID') || '';
        this.closedCategoryId = this.configService.get<string>('DISCORD_CLOSED_CATEGORY_ID') || '';

        if (this.isEnabled) {
            if (!this.botToken || !this.guildId || !this.categoryId) {
                this.logger.warn('Discord is enabled but missing required configuration. Disabling Discord integration.');
                (this as any).isEnabled = false;
            } else {
                this.logger.log('Discord integration is enabled');
            }
        } else {
            this.logger.log('Discord integration is disabled');
        }
    }

    async onModuleInit() {
        if (!this.isEnabled) return;

        try {
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent,
                ],
            });

            // Xử lý lỗi client (ví dụ: intents không hợp lệ)
            this.client.on('error', (error) => {
                this.logger.error('Discord client error:', error.message);
            });

            // Xử lý khi bot sẵn sàng
            this.client.once('ready', async () => {
                // Set Bot Status
                const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'GenHub';
                this.client?.user?.setActivity(frontendUrl, { type: ActivityType.Listening });

                this.logger.log(`Discord bot logged in as ${this.client?.user?.tag} - Listening to ${frontendUrl}`);

                // Lấy guild và category
                this.guild = this.client?.guilds.cache.get(this.guildId) || null;
                if (this.guild) {
                    const channel = this.guild.channels.cache.get(this.categoryId);
                    if (channel?.type === ChannelType.GuildCategory) {
                        this.category = channel as CategoryChannel;
                        this.logger.log(`Connected to category: ${this.category.name}`);
                    }

                    if (this.closedCategoryId) {
                        const closedChannel = this.guild.channels.cache.get(this.closedCategoryId);
                        if (closedChannel?.type === ChannelType.GuildCategory) {
                            this.closedCategory = closedChannel as CategoryChannel;
                            this.logger.log(`Connected to closed category: ${this.closedCategory.name}`);
                        }
                    }
                }
            });

            // Lắng nghe tin nhắn trong các channel
            this.client.on('messageCreate', (message) => this.handleMessage(message));

            // Lắng nghe interaction (button click)
            this.client.on('interactionCreate', (interaction) => this.handleInteraction(interaction));

            // Đăng nhập
            await this.client.login(this.botToken);
        } catch (error) {
            this.logger.error('Failed to initialize Discord client:', error);
            this.logger.warn('Discord integration has been disabled due to initialization error.');
            // Disable service thay vì crash app
            (this as any).isEnabled = false;
            this.client = null;
        }
    }

    async onModuleDestroy() {
        if (this.client) {
            this.client.destroy();
            this.logger.log('Discord client disconnected');
        }
    }

    /**
     * Kiểm tra xem service có được enable không
     */
    get enabled(): boolean {
        return this.isEnabled && this.client !== null && this.guild !== null;
    }

    /**
     * Đăng ký callback để xử lý reply từ Discord
     */
    setReplyCallback(callback: DiscordReplyCallback) {
        this.onReplyCallback = callback;
    }

    /**
     * Tạo channel mới cho contact ticket
     */
    async createContactChannel(
        contactCode: string,
        customerName: string,
        customerEmail: string,
        subject?: string,
    ): Promise<IDiscordChannelResult> {
        if (!this.enabled || !this.guild || !this.category) {
            return { success: false, error: 'Discord integration is not available' };
        }

        try {
            // Fix: Tránh double prefix ticket-ticket-
            const lowerCode = contactCode.toLowerCase();
            const channelName = lowerCode.startsWith('ticket-') ? lowerCode : `ticket-${lowerCode}`;

            // Tạo channel trong category support
            const channel = await this.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: this.category,
                topic: `Support Ticket: ${contactCode} | Customer: ${customerEmail}`,
            });

            // Gửi tin nhắn chào mừng với embed
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('📩 Yêu cầu hổ trợ mới')
                .addFields(
                    { name: 'Code', value: contactCode, inline: true },
                    { name: 'Khách hàng', value: customerName, inline: true },
                    { name: 'Email', value: customerEmail, inline: true },
                )
                .setTimestamp();

            if (subject) {
                embed.addFields({ name: 'Tiêu đề', value: subject });
            }

            embed.setFooter({ text: 'Hãy trả lời trong kênh này để phản hồi khách hàng.' });

            // Tạo buttons
            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒');

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(closeButton);

            await (channel as TextChannel).send({
                embeds: [embed],
                components: [row],
            });

            this.logger.log(`Created Discord channel: ${channelName} for ticket ${contactCode}`);

            return { success: true, channelId: channel.id };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create Discord channel for ${contactCode}:`, error);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Callback for actions (Close, Reopen, Delete, Reply)
     */
    private actionCallback: {
        onClose: (channelId: string, userId: string, userName: string) => Promise<void>;
        onReopen: (channelId: string, userId: string, userName: string) => Promise<void>;
        onDelete: (channelId: string, userId: string, userName: string) => Promise<void>;
        onReply: (ticketCode: string, content: string, authorName: string, authorId: string) => Promise<void>;
    } | null = null;

    registerActionCallback(callback: {
        onClose: (channelId: string, userId: string, userName: string) => Promise<void>;
        onReopen: (channelId: string, userId: string, userName: string) => Promise<void>;
        onDelete: (channelId: string, userId: string, userName: string) => Promise<void>;
        onReply: (ticketCode: string, content: string, authorName: string, authorId: string) => Promise<void>;
    }) {
        this.actionCallback = callback;
    }

    /**
     * Gửi tin nhắn vào channel của ticket
     */
    async sendMessageToTicket(
        channelId: string,
        content: string,
        isFromCustomer: boolean,
        senderName?: string,
    ): Promise<boolean> {
        if (!this.enabled || !this.guild) return false;

        try {
            const channel = this.guild.channels.cache.get(channelId) as TextChannel;
            if (!channel) {
                this.logger.warn(`Channel ${channelId} not found`);
                return false;
            }

            const embed = new EmbedBuilder()
                .setColor(isFromCustomer ? 0x00ff00 : 0x0099ff)
                .setDescription(content)
                .setTimestamp();

            if (senderName) {
                embed.setAuthor({ name: senderName });
            }

            if (isFromCustomer) {
                embed.setTitle('📨 Khách hàng phản hồi');
            }

            await channel.send({ embeds: [embed] });
            return true;
        } catch (error) {
            this.logger.error(`Failed to send message to channel ${channelId}:`, error);
            return false;
        }
    }

    /**
     * Đóng/Xóa channel khi ticket được đóng/xóa
     */
    async closeTicketChannel(
        channelId: string,
        isDeleted: boolean = false,
        closedBy?: string,
    ): Promise<boolean> {
        if (!this.enabled || !this.guild) return false;

        try {
            const channel = this.guild.channels.cache.get(channelId) as TextChannel;
            if (!channel) return false;

            const title = isDeleted ? '🗑️ Ticket Deleted' : '🔒 Ticket Closed';
            const description = isDeleted
                ? 'This support ticket has been deleted.'
                : 'This support ticket has been closed.';
            const color = isDeleted ? 0xff0000 : 0x808080;

            // Gửi tin nhắn thông báo
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description)
                .setTimestamp();

            if (closedBy) {
                embed.addFields({ name: isDeleted ? 'Deleted by' : 'Closed by', value: closedBy });
            }

            const rows: ActionRowBuilder<ButtonBuilder>[] = [];

            // Nếu chỉ đóng (không xóa) thì thêm nút Reopen
            if (!isDeleted) {
                const reopenButton = new ButtonBuilder()
                    .setCustomId('reopen_ticket')
                    .setLabel('Reopen Ticket')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔓');

                const deleteButton = new ButtonBuilder()
                    .setCustomId('delete_ticket_channel')
                    .setLabel('Delete Channel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗑️');

                rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(reopenButton, deleteButton));
            }

            await channel.send({
                embeds: [embed],
                components: rows,
            });

            // Di chuyển sang category Closed nếu có cấu hình
            if (this.closedCategory) {
                await channel.setParent(this.closedCategory);
            }

            // Đổi tên channel để đánh dấu đã đóng - chỉ đổi nếu chưa có prefix closed-
            if (!channel.name.startsWith('closed-')) {
                await channel.setName(`closed-${channel.name.replace('ticket-', '')}`);
            }

            return true;
        } catch (error) {
            this.logger.error(`Failed to close channel ${channelId}:`, error);
            return false;
        }
    }

    /**
     * Mở lại channel
     */
    async reopenTicketChannel(channelId: string, reopenedBy?: string): Promise<boolean> {
        if (!this.enabled || !this.guild) return false;

        try {
            const channel = this.guild.channels.cache.get(channelId) as TextChannel;
            if (!channel) return false;

            // Di chuyển về category support
            if (this.category) {
                await channel.setParent(this.category);
            }

            // Đổi lại tên (bỏ prefix closed-)
            if (channel.name.startsWith('closed-')) {
                await channel.setName(channel.name.replace('closed-', 'ticket-'));
            }

            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🔓 Ticket Reopened')
                .setDescription('This support ticket has been reopened.')
                .setTimestamp();

            if (reopenedBy) {
                embed.addFields({ name: 'Reopened by', value: reopenedBy });
            }

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒');

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(closeButton);

            await channel.send({
                embeds: [embed],
                components: [row],
            });

            return true;
        } catch (error) {
            this.logger.error(`Failed to reopen channel ${channelId}:`, error);
            return false;
        }
    }

    /**
     * Xử lý tin nhắn từ Discord
     */
    private async handleMessage(message: Message): Promise<void> {
        if (message.author.bot) return;

        const channel = message.channel as TextChannel;
        const channelName = channel.name;

        // Handle Commands
        const content = message.content.trim().toLowerCase();
        const userId = message.author.id;
        const userName = message.author.displayName || message.author.username;

        if (this.actionCallback) {
            if (content === '!close') {
                await this.actionCallback.onClose(channel.id, userId, userName);
                await message.react('✅');
                return;
            }
            if (content === '!reopen') {
                await this.actionCallback.onReopen(channel.id, userId, userName);
                await message.react('✅');
                return;
            }
            if (content === '!delete') {
                await this.actionCallback.onDelete(channel.id, userId, userName);
                await message.react('✅');
                setTimeout(() => channel.delete().catch(e => this.logger.error('Failed to delete channel', e)), 5000);
                return;
            }
            if (content === '!help') {
                const embed = new EmbedBuilder()
                    .setTitle('🤖 Support Bot Commands')
                    .setColor('#0099ff')
                    .setDescription('Here are the available commands for managing tickets:')
                    .addFields(
                        { name: '🔒 !close', value: 'Close the current ticket' },
                        { name: '🔓 !reopen', value: 'Reopen a closed ticket' },
                        { name: '🗑️ !delete', value: 'Delete the ticket channel (Soft delete)' },
                        { name: '❓ !help', value: 'Show this help message' }
                    )
                    .setFooter({ text: 'GenHub Support System' });

                await channel.send({ embeds: [embed] });
                return;
            }
        }

        // Handle Reply (only in ticket channels)
        if (!channelName.startsWith('ticket-')) return;

        const ticketCode = channelName.replace('ticket-', '').toUpperCase();

        if (this.actionCallback) {
            try {
                await this.actionCallback.onReply(
                    ticketCode,
                    message.content,
                    userName,
                    userId,
                );
                await message.react('✅');
            } catch (error) {
                this.logger.error(`Failed to process Discord reply for ticket ${ticketCode}:`, error);
                await message.react('❌');
            }
        }
    }

    /**
     * Xử lý interaction (button click)
     */
    private async handleInteraction(interaction: Interaction<CacheType>): Promise<void> {
        if (!interaction.isButton()) return;
        if (!this.actionCallback) return;

        const { customId } = interaction;
        const channel = interaction.channel as TextChannel;
        const user = interaction.user;
        const userName = user.displayName || user.username;

        try {
            if (customId === 'close_ticket') {
                await interaction.reply({ content: 'Processing close request...', ephemeral: true });
                await this.actionCallback.onClose(channel.id, user.id, userName);
            } else if (customId === 'delete_ticket_channel') {
                await interaction.reply({ content: 'Processing delete request...', ephemeral: true });
                await this.actionCallback.onDelete(channel.id, user.id, userName);
                setTimeout(() => channel.delete().catch(e => this.logger.error('Failed to delete channel', e)), 5000);
            } else if (customId === 'reopen_ticket') {
                await interaction.reply({ content: 'Processing reopen request...', ephemeral: true });
                await this.actionCallback.onReopen(channel.id, user.id, userName);
            }
        } catch (error) {
            this.logger.error(`Error handling interaction ${customId}:`, error);
            await interaction.followUp({ content: 'An error occurred while processing your request.', ephemeral: true });
        }
    }
}
