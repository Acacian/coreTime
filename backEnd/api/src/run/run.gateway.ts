import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Body, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT, SOCKET_EVENT } from '../common/utils';
import { ResponseCodeBlockDto } from './dto/response-codeblock.dto';
import { RequestRunPipe } from './pipes/saveCode.pipe';
import { RequestCodeBlockDto } from './dto/request-codeblock.dto';
import { RunService } from './run.service';

@WebSocketGateway({ namespace: SOCKET_EVENT.NAME_SPACE, cors: true })
export class RunGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RunGateway.name);
  private connectedSockets: Map<string, Socket> = new Map();
  private subscriberClient: Redis;

  constructor(
    private configService: ConfigService,
    private runService: RunService,
  ) {
    this.subscriberClient = new Redis({
      port: configService.get<number>('REDIS_PORT'),
      host: configService.get<string>('REDIS_HOST'),
      password: configService.get<string>('REDIS_PASSWORD'),
    });
  }

  handleConnection(socket: Socket) {
    this.logger.log(`connected: ${socket.id}`);
    this.connectedSockets.set(socket.id, socket);
  }

  @SubscribeMessage(SOCKET_EVENT.REQUEST)
  async requestRunCode(
    @ConnectedSocket() socket: Socket,
    @Body(RequestRunPipe) codeBlock: RequestCodeBlockDto,
  ) {
    await this.runService.requestRunningMQPubSub(codeBlock, socket.id);
  }

  @OnEvent(EVENT.COMPLETE)
  answer(data) {
    this.logger.log(`received running result ${JSON.stringify(data)}`);
    const socket = this.connectedSockets.get(data.socketID);
    if (socket) {
      const response = new ResponseCodeBlockDto(
        data.statusCode,
        data.result,
        data.message,
      );
      socket.emit(SOCKET_EVENT.DONE, response);
    }
  }

  @SubscribeMessage(SOCKET_EVENT.DISCONNECT)
  disconnect(@ConnectedSocket() socket: Socket) {
    this.connectedSockets.delete(socket.id);
  }
}
