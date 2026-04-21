import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MessageService } from 'primeng/api';

// PrimeNG — solo componentes complejos sin reemplazo nativo simple
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';

import { QuotesApiService } from '../../../shared/services/quotes-api.service';
import { ClientsApiService, ClientOption } from '../../../shared/services/clients-api.service';
import { ProjectsApiService } from '../../../shared/services/projects-api.service';
import { Quote, QuoteState } from '../../../shared/interfaces/quote.interface';
import { Project } from '../../../shared/interfaces/project.interface';

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    DatePickerModule,
    InputNumberModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './quote-form.html',
  styleUrl: './quote-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly quotesApi = inject(QuotesApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  quoteId = signal<string | null>(null);
  clients = signal<ClientOption[]>([]);
  projects = signal<Project[]>([]);
  loading = signal<boolean>(false);
  calculatedQuote = signal<Quote | null>(null);

  // Tab activo en sección de costos (0-6)
  activeCostTab = signal<number>(0);

  costTabs = [
    { label: 'Transporte', icon: 'pi-car', totalKey: 'totalVehicles' },
    { label: 'Personal', icon: 'pi-users', totalKey: 'totalPayrolls' },
    { label: 'Herramientas', icon: 'pi-wrench', totalKey: 'totalTools' },
    { label: 'Materiales', icon: 'pi-box', totalKey: 'totalMaterials' },
    { label: 'Uniformes/EPP', icon: 'pi-shield', totalKey: 'totalUniforms' },
    { label: 'Gastos', icon: 'pi-money-bill', totalKey: 'totalExpenses' },
    { label: 'Alojamiento', icon: 'pi-home', totalKey: 'totalAccommodations' },
  ] as const;

  // Totales calculados localmente (para mostrar en tiempo real)
  localItemsSubtotal = computed(() => {
    const items = this.quoteForm?.get('items')?.value || [];
    return items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.qty || 0)), 0);
  });

  stateOptions = [
    { label: 'Pendiente', value: 'Pendiente' },
    { label: 'Enviada', value: 'Enviada' },
    { label: 'Aprobada', value: 'Aprobada' },
    { label: 'Observada', value: 'Observada' },
    { label: 'Rechazada', value: 'Rechazada' },
    { label: 'Cancelada', value: 'Cancelada' }
  ];

  typeOptions = [
    { label: 'Planilla', value: 'Planilla' },
    { label: 'Rxh', value: 'Rxh' }
  ];

  expenseTypeOptions = [
    { label: 'Fijo', value: 'Fijo' },
    { label: 'Variable', value: 'Variable' }
  ];

  accommodationTypeOptions = [
    { label: 'Alojamiento', value: 'Alojamiento' },
    { label: 'Alimentación', value: 'Alimentación' }
  ];

  quoteForm: FormGroup = this.fb.group({
    clientId: ['', Validators.required],
    projectId: ['', Validators.required],
    state: ['Pendiente'],
    createDate: [new Date(), Validators.required],
    location: [''],
    area: [0],
    notes: [''],
    costs: this.fb.group({
      vehicles: this.fb.array([]),
      payrolls: this.fb.array([]),
      tools: this.fb.array([]),
      materials: this.fb.array([]),
      uniforms: this.fb.array([]),
      expenses: this.fb.array([]),
      accommodations: this.fb.array([])
    }),
    items: this.fb.array([]),
    includeExpenses: [false],
    includeIgv: [false],
    percentageGeneralExpenses: [0],
    percentageAccommodationFood: [0],
    percentageUtilities: [0],
    // Secciones de cumplimiento
    clientCompliance: this.fb.array([]),
    coordCompliance: this.fb.array([]),
    tecmeingCompliance: this.fb.array([])
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.quoteId.set(id);
        this.loadQuote(id);
      }
    });

    this.clientsApi.list().subscribe(res => this.clients.set(res));
    this.projectsApi.list().subscribe(res => this.projects.set(res));

    this.quoteForm.valueChanges
      .pipe(
        debounceTime(700),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe(val => {
        if (!val.clientId || !val.projectId) return;
        const quoteData = {
          ...val,
          includeExpenses: val.includeExpenses || false,
          includeIgv: val.includeIgv || false,
          percentageGeneralExpenses: val.percentageGeneralExpenses || 0,
          percentageAccommodationFood: val.percentageAccommodationFood || 0,
          percentageUtilities: val.percentageUtilities || 0
        };
        this.quotesApi.calculate(quoteData as Quote).subscribe({
          next: (res) => this.calculatedQuote.set(res),
          error: (err) => console.error('Error calculando cotización', err)
        });
      });
  }

  loadQuote(id: string) {
    this.loading.set(true);
    this.quotesApi.getById(id).subscribe({
      next: (quote) => {
        const clientVal = typeof quote.clientId === 'object' ? quote.clientId._id : quote.clientId;
        const projectVal = typeof quote.projectId === 'object' ? quote.projectId._id : quote.projectId;

        this.quoteForm.patchValue({
          clientId: clientVal,
          projectId: projectVal,
          state: quote.state,
          createDate: new Date(quote.createDate),
          location: quote.location,
          area: quote.area,
          notes: quote.notes,
          includeExpenses: quote.includeExpenses || false,
          includeIgv: quote.includeIgv || false,
          percentageGeneralExpenses: quote.percentageGeneralExpenses || 0,
          percentageAccommodationFood: quote.percentageAccommodationFood || 0,
          percentageUtilities: quote.percentageUtilities || 0
        });

        this.rebuildFormArrays(quote);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  rebuildFormArrays(quote: Quote) {
    const costs = this.quoteForm.get('costs') as FormGroup;
    ['vehicles', 'payrolls', 'tools', 'materials', 'uniforms', 'expenses', 'accommodations'].forEach(key => {
      (costs.get(key) as FormArray).clear();
    });
    (this.quoteForm.get('items') as FormArray).clear();
    this.clientComplianceArray.clear();
    this.coordComplianceArray.clear();
    this.tecmeingComplianceArray.clear();

    if (quote.costs?.vehicles) {
      quote.costs.vehicles.forEach(g => {
        this.vehicles.push(this.fb.group({
          title: [g.title],
          items: this.fb.array(g.items.map(i => this.fb.group({
            description: [i.description], unit: [i.unit], unitCost: [i.unitCost], days: [i.days]
          })))
        }));
      });
    }

    if (quote.costs?.payrolls) {
      quote.costs.payrolls.forEach(g => {
        this.payrolls.push(this.fb.group({
          title: [g.title],
          items: this.fb.array(g.items.map(i => this.fb.group({
            type: [i.type], position: [i.position], baseRemuneration: [i.baseRemuneration],
            familyAssignment: [i.familyAssignment], qtyPersons: [i.qtyPersons], qtyDays: [i.qtyDays]
          })))
        }));
      });
    }

    if (quote.costs?.tools) {
      quote.costs.tools.forEach(i => {
        this.tools.push(this.fb.group({
          description: [i.description], unit: [i.unit], unitPrice: [i.unitPrice],
          qty: [i.qty], usefulLifeMonths: [i.usefulLifeMonths]
        }));
      });
    }

    if (quote.costs?.materials) {
      quote.costs.materials.forEach(g => {
        this.materials.push(this.fb.group({
          title: [g.title],
          items: this.fb.array(g.items.map(i => this.fb.group({
            description: [i.description], unit: [i.unit], metrado: [i.metrado], unitCost: [i.unitCost]
          })))
        }));
      });
    }

    if (quote.costs?.uniforms) {
      quote.costs.uniforms.forEach(g => {
        this.uniforms.push(this.fb.group({
          title: [g.title],
          items: this.fb.array(g.items.map(i => this.fb.group({
            description: [i.description], unitCost: [i.unitCost], type: [i.type],
            qty: [i.qty], usefulLifeMonths: [i.usefulLifeMonths]
          })))
        }));
      });
    }

    if (quote.costs?.expenses) {
      quote.costs.expenses.forEach(g => {
        this.expenses.push(this.fb.group({
          title: [g.title], type: [g.type],
          items: this.fb.array(g.items.map(i => this.fb.group({
            description: [i.description], unit: [i.unit], cuadrilla: [i.cuadrilla],
            qty: [i.qty], unitPrice: [i.unitPrice]
          })))
        }));
      });
    }

    if (quote.costs?.accommodations) {
      quote.costs.accommodations.forEach(i => {
        this.accommodations.push(this.fb.group({
          type: [i.type], description: [i.description], unit: [i.unit],
          cuadrilla: [i.cuadrilla], qty: [i.qty], unitPrice: [i.unitPrice]
        }));
      });
    }

    if (quote.items) {
      quote.items.forEach(i => {
        this.items.push(this.fb.group({
          description: [i.description], qty: [i.qty], unit: [i.unit], price: [i.price],
          subItems: this.fb.array(i.subItems ? i.subItems.map(s => this.fb.group({
            description: [s.description], qty: [s.qty], unit: [s.unit], price: [s.price]
          })) : [])
        }));
      });
    }

    if (quote.clientCompliance) {
      quote.clientCompliance.forEach(item => {
        this.clientComplianceArray.push(this.fb.group({ description: [item.description] }));
      });
    }

    if (quote.coordCompliance) {
      quote.coordCompliance.forEach(item => {
        this.coordComplianceArray.push(this.fb.group({ description: [item.description] }));
      });
    }

    if (quote.tecmeingCompliance) {
      quote.tecmeingCompliance.forEach(item => {
        this.tecmeingComplianceArray.push(this.fb.group({ description: [item.description] }));
      });
    }
  }

  // --- Getters para FormArrays de costos ---
  get costsFormGroup() { return this.quoteForm.get('costs') as FormGroup; }
  get vehicles() { return this.costsFormGroup.get('vehicles') as FormArray; }
  get payrolls() { return this.costsFormGroup.get('payrolls') as FormArray; }
  get tools() { return this.costsFormGroup.get('tools') as FormArray; }
  get materials() { return this.costsFormGroup.get('materials') as FormArray; }
  get uniforms() { return this.costsFormGroup.get('uniforms') as FormArray; }
  get expenses() { return this.costsFormGroup.get('expenses') as FormArray; }
  get accommodations() { return this.costsFormGroup.get('accommodations') as FormArray; }
  get items() { return this.quoteForm.get('items') as FormArray; }

  // --- Getters para cumplimiento ---
  get clientComplianceArray() { return this.quoteForm.get('clientCompliance') as FormArray; }
  get coordComplianceArray() { return this.quoteForm.get('coordCompliance') as FormArray; }
  get tecmeingComplianceArray() { return this.quoteForm.get('tecmeingCompliance') as FormArray; }

  // --- Cumplimiento ---
  addComplianceItem(arrayName: 'clientCompliance' | 'coordCompliance' | 'tecmeingCompliance') {
    (this.quoteForm.get(arrayName) as FormArray).push(this.fb.group({ description: [''] }));
  }

  removeComplianceItem(arrayName: string, index: number) {
    (this.quoteForm.get(arrayName) as FormArray).removeAt(index);
  }

  // --- Operaciones de grupos de costos ---
  addGroup(arrayName: string) {
    const list = this.costsFormGroup.get(arrayName) as FormArray;
    const newGroup = arrayName === 'expenses'
      ? this.fb.group({ title: [''], type: ['Fijo'], items: this.fb.array([]) })
      : this.fb.group({ title: [''], items: this.fb.array([]) });
    list.push(newGroup);
  }

  removeGroup(arrayName: string, index: number) {
    (this.costsFormGroup.get(arrayName) as FormArray).removeAt(index);
  }

  addItemToGroup(arrayName: string, groupIndex: number) {
    const group = (this.costsFormGroup.get(arrayName) as FormArray).at(groupIndex) as FormGroup;
    const items = group.get('items') as FormArray;

    let newItem: FormGroup;
    switch (arrayName) {
      case 'vehicles': newItem = this.fb.group({ description: [''], unit: ['Und'], unitCost: [0], days: [0] }); break;
      case 'payrolls': newItem = this.fb.group({ type: ['Planilla'], position: [''], baseRemuneration: [0], familyAssignment: [0], qtyPersons: [1], qtyDays: [0] }); break;
      case 'materials': newItem = this.fb.group({ description: [''], unit: ['Und'], metrado: [0], unitCost: [0] }); break;
      case 'uniforms': newItem = this.fb.group({ description: [''], unitCost: [0], type: ['Planilla'], qty: [1], usefulLifeMonths: [1] }); break;
      case 'expenses': newItem = this.fb.group({ description: [''], unit: ['Und'], cuadrilla: [1], qty: [1], unitPrice: [0] }); break;
      default: return;
    }
    items.push(newItem);
  }

  getGroupItems(arrayName: string, groupIndex: number) {
    const group = (this.costsFormGroup.get(arrayName) as FormArray).at(groupIndex) as FormGroup;
    return (group.get('items') as FormArray).controls;
  }

  removeItemFromGroup(arrayName: string, groupIndex: number, itemIndex: number) {
    const group = (this.costsFormGroup.get(arrayName) as FormArray).at(groupIndex) as FormGroup;
    (group.get('items') as FormArray).removeAt(itemIndex);
  }

  addStandaloneItem(arrayName: string) {
    const list = this.costsFormGroup.get(arrayName) as FormArray;
    let newItem: FormGroup;
    if (arrayName === 'tools') {
      newItem = this.fb.group({ description: [''], unit: ['Und'], unitPrice: [0], qty: [1], usefulLifeMonths: [1] });
    } else {
      newItem = this.fb.group({ type: ['Alojamiento'], description: [''], unit: ['Dia'], cuadrilla: [1], qty: [1], unitPrice: [0] });
    }
    list.push(newItem);
  }

  removeStandaloneItem(arrayName: string, index: number) {
    (this.costsFormGroup.get(arrayName) as FormArray).removeAt(index);
  }

  // --- Ítems comerciales ---
  addMainItem() {
    this.items.push(this.fb.group({
      description: [''], qty: [1], unit: ['Und'], price: [0],
      subItems: this.fb.array([])
    }));
  }

  removeMainItem(index: number) {
    this.items.removeAt(index);
  }

  addSubItem(itemIndex: number) {
    const item = this.items.at(itemIndex) as FormGroup;
    (item.get('subItems') as FormArray).push(
      this.fb.group({ description: [''], qty: [1], unit: ['Und'], price: [0] })
    );
  }

  removeSubItem(itemIndex: number, subIndex: number) {
    const item = this.items.at(itemIndex) as FormGroup;
    (item.get('subItems') as FormArray).removeAt(subIndex);
  }

  getSubItems(itemIndex: number) {
    const item = this.items.at(itemIndex) as FormGroup;
    return (item.get('subItems') as FormArray).controls;
  }

  getItemTotal(index: number): number {
    const ctrl = this.items.at(index);
    return (ctrl.get('qty')?.value || 0) * (ctrl.get('price')?.value || 0);
  }

  getSubItemTotal(itemIndex: number, subIndex: number): number {
    const sub = this.getSubItems(itemIndex)[subIndex];
    return (sub.get('qty')?.value || 0) * (sub.get('price')?.value || 0);
  }

  // Obtener total de una categoría desde el cálculo del backend
  getCostTotal(key: string): number {
    const calc = this.calculatedQuote();
    if (!calc?.costs) return 0;
    return (calc.costs as any)[key] || 0;
  }

  goBack() {
    this.location.back();
  }

  save() {
    if (this.quoteForm.invalid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Complete los campos obligatorios.' });
      return;
    }

    this.loading.set(true);
    const { clientCompliance, coordCompliance, tecmeingCompliance, ...data } = this.quoteForm.getRawValue();

    const req = this.quoteId()
      ? this.quotesApi.update(this.quoteId()!, data)
      : this.quotesApi.create(data);

    req.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Cotización guardada exitosamente.' });
        this.router.navigate(['/quotes']);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' });
        this.loading.set(false);
      }
    });
  }
}
