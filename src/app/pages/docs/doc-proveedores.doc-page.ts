import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-doc-proveedores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doc-page.html',
  styleUrl: './doc-page.scss',
})
export class DocProveedoresPage {
  title = 'Proveedores';
  /** Contenido de la documentación: se puede reemplazar cuando se tenga el texto final */
  content = `
    <p>En esta sección se documentará el módulo de <strong>Proveedores</strong> del ERP.</p>
    <p>Aquí podrás describir: qué es el módulo, cómo se usa, pantallas principales, flujos y cualquier información relevante para los usuarios.</p>
  `;
}
