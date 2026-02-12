# Contact List Seed Data Documentation

## Overview
This seeder populates the `ContactListEntry` table with example blacklist and whitelist entries for filtering contact requests based on Email, Domain, IP addresses, and Location.

## Environment Variable
To enable this seeder, set the following environment variable:
```env
SEED_CONTACT_LIST=true
```

## Seed Data Structure

### Blacklist Entries (15 total)

#### Email Blacklist (3 entries)
- `spam@example.com` - Known spam account
- `abuse@malicious.com` - Abusive content sender
- `scammer123@fraud.net` - Confirmed scammer

#### Domain Blacklist (3 entries)
- `@spam-domain.xyz` - Known spam domain
- `@disposable-mail.com` - Disposable email service
- `@tempmail.org` - Temporary email service

#### IP Blacklist - IPv4 (3 entries)
- `192.168.100.50` - Suspicious activity detected
- `203.0.113.42` - Known bot source
- `198.51.100.89` - DDoS attack source

#### IP Blacklist - IPv6 (2 entries)
- `2001:0db8:85a3:0000:0000:8a2e:0370:7334` - Malicious traffic source
- `2001:db8:3333:4444:5555:6666:7777:8888` - Bot network node

#### Location Blacklist (4 entries)
- Country: `XX` - High spam rate country (example)
- Country: `ZZ` - Service not available region
- City: `TEST_CITY` (US) - High fraud rate location

### Whitelist Entries (19 total)

#### Email Whitelist (3 entries)
- `vip@trusted-partner.com` - VIP customer
- `support@enterprise-client.com` - Enterprise customer
- `admin@partner-company.vn` - Business partner

#### Domain Whitelist (3 entries)
- `@trusted-company.com` - Verified business partner
- `@vip-clients.com` - VIP customer domain
- `@government.vn` - Government entity

#### IP Whitelist - IPv4 (3 entries)
- `203.0.113.100` - Company office IP
- `198.51.100.200` - Partner office IP
- `192.0.2.50` - VIP client dedicated IP

#### IP Whitelist - IPv6 (2 entries)
- `2001:db8:1234:5678:9abc:def0:1234:5678` - Corporate IPv6 range
- `2001:db8:aaaa:bbbb:cccc:dddd:eeee:ffff` - Partner IPv6 address

#### Location Whitelist (8 entries)
- Country: `VN` - Vietnam (primary market)
- Country: `SG` - Singapore (strategic market)
- Country: `US` - United States (enterprise clients)
- City: `HCM` (VN) - Ho Chi Minh City (headquarters)
- City: `HN` (VN) - Hanoi (branch office)

## Usage

### Running the Seeder
The seeder will run automatically when the application starts if:
1. The environment variable `SEED_CONTACT_LIST=true` is set
2. The `ContactListEntry` table is empty

### Manual Execution
If you need to run the seeder manually, you can call it through the PrismaService:
```typescript
const contactListSeeder = new ContactListSeeder(prisma);
contactListSeeder.setAdminId(adminId);
await contactListSeeder.run();
```

## Notes

- All seed data is created with `is_active: true` and `is_deleted: false`
- Each entry includes a reason and notes for clarity
- The seeder will skip execution if entries already exist in the database
- All entries are created by the system admin user
- IP addresses and country codes used are examples and should be replaced with real data in production

## Data Structure

Each ContactListEntry contains:
- `list_type`: BLACKLIST or WHITELIST
- `match_type`: EMAIL, EMAIL_DOMAIN, IP_V4, IP_V6, REGION_COUNTRY, or REGION_CITY
- `value`: The actual value to match (email, domain, IP, country code, etc.)
- `country_code`: ISO 3166-1 alpha-2 country code (for location-based rules)
- `city_code`: City/province code (for city-based rules)
- `reason`: Why this entry was added
- `notes`: Additional context information
- `created_by`: Admin user ID
- `is_active`: Active status (true)
- `is_deleted`: Deletion status (false)
