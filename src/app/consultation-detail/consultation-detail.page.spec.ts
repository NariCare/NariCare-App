import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultationDetailPage } from './consultation-detail.page';

describe('ConsultationDetailPage', () => {
  let component: ConsultationDetailPage;
  let fixture: ComponentFixture<ConsultationDetailPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(ConsultationDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
