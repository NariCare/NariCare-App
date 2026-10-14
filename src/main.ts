import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Chrome fires this once, often before Profile opens; keep it for the Install app button
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  (window as any).deferredInstallPrompt = event;
});

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));