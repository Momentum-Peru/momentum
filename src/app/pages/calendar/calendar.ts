import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { RadioButton } from 'primeng/radiobutton';
import { InputText } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [Button, Checkbox, RadioButton, InputText, FormsModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss'
})
export class Calendar {

  checked: boolean = false;
  radioValue: string = 'option1';

}
