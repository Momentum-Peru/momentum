import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecruitmentList } from './recruitment-list';

describe('RecruitmentList', () => {
  let component: RecruitmentList;
  let fixture: ComponentFixture<RecruitmentList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecruitmentList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecruitmentList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
