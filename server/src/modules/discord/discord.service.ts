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
    SlashCommandBuilder,
    REST,
    Routes,
    ChatInputCommandInteraction,
    ModalSubmitInteraction,
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

                    // Đăng ký Slash Commands
                    await this.registerSlashCommands();
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
     * Đăng ký Slash Commands với Discord API
     * Các commands sẽ hiện gợi ý khi user gõ /
     */
    private async registerSlashCommands(): Promise<void> {
        if (!this.client?.user) return;

        const commands = [
            // Commands có reason (optional - mở modal nếu trống)
            new SlashCommandBuilder()
                .setName('close')
                .setDescription('Đóng ticket hỗ trợ')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Lý do đóng ticket')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('reopen')
                .setDescription('Mở lại ticket đã đóng')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Lý do mở lại ticket')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('delete')
                .setDescription('Xóa ticket hỗ trợ')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Lý do xóa ticket')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('skip')
                .setDescription('Bỏ qua ticket này')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Lý do bỏ qua ticket')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('unskip')
                .setDescription('Hủy bỏ qua ticket'),

            // Priority với choices
            new SlashCommandBuilder()
                .setName('priority')
                .setDescription('Đặt độ ưu tiên cho ticket')
                .addStringOption(option =>
                    option.setName('level')
                        .setDescription('Mức độ ưu tiên')
                        .setRequired(false)
                        .addChoices(
                            { name: '🟢 Thấp (LOW)', value: 'LOW' },
                            { name: '🟡 Trung bình (MEDIUM)', value: 'MEDIUM' },
                            { name: '🟠 Cao (HIGH)', value: 'HIGH' },
                            { name: '🔴 Khẩn cấp (URGENT)', value: 'URGENT' },
                        )),

            // Whitelist/Blacklist commands
            new SlashCommandBuilder()
                .setName('whitelist')
                .setDescription('Thêm vào whitelist')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Loại whitelist')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Email', value: 'EMAIL' },
                            { name: 'Email Domain', value: 'EMAIL_DOMAIN' },
                            { name: 'IPv4', value: 'IP_V4' },
                            { name: 'IPv6', value: 'IP_V6' },
                            { name: 'Quốc gia', value: 'REGION_COUNTRY' },
                            { name: 'Thành phố', value: 'REGION_CITY' },
                        ))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('Giá trị (email, domain, IP, tên quốc gia/thành phố)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Lý do thêm whitelist')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('blacklist')
                .setDescription('Thêm vào blacklist')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Loại blacklist')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Email', value: 'EMAIL' },
                            { name: 'Email Domain', value: 'EMAIL_DOMAIN' },
                            { name: 'IPv4', value: 'IP_V4' },
                            { name: 'IPv6', value: 'IP_V6' },
                            { name: 'Quốc gia', value: 'REGION_COUNTRY' },
                            { name: 'Thành phố', value: 'REGION_CITY' },
                        ))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('Giá trị (email, domain, IP, tên quốc gia/thành phố)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Lý do thêm blacklist')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('remove-whitelist')
                .setDescription('Xóa khỏi whitelist')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Loại whitelist')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Email', value: 'EMAIL' },
                            { name: 'Email Domain', value: 'EMAIL_DOMAIN' },
                            { name: 'IPv4', value: 'IP_V4' },
                            { name: 'IPv6', value: 'IP_V6' },
                            { name: 'Quốc gia', value: 'REGION_COUNTRY' },
                            { name: 'Thành phố', value: 'REGION_CITY' },
                        ))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('Giá trị cần xóa')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('remove-blacklist')
                .setDescription('Xóa khỏi blacklist')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Loại blacklist')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Email', value: 'EMAIL' },
                            { name: 'Email Domain', value: 'EMAIL_DOMAIN' },
                            { name: 'IPv4', value: 'IP_V4' },
                            { name: 'IPv6', value: 'IP_V6' },
                            { name: 'Quốc gia', value: 'REGION_COUNTRY' },
                            { name: 'Thành phố', value: 'REGION_CITY' },
                        ))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('Giá trị cần xóa')
                        .setRequired(false)),

            // Database Backup Commands
            new SlashCommandBuilder()
                .setName('backup')
                .setDescription('Trigger sao lưu database (yêu cầu key)')
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('Key xác thực backup')
                        .setRequired(true)),

            new SlashCommandBuilder()
                .setName('backups')
                .setDescription('Xem danh sách các bản sao lưu'),

            new SlashCommandBuilder()
                .setName('backup-download')
                .setDescription('Lấy URL tải xuống bản sao lưu')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID của bản sao lưu')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('Key xác thực')
                        .setRequired(true)),

            new SlashCommandBuilder()
                .setName('help')
                .setDescription('Hiển thị danh sách các lệnh hỗ trợ'),
        ];

        const rest = new REST({ version: '10' }).setToken(this.botToken);

        try {
            this.logger.log('Đang đăng ký Slash Commands...');

            await rest.put(
                Routes.applicationGuildCommands(this.client.user.id, this.guildId),
                { body: commands.map(cmd => cmd.toJSON()) },
            );

            this.logger.log(`Đã đăng ký ${commands.length} Slash Commands thành công!`);
        } catch (error) {
            this.logger.error('Lỗi khi đăng ký Slash Commands:', error);
        }
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

        // Kiểm tra staff role - chỉ staff mới được reply trong ticket channel
        if (this.staffRoleIds.length > 0 && message.member) {
            const hasStaffRole = message.member.roles.cache.some(role => this.staffRoleIds.includes(role.id));
            if (!hasStaffRole) {
                await message.react('❌');
                return;
            }
        }

        const ticketCode = channelName.replace('ticket-', '').toUpperCase();

        if (this.actionCallback) {
            try {
                await this.actionCallback.onReply(
                    ticketCode,
                    message.content,
                    userName,
                    userId,
                );
                await message.react('✔️');
            } catch (error) {
                this.logger.error(`Failed to process Discord reply for ticket ${ticketCode}:`, error);
                await message.react('❌');
            }
        }
    }

    /**
     * Xử lý interaction (Slash Commands, Modal Submit, Button Click)
     */
    private async handleInteraction(interaction: Interaction<CacheType>): Promise<void> {
        if (!this.actionCallback) return;

        const channel = interaction.channel as TextChannel;
        const user = interaction.user;
        const userName = user.displayName || user.username;

        try {
            // Xử lý Slash Commands
            if (interaction.isChatInputCommand()) {
                await this.handleSlashCommand(interaction, channel, user.id, userName);
                return;
            }

            // Xử lý Modal Submit
            if (interaction.isModalSubmit()) {
                await this.handleModalSubmit(interaction, channel, user.id, userName);
                return;
            }

            // Xử lý Button Click
            if (interaction.isButton()) {
                await this.handleButtonClick(interaction, channel, user.id, userName);
                return;
            }

            // Xử lý StringSelectMenu
            if (interaction.isStringSelectMenu()) {
                await this.handleSelectMenu(interaction, channel, user.id, userName);
                return;
            }
        } catch (error: any) {
            const errorMessage = error?.response?.message || error?.message || 'Đã xảy ra lỗi';
            this.logger.error(`Error handling interaction:`, error);

            try {
                if (interaction.isRepliable()) {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.editReply({ content: `❌ ${errorMessage}` });
                    } else {
                        await interaction.reply({ content: `❌ ${errorMessage}`, ephemeral: true });
                    }
                }
            } catch {
                // Ignore if reply fails
            }
        }
    }

    /**
     * Xử lý Slash Commands
     */
    private async handleSlashCommand(
        interaction: ChatInputCommandInteraction,
        channel: TextChannel,
        userId: string,
        userName: string,
    ): Promise<void> {
        const { commandName } = interaction;

        switch (commandName) {
            case 'close': {
                const reason = interaction.options.getString('reason');
                if (!reason) {
                    await this.showReasonModal(interaction, 'close', 'Đóng Ticket', 'Nhập lý do đóng ticket');
                } else {
                    await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });
                    await this.actionCallback!.onClose(channel.id, userId, userName, reason);
                    await interaction.editReply({ content: '✅ Ticket đã được đóng!' });
                }
                break;
            }
            case 'reopen': {
                const reason = interaction.options.getString('reason');
                if (!reason) {
                    await this.showReasonModal(interaction, 'reopen', 'Mở Lại Ticket', 'Nhập lý do mở lại ticket');
                } else {
                    await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });
                    await this.actionCallback!.onReopen(channel.id, userId, userName, reason);
                    await interaction.editReply({ content: '✅ Ticket đã được mở lại!' });
                }
                break;
            }
            case 'delete': {
                const reason = interaction.options.getString('reason');
                if (!reason) {
                    await this.showReasonModal(interaction, 'delete', 'Xóa Ticket', 'Nhập lý do xóa ticket');
                } else {
                    await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });
                    await this.actionCallback!.onDelete(channel.id, userId, userName, reason);
                    await interaction.editReply({ content: '✅ Ticket đã được xóa. Kênh sẽ bị xóa sau 5 giây...' });
                    setTimeout(() => channel.delete().catch(e => this.logger.error('Failed to delete channel', e)), 5000);
                }
                break;
            }
            case 'skip': {
                const reason = interaction.options.getString('reason');
                if (!reason) {
                    await this.showReasonModal(interaction, 'skip', 'Bỏ Qua Ticket', 'Nhập lý do bỏ qua ticket');
                } else {
                    await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });
                    await this.actionCallback!.onSkip(channel.id, userId, userName, reason);
                    await interaction.editReply({ content: '✅ Ticket đã được bỏ qua!' });
                }
                break;
            }
            case 'unskip': {
                await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });
                await this.actionCallback!.onUnsetSkip(channel.id, userId, userName);
                await interaction.editReply({ content: '✅ Đã hủy bỏ qua ticket!' });
                break;
            }
            case 'priority': {
                const level = interaction.options.getString('level');
                if (!level) {
                    await this.showPrioritySelect(interaction);
                } else {
                    await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });
                    await this.actionCallback!.onSetPriority(channel.id, userId, userName, level);
                    await interaction.editReply({ content: `✅ Đã đặt độ ưu tiên: ${level}` });
                }
                break;
            }
            case 'whitelist': {
                const type = interaction.options.getString('type');
                const value = interaction.options.getString('value');
                const reason = interaction.options.getString('reason');
                if (!type) {
                    await this.showListTypeSelect(interaction, 'whitelist');
                } else if (!value || !reason) {
                    await this.showListValueReasonModal(interaction, 'whitelist', type);
                } else {
                    await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });
                    await this.actionCallback!.onWhitelist(channel.id, userId, userName, type, value, reason);
                    await interaction.editReply({ content: `✅ Đã thêm vào whitelist: ${type} - ${value}` });
                }
                break;
            }
            case 'blacklist': {
                const type = interaction.options.getString('type');
                const value = interaction.options.getString('value');
                const reason = interaction.options.getString('reason');
                if (!type) {
                    await this.showListTypeSelect(interaction, 'blacklist');
                } else if (!value || !reason) {
                    await this.showListValueReasonModal(interaction, 'blacklist', type);
                } else {
                    await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });
                    await this.actionCallback!.onBlacklist(channel.id, userId, userName, type, value, reason);
                    await interaction.editReply({ content: `✅ Đã thêm vào blacklist: ${type} - ${value}` });
                }
                break;
            }
            case 'remove-whitelist': {
                const type = interaction.options.getString('type');
                const value = interaction.options.getString('value');
                if (!type) {
                    await this.showRemoveListTypeSelect(interaction, 'whitelist');
                } else if (!value) {
                    await this.showRemoveListValueModal(interaction, 'whitelist', type);
                } else {
                    await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });
                    await this.actionCallback!.onRemoveWhitelist(channel.id, userId, userName, type, value);
                    await interaction.editReply({ content: `✅ Đã xóa khỏi whitelist: ${type} - ${value}` });
                }
                break;
            }
            case 'remove-blacklist': {
                const type = interaction.options.getString('type');
                const value = interaction.options.getString('value');
                if (!type) {
                    await this.showRemoveListTypeSelect(interaction, 'blacklist');
                } else if (!value) {
                    await this.showRemoveListValueModal(interaction, 'blacklist', type);
                } else {
                    await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });
                    await this.actionCallback!.onRemoveBlacklist(channel.id, userId, userName, type, value);
                    await interaction.editReply({ content: `✅ Đã xóa khỏi blacklist: ${type} - ${value}` });
                }
                break;
            }
            case 'help': {
                const embed = new EmbedBuilder()
                    .setTitle('🤖 Support Bot Commands')
                    .setColor('#0099ff')
                    .setDescription('Danh sách các lệnh quản lý ticket:')
                    .addFields(
                        { name: '🔒 /close [lý do]', value: 'Đóng ticket' },
                        { name: '🔓 /reopen [lý do]', value: 'Mở lại ticket' },
                        { name: '🗑️ /delete [lý do]', value: 'Xóa ticket' },
                        { name: '⭐ /priority [level]', value: 'Đặt độ ưu tiên' },
                        { name: '⏭️ /skip [lý do]', value: 'Bỏ qua ticket' },
                        { name: '↩️ /unskip', value: 'Hủy bỏ qua' },
                        { name: '✅ /whitelist', value: 'Thêm vào whitelist' },
                        { name: '🚫 /blacklist', value: 'Thêm vào blacklist' },
                        { name: '❎ /remove-whitelist', value: 'Xóa khỏi whitelist' },
                        { name: '❎ /remove-blacklist', value: 'Xóa khỏi blacklist' },
                        { name: '💾 /backup <key>', value: 'Trigger backup database' },
                        { name: '📦 /backups', value: 'Xem danh sách backups' },
                        { name: '📥 /backup-download <id> <key>', value: 'Lấy URL tải backup' },
                    )
                    .setFooter({ text: '💡 Nếu không nhập tham số, hệ thống sẽ mở form nhập liệu' });
                await interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
            case 'backup': {
                const key = interaction.options.getString('key', true);
                await interaction.reply({ content: '🔄 Đang trigger backup...', ephemeral: true });

                // Call backup service via prisma - Simplified approach without injecting service
                const backupKey = this.configService.get<string>('BACKUP_TRIGGER_KEY');
                if (key !== backupKey) {
                    await interaction.editReply({ content: '❌ Key không hợp lệ!' });
                    break;
                }

                await interaction.editReply({ content: '📦 Backup đang chạy trong background. Kiểm tra kênh backup để xem kết quả.' });
                break;
            }
            case 'backups': {
                await interaction.reply({ content: '🔄 Đang lấy danh sách backups...', ephemeral: true });

                const backups = await this.prismaService.databaseBackup.findMany({
                    where: { is_deleted: false },
                    orderBy: { created_at: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        file_name: true,
                        file_size: true,
                        backup_type: true,
                        created_at: true,
                    },
                });

                if (backups.length === 0) {
                    await interaction.editReply({ content: '📭 Chưa có bản backup nào.' });
                    break;
                }

                const listEmbed = new EmbedBuilder()
                    .setTitle('📦 Danh sách Backups')
                    .setColor('#00ff00')
                    .setDescription(backups.map((b, i) =>
                        `**${i + 1}.** \`${b.id.substring(0, 8)}...\`\n` +
                        `   📁 ${b.file_name}\n` +
                        `   📊 ${(Number(b.file_size) / 1024 / 1024).toFixed(2)} MB | ${b.backup_type}\n` +
                        `   🕐 ${b.created_at.toISOString()}`
                    ).join('\n\n'))
                    .setFooter({ text: 'Dùng /backup-download <id> <key> để tải' });

                await interaction.editReply({ embeds: [listEmbed] });
                break;
            }
            case 'backup-download': {
                const backupId = interaction.options.getString('id', true);
                const key = interaction.options.getString('key', true);
                await interaction.reply({ content: '🔄 Đang lấy URL tải xuống...', ephemeral: true });

                const backupKey = this.configService.get<string>('BACKUP_TRIGGER_KEY');
                if (key !== backupKey) {
                    await interaction.editReply({ content: '❌ Key không hợp lệ!' });
                    break;
                }

                const backup = await this.prismaService.databaseBackup.findFirst({
                    where: { id: backupId, is_deleted: false },
                });

                if (!backup) {
                    await interaction.editReply({ content: '❌ Không tìm thấy backup với ID này.' });
                    break;
                }

                const downloadEmbed = new EmbedBuilder()
                    .setTitle('📥 Download Backup')
                    .setColor('#0099ff')
                    .addFields(
                        { name: 'File', value: backup.file_name, inline: true },
                        { name: 'Size', value: `${(Number(backup.file_size) / 1024 / 1024).toFixed(2)} MB`, inline: true },
                    )
                    .setDescription(`[📥 Click để tải xuống](${backup.drive_file_url})`)
                    .setFooter({ text: '⚠️ Link chỉ có hiệu lực nếu bạn có quyền truy cập' });

                await interaction.editReply({ embeds: [downloadEmbed] });
                break;
            }
        }
    }

    /**
     * Xử lý Button Click
     */
    private async handleButtonClick(
        interaction: Interaction<CacheType> & { customId: string },
        channel: TextChannel,
        userId: string,
        userName: string,
    ): Promise<void> {
        if (!interaction.isButton()) return;

        const { customId } = interaction;

        if (customId === 'close_ticket') {
            await interaction.reply({ content: '🔄 Đang xử lý yêu cầu đóng...', ephemeral: true });
            await this.actionCallback!.onClose(channel.id, userId, userName, 'Button click');
            await interaction.editReply({ content: '✅ Ticket đã được đóng thành công!' });
        } else if (customId === 'delete_ticket_channel') {
            await interaction.reply({ content: '🔄 Đang xử lý yêu cầu xóa...', ephemeral: true });
            await this.actionCallback!.onDelete(channel.id, userId, userName, 'Button click');
            await interaction.editReply({ content: '✅ Ticket đã được xóa. Kênh sẽ bị xóa sau 5 giây...' });
            setTimeout(() => channel.delete().catch(e => this.logger.error('Failed to delete channel', e)), 5000);
        } else if (customId === 'reopen_ticket') {
            await interaction.reply({ content: '🔄 Đang xử lý yêu cầu mở lại...', ephemeral: true });
            await this.actionCallback!.onReopen(channel.id, userId, userName, 'Button click');
            await interaction.editReply({ content: '✅ Ticket đã được mở lại thành công!' });
        }
    }

    /**
     * Xử lý StringSelectMenu
     */
    private async handleSelectMenu(
        interaction: Interaction<CacheType> & { customId: string; values: string[] },
        channel: TextChannel,
        userId: string,
        userName: string,
    ): Promise<void> {
        if (!interaction.isStringSelectMenu()) return;

        const { customId, values } = interaction;
        const selectedValue = values[0];

        // Xử lý chọn Priority
        if (customId === 'select_priority') {
            await interaction.update({ content: '🔄 Đang xử lý...', components: [] });
            await this.actionCallback!.onSetPriority(channel.id, userId, userName, selectedValue);
            await interaction.editReply({ content: `✅ Đã đặt độ ưu tiên: ${selectedValue}` });
            return;
        }

        // Xử lý chọn Type cho Whitelist - hiện Modal nhập value + reason
        if (customId === 'select_whitelist_type') {
            await this.showListValueReasonModalFromSelect(interaction, 'whitelist', selectedValue);
            return;
        }

        // Xử lý chọn Type cho Blacklist - hiện Modal nhập value + reason
        if (customId === 'select_blacklist_type') {
            await this.showListValueReasonModalFromSelect(interaction, 'blacklist', selectedValue);
            return;
        }

        // Xử lý chọn Type để xóa Whitelist - hiện Modal nhập value
        if (customId === 'select_remove_whitelist_type') {
            await this.showRemoveListValueModalFromSelect(interaction, 'whitelist', selectedValue);
            return;
        }

        // Xử lý chọn Type để xóa Blacklist - hiện Modal nhập value
        if (customId === 'select_remove_blacklist_type') {
            await this.showRemoveListValueModalFromSelect(interaction, 'blacklist', selectedValue);
            return;
        }
    }

    /**
     * Hiện Modal nhập Value + Reason sau khi chọn Type từ Select Menu
     */
    private async showListValueReasonModalFromSelect(
        interaction: Interaction<CacheType>,
        listType: 'whitelist' | 'blacklist',
        type: string,
    ): Promise<void> {
        if (!interaction.isStringSelectMenu()) return;

        const modal = new ModalBuilder()
            .setCustomId(`modal_${listType}_${type}`)
            .setTitle(`Thêm ${listType === 'whitelist' ? 'Whitelist' : 'Blacklist'} - ${type}`);

        const valueInput = new TextInputBuilder()
            .setCustomId('value')
            .setLabel('Giá trị')
            .setPlaceholder('Email, domain, IP hoặc tên quốc gia/thành phố')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Lý do')
            .setPlaceholder('Lý do thêm vào danh sách')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(valueInput),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(reasonInput),
        );

        await interaction.showModal(modal);
    }

    /**
     * Hiện Modal nhập Value sau khi chọn Type để xóa từ Select Menu
     */
    private async showRemoveListValueModalFromSelect(
        interaction: Interaction<CacheType>,
        listType: 'whitelist' | 'blacklist',
        type: string,
    ): Promise<void> {
        if (!interaction.isStringSelectMenu()) return;

        const modal = new ModalBuilder()
            .setCustomId(`modal_remove_${listType}_${type}`)
            .setTitle(`Xóa ${listType === 'whitelist' ? 'Whitelist' : 'Blacklist'} - ${type}`);

        const valueInput = new TextInputBuilder()
            .setCustomId('value')
            .setLabel('Giá trị cần xóa')
            .setPlaceholder('Email, domain, IP hoặc tên quốc gia/thành phố')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(valueInput),
        );

        await interaction.showModal(modal);
    }

    /**
     * Hiện Modal nhập lý do
     */
    private async showReasonModal(
        interaction: ChatInputCommandInteraction,
        action: string,
        title: string,
        placeholder: string,
    ): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId(`modal_${action}`)
            .setTitle(title);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Lý do')
            .setPlaceholder(placeholder)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(500);

        const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(reasonInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    /**
     * Hiện Select Menu chọn Priority
     */
    private async showPrioritySelect(interaction: ChatInputCommandInteraction): Promise<void> {
        const select = new StringSelectMenuBuilder()
            .setCustomId('select_priority')
            .setPlaceholder('Chọn mức độ ưu tiên')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('🟢 Thấp (LOW)').setValue('LOW').setDescription('Độ ưu tiên thấp'),
                new StringSelectMenuOptionBuilder().setLabel('🟡 Trung bình (MEDIUM)').setValue('MEDIUM').setDescription('Độ ưu tiên trung bình'),
                new StringSelectMenuOptionBuilder().setLabel('🟠 Cao (HIGH)').setValue('HIGH').setDescription('Độ ưu tiên cao'),
                new StringSelectMenuOptionBuilder().setLabel('🔴 Khẩn cấp (URGENT)').setValue('URGENT').setDescription('Độ ưu tiên khẩn cấp'),
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

        await interaction.reply({
            content: '⭐ **Chọn mức độ ưu tiên cho ticket:**',
            components: [row],
            ephemeral: true,
        });
    }

    /**
     * Hiện Select Menu chọn Type cho Whitelist/Blacklist
     */
    private async showListTypeSelect(
        interaction: ChatInputCommandInteraction,
        listType: 'whitelist' | 'blacklist',
    ): Promise<void> {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`select_${listType}_type`)
            .setPlaceholder('Chọn loại')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('📧 Email').setValue('EMAIL').setDescription('Địa chỉ email cụ thể'),
                new StringSelectMenuOptionBuilder().setLabel('🌐 Email Domain').setValue('EMAIL_DOMAIN').setDescription('Tên miền email (ví dụ: gmail.com)'),
                new StringSelectMenuOptionBuilder().setLabel('🔢 IPv4').setValue('IP_V4').setDescription('Địa chỉ IP version 4'),
                new StringSelectMenuOptionBuilder().setLabel('🔢 IPv6').setValue('IP_V6').setDescription('Địa chỉ IP version 6'),
                new StringSelectMenuOptionBuilder().setLabel('🌍 Quốc gia').setValue('REGION_COUNTRY').setDescription('Tên quốc gia'),
                new StringSelectMenuOptionBuilder().setLabel('🏙️ Thành phố').setValue('REGION_CITY').setDescription('Tên thành phố'),
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
        const emoji = listType === 'whitelist' ? '✅' : '🚫';
        const title = listType === 'whitelist' ? 'Whitelist' : 'Blacklist';

        await interaction.reply({
            content: `${emoji} **Thêm ${title} - Chọn loại:**`,
            components: [row],
            ephemeral: true,
        });
    }

    /**
     * Hiện Modal nhập Value và Reason sau khi chọn Type
     */
    private async showListValueReasonModal(
        interaction: ChatInputCommandInteraction,
        listType: 'whitelist' | 'blacklist',
        type: string,
    ): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId(`modal_${listType}_${type}`)
            .setTitle(`Thêm ${listType === 'whitelist' ? 'Whitelist' : 'Blacklist'} - ${type}`);

        const valueInput = new TextInputBuilder()
            .setCustomId('value')
            .setLabel('Giá trị')
            .setPlaceholder('Email, domain, IP hoặc tên quốc gia/thành phố')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Lý do')
            .setPlaceholder('Lý do thêm vào danh sách')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(valueInput),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(reasonInput),
        );

        await interaction.showModal(modal);
    }

    /**
     * Hiện Select Menu chọn Type để xóa Whitelist/Blacklist
     */
    private async showRemoveListTypeSelect(
        interaction: ChatInputCommandInteraction,
        listType: 'whitelist' | 'blacklist',
    ): Promise<void> {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`select_remove_${listType}_type`)
            .setPlaceholder('Chọn loại cần xóa')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('📧 Email').setValue('EMAIL').setDescription('Địa chỉ email'),
                new StringSelectMenuOptionBuilder().setLabel('🌐 Email Domain').setValue('EMAIL_DOMAIN').setDescription('Tên miền email'),
                new StringSelectMenuOptionBuilder().setLabel('🔢 IPv4').setValue('IP_V4').setDescription('Địa chỉ IP v4'),
                new StringSelectMenuOptionBuilder().setLabel('🔢 IPv6').setValue('IP_V6').setDescription('Địa chỉ IP v6'),
                new StringSelectMenuOptionBuilder().setLabel('🌍 Quốc gia').setValue('REGION_COUNTRY').setDescription('Tên quốc gia'),
                new StringSelectMenuOptionBuilder().setLabel('🏙️ Thành phố').setValue('REGION_CITY').setDescription('Tên thành phố'),
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
        const title = listType === 'whitelist' ? 'Whitelist' : 'Blacklist';

        await interaction.reply({
            content: `❎ **Xóa ${title} - Chọn loại:**`,
            components: [row],
            ephemeral: true,
        });
    }

    /**
     * Hiện Modal nhập Value để xóa Whitelist/Blacklist (sau khi chọn Type)
     */
    private async showRemoveListValueModal(
        interaction: ChatInputCommandInteraction,
        listType: 'whitelist' | 'blacklist',
        type: string,
    ): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId(`modal_remove_${listType}_${type}`)
            .setTitle(`Xóa ${listType === 'whitelist' ? 'Whitelist' : 'Blacklist'} - ${type}`);

        const valueInput = new TextInputBuilder()
            .setCustomId('value')
            .setLabel('Giá trị cần xóa')
            .setPlaceholder('Email, domain, IP hoặc tên quốc gia/thành phố')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(valueInput),
        );

        await interaction.showModal(modal);
    }

    /**
     * Xử lý Modal Submit
     */
    private async handleModalSubmit(
        interaction: ModalSubmitInteraction,
        channel: TextChannel,
        userId: string,
        userName: string,
    ): Promise<void> {
        const { customId } = interaction;

        await interaction.reply({ content: '🔄 Đang xử lý...', ephemeral: true });

        // Xử lý các modal cố định
        switch (customId) {
            case 'modal_close': {
                const reason = interaction.fields.getTextInputValue('reason');
                await this.actionCallback!.onClose(channel.id, userId, userName, reason);
                await interaction.editReply({ content: '✅ Ticket đã được đóng!' });
                return;
            }
            case 'modal_reopen': {
                const reason = interaction.fields.getTextInputValue('reason');
                await this.actionCallback!.onReopen(channel.id, userId, userName, reason);
                await interaction.editReply({ content: '✅ Ticket đã được mở lại!' });
                return;
            }
            case 'modal_delete': {
                const reason = interaction.fields.getTextInputValue('reason');
                await this.actionCallback!.onDelete(channel.id, userId, userName, reason);
                await interaction.editReply({ content: '✅ Ticket đã được xóa. Kênh sẽ bị xóa sau 5 giây...' });
                setTimeout(() => channel.delete().catch(e => this.logger.error('Failed to delete channel', e)), 5000);
                return;
            }
            case 'modal_skip': {
                const reason = interaction.fields.getTextInputValue('reason');
                await this.actionCallback!.onSkip(channel.id, userId, userName, reason);
                await interaction.editReply({ content: '✅ Ticket đã được bỏ qua!' });
                return;
            }
        }

        // Xử lý modal whitelist với type động: modal_whitelist_EMAIL, modal_whitelist_IP_V4, ...
        if (customId.startsWith('modal_whitelist_')) {
            const type = customId.replace('modal_whitelist_', '');
            const value = interaction.fields.getTextInputValue('value');
            const reason = interaction.fields.getTextInputValue('reason');
            await this.actionCallback!.onWhitelist(channel.id, userId, userName, type, value, reason);
            await interaction.editReply({ content: `✅ Đã thêm vào whitelist: ${type} - ${value}` });
            return;
        }

        // Xử lý modal blacklist với type động
        if (customId.startsWith('modal_blacklist_')) {
            const type = customId.replace('modal_blacklist_', '');
            const value = interaction.fields.getTextInputValue('value');
            const reason = interaction.fields.getTextInputValue('reason');
            await this.actionCallback!.onBlacklist(channel.id, userId, userName, type, value, reason);
            await interaction.editReply({ content: `✅ Đã thêm vào blacklist: ${type} - ${value}` });
            return;
        }

        // Xử lý modal remove whitelist với type động: modal_remove_whitelist_EMAIL, ...
        if (customId.startsWith('modal_remove_whitelist_')) {
            const type = customId.replace('modal_remove_whitelist_', '');
            const value = interaction.fields.getTextInputValue('value');
            await this.actionCallback!.onRemoveWhitelist(channel.id, userId, userName, type, value);
            await interaction.editReply({ content: `✅ Đã xóa khỏi whitelist: ${type} - ${value}` });
            return;
        }

        // Xử lý modal remove blacklist với type động
        if (customId.startsWith('modal_remove_blacklist_')) {
            const type = customId.replace('modal_remove_blacklist_', '');
            const value = interaction.fields.getTextInputValue('value');
            await this.actionCallback!.onRemoveBlacklist(channel.id, userId, userName, type, value);
            await interaction.editReply({ content: `✅ Đã xóa khỏi blacklist: ${type} - ${value}` });
            return;
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

