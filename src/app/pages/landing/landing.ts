import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
import { LeadFormComponent } from '../lead-form/lead-form';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [Button, RouterLink, LeadFormComponent, AccordionModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class LandingPage {
  scrollToForm() {
    const formElement = document.getElementById('contact-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
