import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

registerLocaleData(localeId);

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
