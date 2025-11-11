import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Interfaces
import { TaskStats } from '../../../../shared/interfaces/task.interface';

@Component({
  selector: 'app-native-task-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './native-task-stats.html',
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class NativeTaskStatsComponent {
  @Input({ required: true }) stats!: TaskStats;
}
