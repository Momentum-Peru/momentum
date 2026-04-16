import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecruitmentDashboard } from './recruitment-dashboard';

describe('RecruitmentDashboard', () => {
  let component: RecruitmentDashboard;
  let fixture: ComponentFixture<RecruitmentDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecruitmentDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecruitmentDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
