import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelChatComponent } from './channel-chat.component';

describe('ChannelChatComponent', () => {
  let component: ChannelChatComponent;
  let fixture: ComponentFixture<ChannelChatComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChannelChatComponent]
    });
    fixture = TestBed.createComponent(ChannelChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
