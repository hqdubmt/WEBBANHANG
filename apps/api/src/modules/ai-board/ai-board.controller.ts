import { Controller, Get } from '@nestjs/common';
import { AiBoardService } from './ai-board.service';

@Controller('ai-board')
export class AiBoardController {
  constructor(private readonly svc: AiBoardService) {}

  @Get('meeting')
  dailyMeeting() { return this.svc.runDailyBoardMeeting(); }

  @Get('ceo')
  ceo() { return this.svc.getCeoReport(); }

  @Get('cfo')
  cfo() { return this.svc.getCfoReport(); }

  @Get('coo')
  coo() { return this.svc.getCooReport(); }

  @Get('cto')
  cto() { return this.svc.getCtоReport(); }

  @Get('cmo')
  cmo() { return this.svc.getCmoReport(); }

  @Get('cro')
  cro() { return this.svc.getCroReport(); }

  @Get('cso')
  cso() { return this.svc.getCsoReport(); }
}
