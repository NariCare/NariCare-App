import { testImports } from 'src/testing/test-imports';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CustomIconComponent } from './custom-icon.component';

describe('CustomIconComponent', () => {
  let component: CustomIconComponent;
  let fixture: ComponentFixture<CustomIconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ CustomIconComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    TestBed.configureTestingModule({ imports: testImports });
    fixture = TestBed.createComponent(CustomIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
