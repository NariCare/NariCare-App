import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';
import { AngularFireModule } from '@angular/fire/compat';
import { environment } from 'src/environments/environment';

// Shared TestBed imports for page/component "should create" specs
export const testImports = [IonicModule.forRoot(), RouterTestingModule, HttpClientTestingModule, IonicStorageModule.forRoot(), AngularFireModule.initializeApp(environment.firebase)];
