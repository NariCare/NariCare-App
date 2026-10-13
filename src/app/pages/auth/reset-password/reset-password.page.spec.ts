import { testImports } from 'src/testing/test-imports';
import { ResetPasswordPageModule } from './reset-password.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResetPasswordPage } from './reset-password.page';

describe('ResetPasswordPage', () => {
  let component: ResetPasswordPage;
  let fixture: ComponentFixture<ResetPasswordPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [...testImports, ResetPasswordPageModule] });
    fixture = TestBed.createComponent(ResetPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
