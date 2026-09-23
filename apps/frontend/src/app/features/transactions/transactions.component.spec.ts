import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransactionsComponent } from './transactions.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TransactionStore } from '../../store/transaction.store';
import { I18nService } from '../../core/services/i18n.service';
import { Transaction } from '@wa-finance/shared';

describe('TransactionsComponent QA Automation', () => {
  let component: TransactionsComponent;
  let fixture: ComponentFixture<TransactionsComponent>;
  let store: TransactionStore;
  let i18n: I18nService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(TransactionStore);
    i18n = TestBed.inject(I18nService);
    fixture.detectChanges();
  });

  it('should initialize with form closed and default filter ALL', () => {
    expect(component.formOpen()).toBeFalse();
    expect(component.typeFilter()).toBe('ALL');
  });

  it('should open and prefill add form with today date and default EXPENSE', () => {
    component.openAdd();
    expect(component.formOpen()).toBeTrue();
    expect(component.addForm.get('type')?.value).toBe('EXPENSE');
    expect(component.addForm.get('paymentMethod')?.value).toBe('CASH');
  });

  it('should filter transactions accurately based on query and type', () => {
    const mockTxs: Transaction[] = [
      {
        id: '1',
        userId: 'u1',
        amount: 50000,
        type: 'EXPENSE',
        paymentMethod: 'CASH',
        description: 'Beli Kopi',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        categoryId: 'c1',
        source: 'MANUAL',
        rawMessage: '',
      },
      {
        id: '2',
        userId: 'u1',
        amount: 2500000,
        type: 'INCOME',
        paymentMethod: 'TRANSFER',
        description: 'Gaji Freelance',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        categoryId: 'c2',
        source: 'MANUAL',
        rawMessage: '',
      }
    ];

    store.setTransactions(mockTxs, 2);

    expect(component.filteredTransactions().length).toBe(2);

    // Filter by INCOME
    component.typeFilter.set('INCOME');
    expect(component.filteredTransactions().length).toBe(1);
    expect(component.filteredTransactions()[0].description).toBe('Gaji Freelance');

    // Filter by search keyword
    component.typeFilter.set('ALL');
    component.searchQuery.set('Kopi');
    expect(component.filteredTransactions().length).toBe(1);
    expect(component.filteredTransactions()[0].description).toBe('Beli Kopi');
  });
});
