import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecruitmentRequestForm } from './recruitment-request-form';

describe('RecruitmentRequestForm', () => {
  let component: RecruitmentRequestForm;
  let fixture: ComponentFixture<RecruitmentRequestForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecruitmentRequestForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecruitmentRequestForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
