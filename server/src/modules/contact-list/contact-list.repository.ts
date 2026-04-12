import { Injectable } from '@nestjs/common';
import { Prisma, ContactListType, ContactListMatchType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IContactListEntryWithRelations } from './interfaces';

/**
 * Repository xử lý database operations cho ContactListEntry
 */
@Injectable()
export class ContactListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ContactListEntryCreateInput,
  ): Promise<IContactListEntryWithRelations> {
    return this.prisma.contactListEntry.create({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ContactListEntryWhereInput;
    orderBy?: Prisma.ContactListEntryOrderByWithRelationInput;
  }): Promise<IContactListEntryWithRelations[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.contactListEntry.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  async count(where?: Prisma.ContactListEntryWhereInput): Promise<number> {
    return this.prisma.contactListEntry.count({ where });
  }

  async findById(id: string): Promise<IContactListEntryWithRelations | null> {
    return this.prisma.contactListEntry.findFirst({
      where: { id, is_deleted: false },
    });
  }

  async findByValue(
    listType: ContactListType,
    matchType: ContactListMatchType,
    value: string,
  ): Promise<IContactListEntryWithRelations | null> {
    return this.prisma.contactListEntry.findFirst({
      where: {
        list_type: listType,
        match_type: matchType,
        value: value.toLowerCase(),
        is_deleted: false,
        is_active: true,
      },
    });
  }

  async findByEmail(email: string): Promise<{
    blacklist: IContactListEntryWithRelations | null;
    whitelist: IContactListEntryWithRelations | null;
  }> {
    const lowerEmail = email.toLowerCase();
    const domain = `@${lowerEmail.split('@')[1]}`;

    // Tìm blacklist entry
    const blacklist = await this.prisma.contactListEntry.findFirst({
      where: {
        list_type: 'BLACKLIST',
        is_deleted: false,
        is_active: true,
        OR: [
          { match_type: 'EMAIL', value: lowerEmail },
          { match_type: 'EMAIL_DOMAIN', value: domain },
        ],
      },
    });

    // Tìm whitelist entry
    const whitelist = await this.prisma.contactListEntry.findFirst({
      where: {
        list_type: 'WHITELIST',
        is_deleted: false,
        is_active: true,
        OR: [
          { match_type: 'EMAIL', value: lowerEmail },
          { match_type: 'EMAIL_DOMAIN', value: domain },
        ],
      },
    });

    return { blacklist, whitelist };
  }

  async findByIP(ip: string): Promise<{
    blacklist: IContactListEntryWithRelations | null;
    whitelist: IContactListEntryWithRelations | null;
  }> {
    const isIPv6 = ip.includes(':');
    const matchType = isIPv6 ? 'IP_V6' : 'IP_V4';

    const blacklist = await this.prisma.contactListEntry.findFirst({
      where: {
        list_type: 'BLACKLIST',
        match_type: matchType,
        value: ip,
        is_deleted: false,
        is_active: true,
      },
    });

    const whitelist = await this.prisma.contactListEntry.findFirst({
      where: {
        list_type: 'WHITELIST',
        match_type: matchType,
        value: ip,
        is_deleted: false,
        is_active: true,
      },
    });

    return { blacklist, whitelist };
  }

  async findByRegion(
    countryCode: string,
    cityCode?: string,
  ): Promise<{
    blacklist: IContactListEntryWithRelations | null;
    whitelist: IContactListEntryWithRelations | null;
  }> {
    const conditions: any[] = [
      { match_type: 'REGION_COUNTRY', value: countryCode.toUpperCase() },
    ];

    if (cityCode) {
      conditions.push({
        match_type: 'REGION_CITY',
        country_code: countryCode.toUpperCase(),
        city_code: cityCode.toUpperCase(),
      });
    }

    const blacklist = await this.prisma.contactListEntry.findFirst({
      where: {
        list_type: 'BLACKLIST',
        is_deleted: false,
        is_active: true,
        OR: conditions,
      },
    });

    const whitelist = await this.prisma.contactListEntry.findFirst({
      where: {
        list_type: 'WHITELIST',
        is_deleted: false,
        is_active: true,
        OR: conditions,
      },
    });

    return { blacklist, whitelist };
  }

  async update(
    id: string,
    data: Prisma.ContactListEntryUpdateInput,
  ): Promise<IContactListEntryWithRelations> {
    return this.prisma.contactListEntry.update({
      where: { id },
      data,
    });
  }

  async softDelete(
    id: string,
    userId: string,
  ): Promise<IContactListEntryWithRelations> {
    return this.prisma.contactListEntry.update({
      where: { id },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  async findByIds(ids: string[]): Promise<IContactListEntryWithRelations[]> {
    return this.prisma.contactListEntry.findMany({
      where: { id: { in: ids }, is_deleted: false },
    });
  }

  async softDeleteMany(ids: string[], userId: string): Promise<void> {
    await this.prisma.contactListEntry.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  async deleteByValue(
    listType: ContactListType,
    matchType: ContactListMatchType,
    value: string,
    userId: string,
  ): Promise<boolean> {
    const entry = await this.prisma.contactListEntry.findFirst({
      where: {
        list_type: listType,
        match_type: matchType,
        value: value.toLowerCase(),
        is_deleted: false,
      },
    });

    if (!entry) return false;

    await this.prisma.contactListEntry.update({
      where: { id: entry.id },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    return true;
  }
}
