import { testImports } from 'src/testing/test-imports';
import { ConsultationDetailPageModule } from './consultation-detail.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultationDetailPage } from './consultation-detail.page';

describe('ConsultationDetailPage', () => {
  let component: ConsultationDetailPage;
  let fixture: ComponentFixture<ConsultationDetailPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [...testImports, ConsultationDetailPageModule] });
    fixture = TestBed.createComponent(ConsultationDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
