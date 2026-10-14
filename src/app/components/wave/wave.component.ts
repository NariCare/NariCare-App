import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Soft lavender wave divider from the sign-in design. 'top' ends the brand panel, 'bottom' is the footer wave. */
@Component({
  selector: 'app-wave',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // viewBox sized near phone proportions so the curves stay visible instead of flattening when stretched
  template: `
    <svg class="wave" [attr.viewBox]="variant === 'top' ? '0 0 390 64' : '0 0 390 72'"
         preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <ng-container *ngIf="variant === 'bottom'; else top">
        <path fill="#f4f0fe" d="M0,26 C70,6 140,8 210,24 C280,40 340,38 390,18 L390,72 L0,72 Z"/>
        <path fill="#ede9fa" d="M0,42 C80,26 150,30 220,42 C290,54 345,50 390,36 L390,72 L0,72 Z"/>
      </ng-container>
      <ng-template #top>
        <path fill="#f1eefb" d="M0,20 C80,2 170,4 250,18 C310,28 360,26 390,12 L390,64 L0,64 Z"/>
        <path fill="#fffcf9" d="M0,48 C70,28 160,24 240,36 C300,45 350,44 390,30 L390,64 L0,64 Z"/>
      </ng-template>
    </svg>
  `,
  styles: [`:host { display: block; line-height: 0; pointer-events: none; } .wave { width: 100%; height: 100%; display: block; }`]
})
export class WaveComponent {
  @Input() variant: 'top' | 'bottom' = 'bottom';
}
