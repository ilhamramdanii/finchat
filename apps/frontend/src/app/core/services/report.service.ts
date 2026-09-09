import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { MonthlyReport, YearlyReport, RangeReport, DailyTotal } from '@wa-finance/shared';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiService);

  getMonthly(month?: number, year?: number) {
    return this.api.get<MonthlyReport>('reports/monthly', { month, year });
  }

  getYearly(year?: number) {
    return this.api.get<YearlyReport>('reports/yearly', { year });
  }

  getByRange(startDate: string, endDate: string) {
    return this.api.get<RangeReport>('reports/range', { startDate, endDate });
  }

  getDaily(month?: number, year?: number) {
    return this.api.get<DailyTotal[]>('reports/daily', { month, year });
  }

  getDailyRange(startDate: string, endDate: string) {
    return this.api.get<DailyTotal[]>('reports/daily-range', { startDate, endDate });
  }
}
