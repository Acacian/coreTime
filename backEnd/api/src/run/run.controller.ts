import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { RunService } from './run.service';
import { RequestCodeblockDto } from './dto/request-codeblock.dto';
import { returnCode } from '../common/returnCode';
import { VulnerableException } from '../common/exception/exception';
import { ResponseCodeBlockDto } from './dto/response-codeblock.dto';
import { MqService } from '../mq/mq.service';
import { RedisService } from '../redis/redis.service';

@Controller('run')
export class RunController {
  data = 0;
  constructor(
    private mqService: MqService,
    private readonly runService: RunService,
    private redisService: RedisService,
  ) {}
  @HttpCode(200)
  @Post('v1')
  async requestRunCode(@Body() codeBlock: RequestCodeblockDto) {
    const { code } = codeBlock;
    const securityCheck = this.runService.securityCheck(code);
    if (securityCheck === returnCode['vulnerable']) {
      // fail
      throw new VulnerableException();
    }

    const result = await this.runService.requestRunningApi(codeBlock);
    const responseCodeBlockDto = new ResponseCodeBlockDto(
      200,
      result.result,
      'Running Python Code Success',
    );
    return responseCodeBlockDto;
  }

  @HttpCode(200)
  @Post('v2')
  async requestRunCodeV2(@Body() codeBlock: RequestCodeblockDto) {
    const { code } = codeBlock;
    const securityCheck = this.runService.securityCheck(code);
    if (securityCheck === returnCode['vulnerable']) {
      // fail
      throw new VulnerableException();
    }

    const result = await this.runService.requestRunningMQ(codeBlock);

    const responseCodeBlockDto = new ResponseCodeBlockDto(
      200,
      result,
      'Running Python Code Success',
    );
    return responseCodeBlockDto;
  }

  @Get('avgTime')
  showAvgTrialTime() {
    return this.redisService.showTrialTimeAvg();
  }
}
