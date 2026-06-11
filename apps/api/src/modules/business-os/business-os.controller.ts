import { Controller, Get } from '@nestjs/common';
import { BusinessOsService } from './business-os.service';

@Controller('business-os')
export class BusinessOsController {
  constructor(private readonly svc: BusinessOsService) {}

  @Get('dashboard')
  dashboard() { return this.svc.getBosDashboard(); }

  @Get('funnel')
  funnel() { return this.svc.getBusinessFunnel(); }

  @Get('kpi')
  kpi() { return this.svc.getKpiFramework(); }

  @Get('intelligence')
  intelligence() { return this.svc.getBusinessIntelligence(); }

  @Get('priorities')
  priorities() { return this.svc.getPriorityIssues(); }

  @Get('plan')
  plan() { return this.svc.getAutonomousPlan(); }

  @Get('questions')
  questions() { return this.svc.getCoreQuestions(); }

  @Get('report/daily')
  dailyReport() { return this.svc.getDailyReport(); }

  @Get('report/weekly')
  weeklyReport() { return this.svc.getWeeklyReport(); }
}
