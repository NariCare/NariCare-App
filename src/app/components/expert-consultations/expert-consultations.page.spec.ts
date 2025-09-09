import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ExpertConsultationsPage } from './expert-consultations.page';

describe('ExpertConsultationsPage', () => {
  let component: ExpertConsultationsPage;
  let fixture: ComponentFixture<ExpertConsultationsPage>;

  beforeEach(waitForAsync(() => {
    fixture = TestBed.createComponent(ExpertConsultationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
