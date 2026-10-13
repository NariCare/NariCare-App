import { testImports } from 'src/testing/test-imports';
import { PersonalInfoPageModule } from './personal-info.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonalInfoPage } from './personal-info.page';

describe('PersonalInfoPage', () => {
  let component: PersonalInfoPage;
  let fixture: ComponentFixture<PersonalInfoPage>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [...testImports, PersonalInfoPageModule] });
    fixture = TestBed.createComponent(PersonalInfoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
