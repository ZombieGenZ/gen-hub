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
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalActionRowComponentBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';
import { PrismaService } from '../../prisma/prisma.service';
import { CozeService } from '../coze/coze.service';
import { IDiscordChannelResult, DiscordReplyCallback, IDiscordActionCallback } from './interfaces';

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
    private priorityCategory: CategoryChannel | null = null;

    private readonly isEnabled: boolean;
    private readonly botToken: string;
    private readonly guildId: string;
    private readonly categoryId: string;
    private readonly closedCategoryId: string;
    private readonly priorityCategoryId: string;
    private readonly autoSupportChannelIds: string[];
    private readonly ignoredCategoryId: string;
    private readonly staffRoleIds: string[];

    // Callback để xử lý reply từ Discord
    private onReplyCallback: DiscordReplyCallback | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly prismaService: PrismaService,
        private readonly cozeService: CozeService,
    ) {
        // Kiểm tra xem Discord integration có được bật không
        const enabledValue = this.configService.get<string>('DISCORD_ENABLED');
        this.isEnabled = enabledValue === 'true' || enabledValue === '1';

        this.botToken = this.configService.get<string>('DISCORD_BOT_TOKEN') || '';
        this.guildId = this.configService.get<string>('DISCORD_GUILD_ID') || '';
        this.categoryId = this.configService.get<string>('DISCORD_SUPPORT_CATEGORY_ID') || '';
        this.closedCategoryId = this.configService.get<string>('DISCORD_CLOSED_CATEGORY_ID') || '';
        this.priorityCategoryId = this.configService.get<string>('DISCORD_PRIORITY_CATEGORY_ID') || '';

        // Lấy danh sách channel IDs cho auto-support với Coze AI
        const autoSupportIds = this.configService.get<string>('DISCORD_AUTO_SUPPORT_CHANNEL_IDS') || '';
        this.autoSupportChannelIds = autoSupportIds.split(',').map(id => id.trim()).filter(id => id);

        // ID của category Discord để bỏ qua (không xử lý tin nhắn)
        this.ignoredCategoryId = this.configService.get<string>('CONTACT_IGNORED_CATEGORY_ID') || '';

        // Danh sách role IDs của staff (bypass AI auto-reply)
        const staffRoleIdsStr = this.configService.get<string>('DISCORD_STAFF_REPLY_ROLE_IDS') || '';
        this.staffRoleIds = staffRoleIdsStr.split(',').map(id => id.trim()).filter(id => id);

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

                    if (this.priorityCategoryId) {
                        const priorityChannel = this.guild.channels.cache.get(this.priorityCategoryId);
                        if (priorityChannel?.type === ChannelType.GuildCategory) {
                            this.priorityCategory = priorityChannel as CategoryChannel;
                            this.logger.log(`Connected to priority category: ${this.priorityCategory.name}`);
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
     * @param isPriority - Nếu true, channel sẽ được tạo trong priority category
     * @param message - Nội dung tin nhắn đầu tiên của khách hàng
     */
    async createContactChannel(
        contactCode: string,
        customerName: string,
        customerEmail: string,
        subject?: string,
        isPriority: boolean = false,
        message?: string,
    ): Promise<IDiscordChannelResult> {
        if (!this.enabled || !this.guild || !this.category) {
            return { success: false, error: 'Tích hợp Discord không khả dụng' };
        }

        try {
            // Fix: Tránh double prefix ticket-ticket-
            const lowerCode = contactCode.toLowerCase();
            const channelName = lowerCode.startsWith('ticket-') ? lowerCode : `ticket-${lowerCode}`;

            // Chọn category dựa trên priority
            // Nếu là priority và có priority category -> dùng priority category
            // Nếu không -> dùng support category thông thường
            const targetCategory = (isPriority && this.priorityCategory) ? this.priorityCategory : this.category;

            // Tạo channel trong category tương ứng
            const channel = await this.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: targetCategory,
                topic: `${isPriority ? '⭐ VIP ' : ''}Ticket Hỗ Trợ: ${contactCode} | Khách hàng: ${customerEmail}`,
            });

            // Gửi tin nhắn chào mừng với embed
            const embed = new EmbedBuilder()
                .setColor(isPriority ? 0xffd700 : 0x0099ff) // Gold cho VIP, Blue cho thường
                .setTitle(isPriority ? '⭐ Yêu cầu hỗ trợ VIP mới' : '📩 Yêu cầu hỗ trợ mới')
                .addFields(
                    { name: 'Code', value: contactCode, inline: true },
                    { name: 'Khách hàng', value: customerName, inline: true },
                    { name: 'Email', value: customerEmail, inline: true },
                )
                .setTimestamp();

            if (subject) {
                embed.addFields({ name: 'Tiêu đề', value: subject });
            }

            // Thêm nội dung tin nhắn nếu có
            if (message) {
                // Giới hạn 1024 ký tự theo Discord embed limit
                const truncatedMessage = message.length > 1000
                    ? message.substring(0, 1000) + '...'
                    : message;
                embed.addFields({ name: '📝 Nội dung', value: truncatedMessage });
            }

            embed.setFooter({ text: 'Hãy trả lời trong kênh này để phản hồi khách hàng.' });

            // Tạo buttons
            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Đóng Ticket')
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
     * Callback for actions (Close, Reopen, Delete, Reply, etc.)
     * Sử dụng IDiscordActionCallback interface
     */
    private actionCallback: IDiscordActionCallback | null = null;

    registerActionCallback(callback: IDiscordActionCallback) {
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
     * Disable tất cả các button cũ trong channel
     * Để tránh user click vào button cũ gây lỗi
     */
    private async disableOldButtons(channel: TextChannel): Promise<void> {
        try {
            // Lấy 20 tin nhắn gần nhất từ bot
            const messages = await channel.messages.fetch({ limit: 20 });
            const botMessages = messages.filter(
                msg => msg.author.id === this.client?.user?.id && msg.components.length > 0
            );

            // Disable tất cả button trong các message cũ
            for (const [, message] of botMessages) {
                const disabledRows: ActionRowBuilder<ButtonBuilder>[] = [];

                for (const row of message.components) {
                    // Kiểm tra xem row có phải ActionRow không (type = 1)
                    if (row.type !== 1) continue;

                    const newRow = new ActionRowBuilder<ButtonBuilder>();
                    for (const component of (row as any).components) {
                        if (component.type === 2) { // ComponentType.Button = 2
                            const btn = ButtonBuilder.from(component);
                            btn.setDisabled(true);
                            newRow.addComponents(btn);
                        }
                    }
                    if (newRow.components.length > 0) {
                        disabledRows.push(newRow);
                    }
                }

                if (disabledRows.length > 0) {
                    await message.edit({ components: disabledRows }).catch(() => {
                        // Ignore errors if message can't be edited
                    });
                }
            }
        } catch (error) {
            this.logger.warn('Failed to disable old buttons:', error);
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

            // Disable các button cũ để tránh user click nhầm
            await this.disableOldButtons(channel);

            const title = isDeleted ? '🗑️ Ticket Đã Xóa' : '🔒 Ticket Đã Đóng';
            const description = isDeleted
                ? 'Ticket hỗ trợ này đã được xóa.'
                : 'Ticket hỗ trợ này đã được đóng.';
            const color = isDeleted ? 0xff0000 : 0x808080;

            // Gửi tin nhắn thông báo
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description)
                .setTimestamp();

            if (closedBy) {
                embed.addFields({ name: isDeleted ? 'Xóa bởi' : 'Đóng bởi', value: closedBy });
            }

            const rows: ActionRowBuilder<ButtonBuilder>[] = [];

            // Nếu chỉ đóng (không xóa) thì thêm nút Reopen
            if (!isDeleted) {
                const reopenButton = new ButtonBuilder()
                    .setCustomId('reopen_ticket')
                    .setLabel('Mở Lại Ticket')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔓');

                const deleteButton = new ButtonBuilder()
                    .setCustomId('delete_ticket_channel')
                    .setLabel('Xóa Kênh')
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

            // Disable các button cũ để tránh user click nhầm
            await this.disableOldButtons(channel);

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
                .setTitle('🔓 Ticket Đã Mở Lại')
                .setDescription('Ticket hỗ trợ này đã được mở lại.')
                .setTimestamp();

            if (reopenedBy) {
                embed.addFields({ name: 'Mở lại bởi', value: reopenedBy });
            }

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Đóng Ticket')
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

        // Bỏ qua tin nhắn từ category được chỉ định trong CONTACT_IGNORED_CATEGORY_ID
        if (this.ignoredCategoryId && channel.parentId === this.ignoredCategoryId) {
            return;
        }

        // Handle Commands (đổi từ ! sang /)
        const content = message.content.trim();
        const contentLower = content.toLowerCase();
        const userId = message.author.id;
        const userName = message.author.displayName || message.author.username;

        if (this.actionCallback) {
            // /close [reason] - Nếu không có reason thì yêu cầu nhập
            if (contentLower.startsWith('/close')) {
                const reason = content.substring(6).trim();
                if (!reason) {
                    await this.showReasonRequiredMessage(message, 'close');
                    return;
                }
                await this.actionCallback.onClose(channel.id, userId, userName, reason);
                await message.react('✅');
                return;
            }

            // /reopen [reason]
            if (contentLower.startsWith('/reopen')) {
                const reason = content.substring(7).trim();
                if (!reason) {
                    await this.showReasonRequiredMessage(message, 'reopen');
                    return;
                }
                await this.actionCallback.onReopen(channel.id, userId, userName, reason);
                await message.react('✅');
                return;
            }

            // /delete [reason]
            if (contentLower.startsWith('/delete')) {
                const reason = content.substring(7).trim();
                if (!reason) {
                    await this.showReasonRequiredMessage(message, 'delete');
                    return;
                }
                await this.actionCallback.onDelete(channel.id, userId, userName, reason);
                await message.react('✅');
                setTimeout(() => channel.delete().catch(e => this.logger.error('Failed to delete channel', e)), 5000);
                return;
            }

            // /whitelist <type> <value> <reason>
            if (contentLower.startsWith('/whitelist')) {
                const args = content.substring(10).trim().split(/\s+/);
                if (args.length < 3) {
                    await this.showWhitelistBlacklistHelp(message, 'whitelist');
                    return;
                }
                const [matchType, value, ...reasonParts] = args;
                const reason = reasonParts.join(' ');
                await this.actionCallback.onWhitelist(channel.id, userId, userName, matchType.toUpperCase(), value, reason);
                await message.react('✅');
                return;
            }

            // /blacklist <type> <value> <reason>
            if (contentLower.startsWith('/blacklist')) {
                const args = content.substring(10).trim().split(/\s+/);
                if (args.length < 3) {
                    await this.showWhitelistBlacklistHelp(message, 'blacklist');
                    return;
                }
                const [matchType, value, ...reasonParts] = args;
                const reason = reasonParts.join(' ');
                await this.actionCallback.onBlacklist(channel.id, userId, userName, matchType.toUpperCase(), value, reason);
                await message.react('✅');
                return;
            }

            // /remove-whitelist <type> <value>
            if (contentLower.startsWith('/remove-whitelist')) {
                const args = content.substring(17).trim().split(/\s+/);
                if (args.length < 2) {
                    await this.showRemoveListHelp(message, 'whitelist');
                    return;
                }
                const [matchType, value] = args;
                await this.actionCallback.onRemoveWhitelist(channel.id, userId, userName, matchType.toUpperCase(), value);
                await message.react('✅');
                return;
            }

            // /remove-blacklist <type> <value>
            if (contentLower.startsWith('/remove-blacklist')) {
                const args = content.substring(17).trim().split(/\s+/);
                if (args.length < 2) {
                    await this.showRemoveListHelp(message, 'blacklist');
                    return;
                }
                const [matchType, value] = args;
                await this.actionCallback.onRemoveBlacklist(channel.id, userId, userName, matchType.toUpperCase(), value);
                await message.react('✅');
                return;
            }

            // /priority <level>
            if (contentLower.startsWith('/priority')) {
                const level = content.substring(9).trim().toUpperCase();
                if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(level)) {
                    await this.showPriorityHelp(message);
                    return;
                }
                await this.actionCallback.onSetPriority(channel.id, userId, userName, level);
                await message.react('✅');
                return;
            }

            // /skip [reason]
            if (contentLower.startsWith('/skip')) {
                const reason = content.substring(5).trim();
                if (!reason) {
                    await this.showReasonRequiredMessage(message, 'skip');
                    return;
                }
                await this.actionCallback.onSkip(channel.id, userId, userName, reason);
                await message.react('✅');
                return;
            }

            // /unskip
            if (contentLower === '/unskip') {
                await this.actionCallback.onUnsetSkip(channel.id, userId, userName);
                await message.react('✅');
                return;
            }

            // /help
            if (contentLower === '/help') {
                const embed = new EmbedBuilder()
                    .setTitle('🤖 Support Bot Commands')
                    .setColor('#0099ff')
                    .setDescription('Danh sách các lệnh quản lý ticket:')
                    .addFields(
                        { name: '🔒 /close <lý do>', value: 'Đóng ticket với lý do' },
                        { name: '🔓 /reopen <lý do>', value: 'Mở lại ticket đã đóng' },
                        { name: '🗑️ /delete <lý do>', value: 'Xóa ticket (soft delete)' },
                        { name: '⭐ /priority <level>', value: 'Đặt độ ưu tiên: LOW, MEDIUM, HIGH, URGENT' },
                        { name: '⏭️ /skip <lý do>', value: 'Bỏ qua ticket với lý do' },
                        { name: '↩️ /unskip', value: 'Hủy bỏ qua ticket' },
                        { name: '✅ /whitelist <type> <value> <reason>', value: 'Thêm vào whitelist\nTypes: EMAIL, EMAIL_DOMAIN, IP_V4, IP_V6, REGION_COUNTRY, REGION_CITY' },
                        { name: '🚫 /blacklist <type> <value> <reason>', value: 'Thêm vào blacklist' },
                        { name: '❎ /remove-whitelist <type> <value>', value: 'Xóa khỏi whitelist' },
                        { name: '❎ /remove-blacklist <type> <value>', value: 'Xóa khỏi blacklist' },
                        { name: '❓ /help', value: 'Hiển thị hướng dẫn này' }
                    )
                    .setFooter({ text: 'GenHub Support System' });

                await channel.send({ embeds: [embed] });
                return;
            }
        }

        // Xử lý Auto-Support với Coze AI (nếu channel nằm trong danh sách)
        if (this.autoSupportChannelIds.includes(channel.id)) {
            await this.handleAutoSupport(message);
            return;
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
                await interaction.reply({ content: '🔄 Đang xử lý yêu cầu đóng...', ephemeral: true });
                await this.actionCallback.onClose(channel.id, user.id, userName, 'Button click');
                await interaction.editReply({ content: '✅ Ticket đã được đóng thành công!' });
            } else if (customId === 'delete_ticket_channel') {
                await interaction.reply({ content: '🔄 Đang xử lý yêu cầu xóa...', ephemeral: true });
                await this.actionCallback.onDelete(channel.id, user.id, userName, 'Button click');
                await interaction.editReply({ content: '✅ Ticket đã được xóa. Kênh sẽ bị xóa sau 5 giây...' });
                setTimeout(() => channel.delete().catch(e => this.logger.error('Failed to delete channel', e)), 5000);
            } else if (customId === 'reopen_ticket') {
                await interaction.reply({ content: '🔄 Đang xử lý yêu cầu mở lại...', ephemeral: true });
                await this.actionCallback.onReopen(channel.id, user.id, userName, 'Button click');
                await interaction.editReply({ content: '✅ Ticket đã được mở lại thành công!' });
            }
        } catch (error: any) {
            const errorMessage = error?.response?.message || error?.message || 'Đã xảy ra lỗi';
            this.logger.error(`Error handling interaction ${customId}:`, error);

            // Try to edit the reply with the error message
            try {
                await interaction.editReply({ content: `❌ ${errorMessage}` });
            } catch {
                // If editReply fails (interaction not replied yet), try followUp
                try {
                    await interaction.followUp({ content: `❌ ${errorMessage}`, ephemeral: true });
                } catch {
                    // Ignore if both fail
                }
            }
        }
    }

    /**
     * Hiển thị thông báo yêu cầu nhập lý do
     */
    private async showReasonRequiredMessage(message: Message, action: string): Promise<void> {
        const actionNames: Record<string, string> = {
            close: 'đóng ticket',
            reopen: 'mở lại ticket',
            delete: 'xóa ticket',
            skip: 'bỏ qua ticket',
        };
        const embed = new EmbedBuilder()
            .setColor(0xffcc00)
            .setTitle('⚠️ Yêu cầu lý do')
            .setDescription(`Vui lòng nhập lý do để **${actionNames[action] || action}**.`)
            .addFields(
                { name: 'Cú pháp', value: `\`/${action} <lý do>\`` },
                { name: 'Ví dụ', value: `\`/${action} Đã giải quyết xong\`` }
            )
            .setFooter({ text: 'Hãy thử lại với lý do cụ thể.' });

        await message.reply({ embeds: [embed] });
    }

    /**
     * Hiển thị hướng dẫn whitelist/blacklist
     */
    private async showWhitelistBlacklistHelp(message: Message, listType: string): Promise<void> {
        const embed = new EmbedBuilder()
            .setColor(0xffcc00)
            .setTitle(`⚠️ Cú pháp /${listType}`)
            .setDescription(`Thêm vào **${listType}** cần có đủ thông tin.`)
            .addFields(
                { name: 'Cú pháp', value: `\`/${listType} <type> <value> <reason>\`` },
                { name: 'Types có sẵn', value: '`EMAIL`, `EMAIL_DOMAIN`, `IP_V4`, `IP_V6`, `REGION_COUNTRY`, `REGION_CITY`' },
                { name: 'Ví dụ', value: `\`/${listType} EMAIL spam@example.com Spam nhiều lần\`\n\`/${listType} EMAIL_DOMAIN spam.com Known spammer domain\`` }
            )
            .setFooter({ text: 'Hãy thử lại với đầy đủ thông tin.' });

        await message.reply({ embeds: [embed] });
    }

    /**
     * Hiển thị hướng dẫn remove whitelist/blacklist
     */
    private async showRemoveListHelp(message: Message, listType: string): Promise<void> {
        const embed = new EmbedBuilder()
            .setColor(0xffcc00)
            .setTitle(`⚠️ Cú pháp /remove-${listType}`)
            .setDescription(`Xóa khỏi **${listType}** cần có đủ thông tin.`)
            .addFields(
                { name: 'Cú pháp', value: `\`/remove-${listType} <type> <value>\`` },
                { name: 'Ví dụ', value: `\`/remove-${listType} EMAIL user@example.com\`` }
            )
            .setFooter({ text: 'Hãy thử lại với đầy đủ thông tin.' });

        await message.reply({ embeds: [embed] });
    }

    /**
     * Hiển thị hướng dẫn priority
     */
    private async showPriorityHelp(message: Message): Promise<void> {
        const embed = new EmbedBuilder()
            .setColor(0xffcc00)
            .setTitle('⚠️ Cú pháp /priority')
            .setDescription('Đặt độ ưu tiên cho ticket.')
            .addFields(
                { name: 'Cú pháp', value: '`/priority <level>`' },
                { name: 'Levels có sẵn', value: '`LOW` - Thấp\n`MEDIUM` - Trung bình\n`HIGH` - Cao\n`URGENT` - Khẩn cấp' },
                { name: 'Ví dụ', value: '`/priority HIGH`' }
            )
            .setFooter({ text: 'Hãy thử lại với level hợp lệ.' });

        await message.reply({ embeds: [embed] });
    }

    /**
     * Xử lý auto-support với Coze AI
     * Khi user gửi tin nhắn trong channel được chỉ định, bot sẽ tự động reply với AI
     */
    private async handleAutoSupport(message: Message): Promise<void> {
        const channel = message.channel as TextChannel;

        // Bypass AI auto-reply nếu user có staff role
        if (this.staffRoleIds.length > 0 && message.member) {
            const hasStaffRole = message.member.roles.cache.some(role => this.staffRoleIds.includes(role.id));
            if (hasStaffRole) {
                this.logger.debug(`Bypassing AI auto-reply for staff member: ${message.author.username}`);
                return;
            }
        }

        try {
            // Hiển thị typing indicator
            await channel.sendTyping();

            // Gọi Coze AI để lấy response
            const result = await this.cozeService.chat(
                message.content,
                `discord-${channel.id}`, // sessionId theo channel
                `discord-${message.author.id}`, // userId
                {
                    discordChannelId: channel.id,
                    discordUserId: message.author.id,
                },
            );

            if (result.success) {
                // Gửi response như embed
                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setDescription(result.content)
                    .setFooter({ text: '🤖 Powered by GEN HUB' })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            } else {
                // Gửi thông báo lỗi
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setDescription('❌ Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau.')
                    .setFooter({ text: result.error || 'Unknown error' })
                    .setTimestamp();

                await message.reply({ embeds: [errorEmbed] });
            }
        } catch (error) {
            this.logger.error(`Auto-support error in channel ${channel.id}:`, error);
            await message.react('❌').catch(() => { });
        }
    }
}

