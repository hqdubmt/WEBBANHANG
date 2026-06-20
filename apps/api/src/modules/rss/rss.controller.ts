import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { RssService } from './rss.service';
import { Public } from '../auth/auth.guard';

@Controller('rss')
export class RssController {
  constructor(private readonly rss: RssService) {}

  @Public()
  @Get('deals')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=1800')
  async getDeals(@Res() res: Response): Promise<void> {
    const xml = await this.rss.getDealsXml();
    res.send(xml);
  }
}
