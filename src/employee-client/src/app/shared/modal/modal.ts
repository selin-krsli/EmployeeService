import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closed.emit()',
  },
})
export class Modal {
  @Input({ required: true }) title!: string;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() closeOnBackdrop = true;
  @Input() scrollable = true;
  @Output() readonly closed = new EventEmitter<void>();

  constructor() {
    const body = inject(DOCUMENT).body;
    body.classList.add('modal-open');
    inject(DestroyRef).onDestroy(() => body.classList.remove('modal-open'));
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop && event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
