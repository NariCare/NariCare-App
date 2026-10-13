import { testImports } from 'src/testing/test-imports';
import { ExpertConsultationsPageModule } from './expert-consultations.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpertConsultationsPage } from './expert-consultations.page';

describe('ExpertConsultationsPage', () => {
  let component: ExpertConsultationsPage;
  let fixture: ComponentFixture<ExpertConsultationsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [...testImports, ExpertConsultationsPageModule] });
    fixture = TestBed.createComponent(ExpertConsultationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
