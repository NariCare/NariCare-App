import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class IconService {
  private iconCache: Map<string, SafeHtml> = new Map();

  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {}

  /**
   * Get SVG icon as SafeHtml
   */
  getIcon(iconName: string): Observable<SafeHtml> {
    console.log('IconService getIcon called for:', iconName);
    
    // Check cache first
    if (this.iconCache.has(iconName)) {
      console.log('Icon found in cache:', iconName);
      return new Observable(observer => {
        observer.next(this.iconCache.get(iconName)!);
        observer.complete();
      });
    }

    // Load SVG from assets
    console.log('Loading icon from assets:', `assets/${iconName}.svg`);
    return this.http.get(`assets/${iconName}.svg`, { responseType: 'text' }).pipe(
      map(svgContent => {
        console.log('SVG content loaded for:', iconName, svgContent.substring(0, 100) + '...');
        const sanitizedSvg = this.sanitizer.bypassSecurityTrustHtml(svgContent);
        this.iconCache.set(iconName, sanitizedSvg);
        return sanitizedSvg;
      }),
      catchError(error => {
        console.error('Error loading SVG:', iconName, error);
        throw error;
      })
    );
  }

  /**
   * Get baby icon based on gender
   */
  getBabyIcon(gender: 'male' | 'female' | string): Observable<SafeHtml> {
    const iconName = gender === 'female' ? 'Baby girl' : 'Baby boy';
    console.log('IconService getBabyIcon:', { gender, iconName });
    return this.getIcon(iconName);
  }

  /**
   * Get feeding type icon
   */
  getFeedingIcon(feedingType: 'breast' | 'expressed' | 'formula' | string): Observable<SafeHtml> {
    switch (feedingType) {
      case 'breast':
      case 'direct':
        return this.getIcon('Fed directly');
      case 'expressed':
      case 'pump':
        return this.getIcon('Pump');
      case 'formula':
        return this.getIcon('Formula');
      default:
        return this.getIcon('Feed');
    }
  }

  /**
   * Get tracker icon
   */
  getTrackerIcon(trackerType: 'weight' | 'feed' | 'emotional' | string): Observable<SafeHtml> {
    switch (trackerType) {
      case 'weight':
        return this.getIcon('Weight');
      case 'feed':
        return this.getIcon('Feed');
      case 'emotional':
        return this.getIcon('Emotional check-in');
      default:
        return this.getIcon(trackerType);
    }
  }

  /**
   * Clear icon cache
   */
  clearCache(): void {
    this.iconCache.clear();
  }

  /**
   * Preload commonly used icons
   */
  preloadIcons(): void {
    const commonIcons = [
      'Baby boy',
      'Baby girl', 
      'Feed',
      'Fed directly',
      'Formula',
      'Pump',
      'Weight',
      'Emotional check-in'
    ];

    commonIcons.forEach(icon => {
      this.getIcon(icon).subscribe();
    });
  }
}