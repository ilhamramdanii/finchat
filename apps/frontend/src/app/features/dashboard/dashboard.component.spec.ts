import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TransactionStore } from '../../store/transaction.store';

describe('DashboardComponent QA Automation', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let store: TransactionStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(TransactionStore);
    fixture.detectChanges();
  });

  it('should render Apple Wallet Titanium card and initialize with balance unhidden', () => {
    expect(component.balanceHidden()).toBeFalse();
    component.toggleBalance();
    expect(component.balanceHidden()).toBeTrue();
  });

  it('should calculate financial health score based on savings ratio correctly', () => {
    store.setMonth({
      totalIncome: 10000000,
      totalExpense: 4000000,
      balance: 6000000,
    });

    expect(component.savingsRate()).toBe(60);
    expect(component.healthScore()).toBe(92);
    expect(component.healthGrade()).toBe('Sangat Baik');
  });
});
