import { BaseSeeder } from '../base.seeder';
import { PrismaClient, ContactListType, ContactListMatchType } from '@prisma/client';

/**
 * Seeder cho dữ liệu Contact List (Blacklist/Whitelist filtering)
 */
export class ContactListSeeder extends BaseSeeder {
    private adminId: string | null = null;

    constructor(prisma: PrismaClient) {
        super(prisma, 'ContactListSeeder');
    }

    setAdminId(adminId: string) {
        this.adminId = adminId;
    }

    async run(): Promise<void> {
        if (process.env.SEED_CONTACT_LIST !== 'true') return;

        try {
            const existingCount = await this.prisma.contactListEntry.count({
                where: { is_deleted: false },
            });

            if (existingCount > 0) {
                this.logger.log('⏭️  Contact list entries already exist, skipping...');
                return;
            }

            // Blacklist entries - Example spam sources
            const blacklistEntries = [
                // Email blacklist
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.EMAIL,
                    value: 'spam@example.com',
                    reason: 'Known spam account',
                    notes: 'Repeatedly sent spam messages',
                },
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.EMAIL,
                    value: 'abuse@malicious.com',
                    reason: 'Abusive content sender',
                    notes: 'Multiple reports from customer service team',
                },
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.EMAIL,
                    value: 'scammer123@fraud.net',
                    reason: 'Confirmed scammer',
                    notes: 'Attempted phishing attack',
                },

                // Domain blacklist
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.EMAIL_DOMAIN,
                    value: '@spam-domain.xyz',
                    reason: 'Known spam domain',
                    notes: 'All emails from this domain are spam',
                },
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.EMAIL_DOMAIN,
                    value: '@disposable-mail.com',
                    reason: 'Disposable email service',
                    notes: 'High rate of fake registrations',
                },
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.EMAIL_DOMAIN,
                    value: '@tempmail.org',
                    reason: 'Temporary email service',
                    notes: 'Used for spam and abuse',
                },

                // IP blacklist (IPv4)
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.IP_V4,
                    value: '192.168.100.50',
                    reason: 'Suspicious activity detected',
                    notes: 'Multiple failed login attempts',
                },
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.IP_V4,
                    value: '203.0.113.42',
                    reason: 'Known bot source',
                    notes: 'Automated spam submissions',
                },
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.IP_V4,
                    value: '198.51.100.89',
                    reason: 'DDoS attack source',
                    notes: 'Participated in DDoS attack',
                },

                // IP blacklist (IPv6)
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.IP_V6,
                    value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
                    reason: 'Malicious traffic source',
                    notes: 'Detected by security system',
                },
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.IP_V6,
                    value: '2001:db8:3333:4444:5555:6666:7777:8888',
                    reason: 'Bot network node',
                    notes: 'Part of known botnet',
                },

                // Location blacklist - Country
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.REGION_COUNTRY,
                    value: 'XX',
                    country_code: 'XX',
                    reason: 'High spam rate from this country',
                    notes: 'Temporary block due to spam wave',
                },
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.REGION_COUNTRY,
                    value: 'ZZ',
                    country_code: 'ZZ',
                    reason: 'Service not available in this region',
                    notes: 'Geographic restriction',
                },

                // Location blacklist - City
                {
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.REGION_CITY,
                    value: 'TEST_CITY',
                    country_code: 'US',
                    city_code: 'TEST',
                    reason: 'High fraud rate from this location',
                    notes: 'Multiple fraud attempts detected',
                },
            ];

            // Whitelist entries - Trusted sources
            const whitelistEntries = [
                // Email whitelist
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.EMAIL,
                    value: 'vip@trusted-partner.com',
                    reason: 'VIP customer',
                    notes: 'Premium partner account',
                },
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.EMAIL,
                    value: 'support@enterprise-client.com',
                    reason: 'Enterprise customer',
                    notes: 'High-value customer with priority support',
                },
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.EMAIL,
                    value: 'admin@partner-company.vn',
                    reason: 'Business partner',
                    notes: 'Strategic business partnership',
                },

                // Domain whitelist
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.EMAIL_DOMAIN,
                    value: '@trusted-company.com',
                    reason: 'Verified business partner',
                    notes: 'All employees from this company are trusted',
                },
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.EMAIL_DOMAIN,
                    value: '@vip-clients.com',
                    reason: 'VIP customer domain',
                    notes: 'Premium service tier customers',
                },
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.EMAIL_DOMAIN,
                    value: '@government.vn',
                    reason: 'Government entity',
                    notes: 'Official government communications',
                },

                // IP whitelist (IPv4)
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.IP_V4,
                    value: '203.0.113.100',
                    reason: 'Company office IP',
                    notes: 'Main office connection',
                },
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.IP_V4,
                    value: '198.51.100.200',
                    reason: 'Partner office IP',
                    notes: 'Trusted partner network',
                },
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.IP_V4,
                    value: '192.0.2.50',
                    reason: 'VIP client dedicated IP',
                    notes: 'Enterprise customer dedicated connection',
                },

                // IP whitelist (IPv6)
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.IP_V6,
                    value: '2001:db8:1234:5678:9abc:def0:1234:5678',
                    reason: 'Corporate IPv6 range',
                    notes: 'Main office IPv6 address',
                },
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.IP_V6,
                    value: '2001:db8:aaaa:bbbb:cccc:dddd:eeee:ffff',
                    reason: 'Partner IPv6 address',
                    notes: 'Strategic partner network',
                },

                // Location whitelist - Country
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.REGION_COUNTRY,
                    value: 'VN',
                    country_code: 'VN',
                    reason: 'Primary market country',
                    notes: 'Vietnam - main service region',
                },
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.REGION_COUNTRY,
                    value: 'SG',
                    country_code: 'SG',
                    reason: 'Strategic market',
                    notes: 'Singapore - premium market',
                },
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.REGION_COUNTRY,
                    value: 'US',
                    country_code: 'US',
                    reason: 'Enterprise customer region',
                    notes: 'United States - major enterprise clients',
                },

                // Location whitelist - City
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.REGION_CITY,
                    value: 'HCM',
                    country_code: 'VN',
                    city_code: 'HCM',
                    reason: 'Headquarters location',
                    notes: 'Ho Chi Minh City - main office',
                },
                {
                    list_type: ContactListType.WHITELIST,
                    match_type: ContactListMatchType.REGION_CITY,
                    value: 'HN',
                    country_code: 'VN',
                    city_code: 'HN',
                    reason: 'Branch office location',
                    notes: 'Hanoi - branch office',
                },
            ];

            // Combine all entries
            const allEntries = [...blacklistEntries, ...whitelistEntries];

            // Create all entries
            await this.prisma.contactListEntry.createMany({
                data: allEntries.map((entry) => ({
                    ...entry,
                    created_by: this.adminId,
                    is_active: true,
                    is_deleted: false,
                })),
            });

            this.logger.log(
                `✅ Contact list seeded: ${blacklistEntries.length} blacklist + ${whitelistEntries.length} whitelist entries`,
            );
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed contact list: ${errorMessage}`);
        }
    }
}
