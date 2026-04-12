/**
 * Repository cho Organization Chat
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatCallStatus, ChatCallType, Prisma } from '@prisma/client';

@Injectable()
export class OrgChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMessages(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      keywords?: string;
    },
  ) {
    const { limit = 25, offset = 0, keywords } = options;

    const where: Prisma.OrganizationChatMessageWhereInput = {
      organization_id: organizationId,
      is_deleted: false,
    };

    if (keywords) {
      where.content = { contains: keywords, mode: 'insensitive' };
    }

    const [messages, total] = await Promise.all([
      this.prisma.organizationChatMessage.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.organizationChatMessage.count({ where }),
    ]);

    return { messages, total, limit, offset };
  }

  async findMessageById(id: string) {
    return this.prisma.organizationChatMessage.findFirst({
      where: { id, is_deleted: false },
    });
  }

  async createMessage(data: {
    organization_id: string;
    content: string;
    agora_message_id?: string;
    call_id?: string;
    created_by: string;
  }) {
    return this.prisma.organizationChatMessage.create({ data });
  }

  async createManyMessages(
    messages: {
      organization_id: string;
      content: string;
      agora_message_id: string;
      created_by: string;
      created_at?: Date;
    }[],
  ) {
    // Upsert để tránh duplicate
    // Upsert để tránh duplicate
    return Promise.all(
      messages.map((msg) =>
        this.prisma.organizationChatMessage.upsert({
          where: {
            organization_id_agora_message_id: {
              organization_id: msg.organization_id,
              agora_message_id: msg.agora_message_id,
            },
          },
          create: msg,
          update: {}, // Không update nếu đã tồn tại
        }),
      ),
    );
  }

  async deleteMessage(id: string, deletedBy: string) {
    return this.prisma.organizationChatMessage.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  async findCalls(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: ChatCallStatus;
    },
  ) {
    const { limit = 25, offset = 0, status } = options;

    const where: Prisma.OrganizationChatCallWhereInput = {
      organization_id: organizationId,
      is_deleted: false,
    };

    if (status) {
      where.status = status;
    }

    const [calls, total] = await Promise.all([
      this.prisma.organizationChatCall.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          participants: true,
        },
      }),
      this.prisma.organizationChatCall.count({ where }),
    ]);

    return { calls, total, limit, offset };
  }

  async findActiveCall(organizationId: string) {
    return this.prisma.organizationChatCall.findFirst({
      where: {
        organization_id: organizationId,
        status: { in: ['WAITING', 'ONGOING'] },
        is_deleted: false,
      },
      include: {
        participants: true,
      },
    });
  }

  async findCallById(id: string) {
    return this.prisma.organizationChatCall.findFirst({
      where: { id, is_deleted: false },
      include: {
        participants: true,
      },
    });
  }

  async createCall(data: {
    organization_id: string;
    call_type: ChatCallType;
    agora_channel_name: string;
    created_by: string;
  }) {
    return this.prisma.organizationChatCall.create({
      data: {
        ...data,
        status: 'WAITING',
      },
      include: {
        participants: true,
      },
    });
  }

  async updateCallStatus(id: string, status: ChatCallStatus, endedBy?: string) {
    const data: Prisma.OrganizationChatCallUpdateInput = { status };

    if (status === 'ONGOING') {
      data.started_at = new Date();
    } else if (status === 'ENDED') {
      data.ended_at = new Date();
      if (endedBy) data.ended_by = endedBy;
    }

    return this.prisma.organizationChatCall.update({
      where: { id },
      data,
      include: { participants: true },
    });
  }

  async addParticipant(data: {
    call_id: string;
    user_id: string;
    agora_uid: number;
  }) {
    return this.prisma.organizationChatCallParticipant.upsert({
      where: {
        call_id_user_id: {
          call_id: data.call_id,
          user_id: data.user_id,
        },
      },
      create: data,
      update: {
        is_active: true,
        left_at: null,
        joined_at: new Date(),
      },
    });
  }

  async removeParticipant(callId: string, userId: string) {
    return this.prisma.organizationChatCallParticipant.updateMany({
      where: {
        call_id: callId,
        user_id: userId,
      },
      data: {
        is_active: false,
        left_at: new Date(),
      },
    });
  }

  async getActiveParticipantsCount(callId: string) {
    return this.prisma.organizationChatCallParticipant.count({
      where: {
        call_id: callId,
        is_active: true,
      },
    });
  }
}
