import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MessageTreeService } from 'src/app/services/message-tree.service';
import { Subscription } from 'rxjs';
import { UsersFirebaseService } from 'src/app/services/users-firebase.service';
import { UserProfile } from 'src/app/models/user-profile';
import { FirebaseUtilsService } from 'src/app/services/firebase-utils.service';
import { Message } from 'src/app/models/message';
import { DirectChat } from 'src/app/models/direct-chat';
import { Router } from '@angular/router';
import { DrawerService } from 'src/app/services/drawer.service';
import { NewChatDialogComponent } from './new-chat-dialog/new-chat-dialog.component';
import { ThreadService } from 'src/app/services/thread.service';


@Component({
  selector: 'app-direct-message',
  templateUrl: './direct-message.component.html',
  styleUrls: ['./direct-message.component.scss']
})
export class DirectMessageComponent {

  constructor(
    public messageTreeService: MessageTreeService,
    public dialog: MatDialog,
    private userService: UsersFirebaseService,
    private router: Router,
    private firebaseUtils: FirebaseUtilsService,
    private drawerService: DrawerService,
    private threadService: ThreadService
  ) { this.userService.getUser(this.userService.getFromLocalStorage()).then((user: any) => { this.currentUser = user }); }

  private subscriptions: Subscription[] = [];
  chatId: string = '';
  chat: any;
  text: string = '';
  message: Message = new Message();
  chatExists: boolean = false;
  currentUser: UserProfile = new UserProfile;
  public receiver: UserProfile = new UserProfile;
  public search: string = '';
  filteredUser: any = [];


  ngOnInit() {
    const sub = this.messageTreeService.dataLoaded.subscribe(loaded => {
      if (loaded) {
        this.messageTreeService.treeControl.expandAll();
      }
    });
    this.subscriptions.push(sub);
  }

  async selectReceiver(receiverId: any) {
    const chatAlreadyExists = await this.firebaseUtils.chatExists(this.currentUser.id, receiverId);
    if (!chatAlreadyExists) {
      let newDirectChat = this.createDirectChatObject(receiverId).toJSON();
      this.firebaseUtils.addColl(newDirectChat, 'chat', 'chatId');
    }
    // Assuming you can retrieve the chatId of the existing chat. Adjust as needed.
    const chatId = await this.firebaseUtils.getExistingChatId(this.currentUser.id, receiverId);
    this.router.navigate(['/main/chat', chatId]);
    this.drawerService.close();
    if (this.threadService.threadIsOpen) this.threadService.closeThread();
  }

  createDirectChatObject(receiver: string): DirectChat {
    return new DirectChat({
      chatId: '',
      creationTime: new Date(),
      user1: this.currentUser.id,
      user2: receiver,
      splittedId: `${this.currentUser.id}_${receiver}`
    });
  }


  toggleExpanded(node: any) {
    this.messageTreeService.treeControl.toggle(node);
  }


  createMessageObject() {
    return new Message({
      text: this.text,
      time: new Date(),
      messageId: '',
      user: this.currentUser.toJSON(),
      type: 'message',
      textEdited: false
    });
  }


  getCreatorId() {
    return this.userService.getFromLocalStorage();
  }

  openNewChatDialog() {

    this.dialog.open(NewChatDialogComponent, {
      width: '880px',
      height: '514px',
      hasBackdrop: true,
      panelClass: 'dialog-main-style',
      autoFocus: false,
    });
  }

}

