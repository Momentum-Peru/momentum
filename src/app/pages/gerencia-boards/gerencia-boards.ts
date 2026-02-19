import { Component } from '@angular/core';
import { TasksPage } from '../tasks/tasks';

/**
 * Página de gerencia que reutiliza el componente de tareas (Mi Área)
 */
@Component({
  selector: 'app-gerencia-boards',
  standalone: true,
  imports: [TasksPage],
  templateUrl: './gerencia-boards.html',
})
export class GerenciaBoardsPage {}
