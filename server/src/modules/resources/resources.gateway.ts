import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import {
  Logger,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ResourcesService } from './resources.service';
import type { ResourcesSubscribePayload } from './resources.interfaces';

/**
 * Resources WebSocket Gateway
 * Handle realtime resource metrics updates via Socket.io
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/resources',
  transports: ['websocket', 'polling'],
})
export class ResourcesGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ResourcesGateway.name);

  /** Set of authenticated socket IDs subscribed to resources */
  private subscribedSockets = new Set<string>();

  /** Interval for broadcasting metrics */
  private broadcastInterval: NodeJS.Timeout | null = null;

  /** Broadcast interval in ms (default: 5 seconds) */
  private readonly BROADCAST_INTERVAL_MS = 5000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly resourcesService: ResourcesService,
  ) {}

  onModuleInit() {
    // Broadcast interval will be started on-demand when clients subscribe
    this.logger.log(
      '📊 Resources Gateway ready (broadcast will start on first subscriber)',
    );
  }

  onModuleDestroy() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
      this.logger.log('📊 Resources broadcast stopped');
    }
  }

  afterInit() {
    this.logger.log('🔌 Resources WebSocket Gateway initialized');
  }

  /**
   * Handle client connection
   */
  async handleConnection(socket: Socket) {
    try {
      const token = this.extractToken(socket);

      if (!token) {
        this.logger.warn(
          `❌ Resources connection rejected: No token (${socket.id})`,
        );
        socket.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
        socket.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);
      if (!payload?.userId) {
        this.logger.warn(
          `❌ Resources connection rejected: Invalid token (${socket.id})`,
        );
        socket.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        });
        socket.disconnect();
        return;
      }

      // TODO: Check permission resources.admin
      // For now, allow any authenticated user

      socket.data.userId = payload.userId;
      this.logger.log(
        `✅ Resources client connected: ${socket.id} (User: ${payload.userId})`,
      );

      socket.emit('connected', {
        socketId: socket.id,
        userId: payload.userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error}`);
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Connection failed',
      });
      socket.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(socket: Socket) {
    this.subscribedSockets.delete(socket.id);
    this.stopBroadcastIfEmpty();
    this.logger.log(`❌ Resources client disconnected: ${socket.id}`);
  }

  /**
   * Handle subscription to resources updates
   */
  @SubscribeMessage('resources:subscribe')
  handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ResourcesSubscribePayload,
  ) {
    this.subscribedSockets.add(socket.id);
    this.startBroadcastIfNeeded();

    // Store filter preferences
    socket.data.filterServices = payload?.services || [];

    this.logger.log(`📊 Client ${socket.id} subscribed to resources`);

    // Send immediate update
    this.sendResourcesUpdate(socket);

    return { success: true, message: 'Subscribed to resources updates' };
  }

  /**
   * Handle unsubscription from resources updates
   */
  @SubscribeMessage('resources:unsubscribe')
  handleUnsubscribe(@ConnectedSocket() socket: Socket) {
    this.subscribedSockets.delete(socket.id);
    this.stopBroadcastIfEmpty();
    this.logger.log(`📊 Client ${socket.id} unsubscribed from resources`);

    return { success: true, message: 'Unsubscribed from resources updates' };
  }

  /**
   * Start broadcast interval if not already running and there are subscribers
   */
  private startBroadcastIfNeeded(): void {
    if (this.broadcastInterval) return; // Already running
    if (this.subscribedSockets.size === 0) return; // No subscribers

    this.broadcastInterval = setInterval(() => {
      this.broadcastResourcesUpdate();
    }, this.BROADCAST_INTERVAL_MS);

    this.logger.log(
      `📊 Resources broadcast STARTED (${this.subscribedSockets.size} subscriber(s))`,
    );
  }

  /**
   * Stop broadcast interval if no more subscribers
   */
  private stopBroadcastIfEmpty(): void {
    if (!this.broadcastInterval) return; // Not running
    if (this.subscribedSockets.size > 0) return; // Still has subscribers

    clearInterval(this.broadcastInterval);
    this.broadcastInterval = null;

    this.logger.log('📊 Resources broadcast STOPPED (no subscribers)');
  }

  /**
   * Broadcast resources update to all subscribed clients
   */
  private async broadcastResourcesUpdate() {
    if (this.subscribedSockets.size === 0) return;

    try {
      const [services, overview] = await Promise.all([
        this.resourcesService.getAllServicesMetrics(),
        this.resourcesService.getResourcesOverview(),
      ]);

      const updateEvent = {
        type: 'update',
        data: { services, overview },
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all subscribed sockets
      const socketsToRemove: string[] = [];
      for (const socketId of this.subscribedSockets) {
        const sockets = await this.server.fetchSockets();
        const socket = sockets.find((s) => s.id === socketId);
        if (socket) {
          const filterServices = socket.data.filterServices || [];

          // Filter services if requested
          let filteredServices = services;
          if (filterServices.length > 0) {
            filteredServices = services.filter((s) =>
              filterServices.includes(s.service),
            );
          }

          socket.emit('resources:update', {
            ...updateEvent,
            data: { services: filteredServices, overview },
          });
        } else {
          // Socket no longer exists, remove from subscribed
          socketsToRemove.push(socketId);
        }
      }
      socketsToRemove.forEach((id) => this.subscribedSockets.delete(id));
    } catch (error) {
      this.logger.error('Failed to broadcast resources update:', error);
    }
  }

  /**
   * Send immediate resources update to a specific socket
   */
  private async sendResourcesUpdate(socket: Socket) {
    try {
      const filterServices = socket.data.filterServices || [];

      const [services, overview] = await Promise.all([
        this.resourcesService.getAllServicesMetrics(
          filterServices.length > 0 ? filterServices : undefined,
        ),
        this.resourcesService.getResourcesOverview(),
      ]);

      socket.emit('resources:update', {
        type: 'update',
        data: { services, overview },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to send resources update:', error);
      socket.emit('error', {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch resources',
      });
    }
  }

  /**
   * Extract token from socket handshake
   */
  private extractToken(socket: Socket): string | null {
    const auth = socket.handshake.auth?.token;
    if (auth) return auth;

    const header = socket.handshake.headers?.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return (socket.handshake.query?.token as string) || null;
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<{ userId: string } | null> {
    try {
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      return { userId: payload.sub || payload.userId };
    } catch {
      return null;
    }
  }
}
