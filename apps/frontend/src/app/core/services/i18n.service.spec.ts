import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService QA Automation', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(I18nService);
  });

  it('should default to Indonesian or stored language', () => {
    expect(service.currentLang()).toBe('id');
    expect(service.t().navOverview).toBe('Ringkasan');
    expect(service.t().recordCash).toBe('Catat Kas');
  });

  it('should toggle and switch completely to English', () => {
    service.setLanguage('en');
    expect(service.currentLang()).toBe('en');
    expect(service.t().navOverview).toBe('Overview');
    expect(service.t().navLedger).toBe('Ledger');
    expect(service.t().recordCash).toBe('Add Entry');
    expect(service.t().walletTitle).toBe('Wallets & Accounts');
    expect(localStorage.getItem('app-lang')).toBe('en');
  });

  it('should toggle language back and forth seamlessly', () => {
    service.toggle();
    expect(service.currentLang()).toBe('en');
    service.toggle();
    expect(service.currentLang()).toBe('id');
  });
});
