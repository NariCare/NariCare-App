import { testImports } from 'src/testing/test-imports';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CreateGroupModalComponent } from './create-group-modal.component';

describe('CreateGroupModalComponent', () => {
  let component: CreateGroupModalComponent;
  let fixture: ComponentFixture<CreateGroupModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateGroupModalComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    TestBed.configureTestingModule({ imports: [...testImports, FormsModule, ReactiveFormsModule] });
    fixture = TestBed.createComponent(CreateGroupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
