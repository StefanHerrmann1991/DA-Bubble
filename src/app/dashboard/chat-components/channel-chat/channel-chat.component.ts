import { animate, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { AddPeopleDialogComponent } from '../../channels/add-people-dialog/add-people-dialog.component';
import { EditChannelDialogComponent } from '../../channels/edit-channel-dialog/edit-channel-dialog.component';
import { UserMenuDialogComponent } from '../../channels/user-menu-dialog/user-menu-dialog.component';

/* Models */

import { Channel } from 'src/app/models/channel';
import { Message } from 'src/app/models/message';
import { UserProfile } from 'src/app/models/user-profile';

/* Services */

import { Observable, Subscription, of } from 'rxjs';
import { FileUpload } from 'src/app/models/file-upload';
import { ChannelService } from 'src/app/shared/services/channel.service';
import { DrawerService } from 'src/app/shared/services/drawer.service';
import { FileStorageService } from 'src/app/shared/services/file-storage.service';
import { FirebaseUtilsService } from 'src/app/shared/services/firebase-utils.service';
import { MessageSelectionService } from 'src/app/shared/services/message-selection.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { NotificationService } from 'src/app/shared/services/notification.service';
import { SearchService } from 'src/app/shared/services/search.service';
import { ThreadService } from 'src/app/shared/services/thread.service';
import { UsersFirebaseService } from 'src/app/shared/services/users-firebase.service';
import { UserProfileSubViewComponent } from '../../users/user-profile-sub-view/user-profile-sub-view.component';


@Component({
  selector: 'app-channel-chat',
  templateUrl: './channel-chat.component.html',
  styleUrls: ['./channel-chat.component.scss'],
  animations: [
    trigger('slide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0%)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class ChannelChatComponent {
  isMobile: boolean = false;
  text: string = '';
  message: Message = new Message()
  id: string = '';
  channelId: any = '';
  channel: any;
  channelUserData$: Observable<any> = new Observable();
  ref: any;
  currentUser: UserProfile = new UserProfile;
  receiver: Channel = new Channel;
  messages: Message[] = [];
  filteredUsersForTag: UserProfile[] = [];
  showTagMenu: boolean = false;
  isOpened: boolean = false;
  scrollElement: any;
  messageCount: any;
  fileUpload?: FileUpload;
  fileType: string = '';
  shiftPressed: boolean = false;
  messageSending: boolean = false;
  @ViewChild('scroller') scrollElementRef?: ElementRef;
  @ViewChild('endScrollElement') endScrollElement?: ElementRef;
  private observer?: IntersectionObserver;
  isElementVisible: boolean = false;
  searchMessage: boolean = false;
  messageSelectionSub: Subscription = new Subscription();
  isLoading: boolean = true;
  usersSub: Subscription = new Subscription();
  allUsers: UserProfile[] = [];
  replyPath: any = '';
  level: string = '';
  private levelSubscription: Subscription | undefined;
  isClosedChannel: boolean = false;


  constructor(
    public dialog: MatDialog,
    private route: ActivatedRoute,
    private userService: UsersFirebaseService,
    private firebaseUtils: FirebaseUtilsService,
    private searchService: SearchService,
    public messageService: MessageService,
    private channelService: ChannelService,
    public threadService: ThreadService,
    private fileService: FileStorageService,
    private notificationService: NotificationService,
    public drawerService: DrawerService,
    private messageSelectionService: MessageSelectionService
  ) {
    this.userService.getUser(this.userService.getFromLocalStorage()).then((user: any) => { this.currentUser = user });
  }


  ngOnInit(): void {
    // Subscribe to paramMap for channelId
    this.route.paramMap.subscribe((params) => {
      this.channelId = params.get('channelId');
      this.firebaseUtils.getDocData('channel', this.channelId).then(channelData => {
        this.channel = channelData;
        this.messageService.subMessage('channel', this.channelId);
        this.channelService.unsubChannel = this.channelService.subChannelContent(this.channelId, channelData => {
          this.channel = channelData;     
          this.getUsersForDialog(channelData)
          this.isClosedChannel = this.channelService.getIsClosedChannel(this.channelId);
          setTimeout(() => this.scrollDown(), 1000);
        });
      }).catch(err => {
        console.log(err);
      });
    });
    this.messageSelectionSub = this.messageSelectionService.selectedMessageId$.subscribe(id => { if (id) this.scrollToMessage(id) });
    this.checkMobileMode(window.innerWidth);
    this.loadUserData();
  }


  ngAfterViewInit() {
    this.initIntersectionObserver();
  }


  ngOnDestroy() {
    if (this.observer) this.observer.disconnect();
    if (this.messageSelectionSub) this.messageSelectionSub.unsubscribe();
    if (this.levelSubscription) this.levelSubscription.unsubscribe();
  }


  trackByFunction(index: number, item: any) {
    return item.messageId;
  }


  initIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.isElementVisible = entry.isIntersecting;
      });
    }, { threshold: 1 });
    if (this.endScrollElement) {
      this.observer.observe(this.endScrollElement?.nativeElement);
    }
  }


  scrollDown() {
    this.scrollElement = this.scrollElementRef?.nativeElement ? this.scrollElementRef?.nativeElement : undefined;
    if (this.scrollElement !== undefined) this.scrollElement.scrollTop = this.scrollElement.scrollHeight;
  }


  scrollToMessage(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.classList.add('animation-message');
      setTimeout(() => {
        element.classList.remove('animation-message');
      }, 1200);
    }
  }


  sendByKey(event: KeyboardEvent) {
    if (event.key == 'Shift') this.shiftPressed = event.type === 'keydown';
    if (!this.messageSending && event.key === 'Enter' && !this.shiftPressed && !this.isEmptyOrWhitespace() || this.fileType !== '') {
      this.messageSending = true;
      this.sendMessageTo(this.channelId);
    }
  }


  isEmptyOrWhitespace(): boolean {
    return this.text.replace(/\n/g, '').trim().length === 0;
  }


  sendMessageTo(docId: string) {
    this.createMessageObject().then(async createdMessage => {
      if (this.isEmptyOrWhitespace()) this.text = '';
      this.message = createdMessage;
      this.receiver = await this.channelService.getSingleChannel(docId);
      this.messageService.sendMessage(this.message, this.receiver, false);
      this.text = '';
      this.fileUpload = undefined;
      this.fileType = '';
      this.messageSending = false;
      this.messageSelectionService.selectMessage('true');
      setTimeout(() => this.scrollDown(), 500);
    });
  }


  async createMessageObject() {
    let creatorId = this.getCreatorId();
    let messageCreator = (await this.userService.getUser(creatorId) as UserProfile).toJSON();
    return new Message({
      origin: 'channel',
      text: this.text,
      time: new Date(),
      user: messageCreator,
      messageId: '',
      textEdited: false,
      type: 'message',
      reactions: [],
      fileUpload: this.fileUpload?.toJSON() || [],
      threadCount: '',
      timeOflastReply: ''
    });
  }


  getCreatorId() {
    return this.userService.getFromLocalStorage();
  }


  checkForTag() {
    const atIndex = this.text.lastIndexOf('@');
    if (atIndex > 0 && this.text[atIndex - 1] === ' ' && this.text.includes('@') || atIndex === 0) {
      this.showTagMenu = true;
      const textAfterAt = this.text.substring(atIndex);
      const endOfQueryIndex = textAfterAt.indexOf(' ');
      const searchQuery = endOfQueryIndex === -1 ? textAfterAt : textAfterAt.substring(0, endOfQueryIndex);
      this.searchUserToTag(searchQuery)
    }
    if (!this.text.includes('@')) this.showTagMenu = false;
  }


  async toggleTagMenu(tag: string) {
    this.showTagMenu = !this.showTagMenu;
    this.searchUserToTag(tag);
  }


  async searchUserToTag(tag: string) {
    const searchResult = await this.searchService.searchUsersChannelsAndMessages(tag, this.searchMessage);
    this.filteredUsersForTag = searchResult.filteredUser;
  }


  tagUser(user: string) {
    const atIndex = this.text.lastIndexOf('@');
    if (atIndex !== -1) {
      this.text = this.text.substring(0, atIndex) + `@${user}`;
    } else {
      this.text = this.text + `@${user}`;
      this.showTagMenu = !this.showTagMenu;
    }
  }


  closeTagMenu() {
    this.showTagMenu = false;
  }


  toggleEmoji(event: Event) {
    event.stopPropagation();
    this.isOpened = !this.isOpened;
  }


  addEmoji(emoji: string) {
    const text = `${emoji}`;
    this.text += text;
    this.isOpened = false;
  }


  closeEmojiMenu(): void {
    this.isOpened = false
  }


  onUpload(event: any) {
    const file = new FileUpload(event.target.files[0]);
    const maxSize = 1500 * 1024;
    this.setFileType(file.file.type);
    if (file.file.size > maxSize) {
      this.notificationService.showError('Die Datei ist zu groß. Bitte senden Sie eine Datei, die kleiner als 500KB ist.');
      return;
    } else if (!file.file.type.match(/image\/(png|jpeg|jpg)|application\/pdf/)) {
      this.notificationService.showError('Bitte nur png, jpg, jpeg oder PDF senden.');
      return;
    } else {
      this.fileService.uploadFile(file).then(file => this.fileUpload = file);
    }
  }


  setFileType(type: string) {
    if (type.includes('jpeg' || 'jpg')) this.fileType = 'assets/img/icons/jpg.png';
    if (type.includes('png')) this.fileType = 'assets/img/icons/png.png';
    if (type.includes('pdf')) this.fileType = 'assets/img/icons/pdf.png';
  }


  onDelete(filePath: string) {
    this.fileService.deleteFile(filePath);
    this.fileUpload = undefined;
    this.fileType = '';
  }


  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkMobileMode(event.target.innerWidth);

  }


  private checkMobileMode(width: number): void {
    this.isMobile = width <= 750;
  }


  async loadUserData() {
    this.userService.getUsers().then((users: any) => this.allUsers = users);
  }


  async getUsersForDialog(channelData: any) {
    let userData: UserProfile[] = [];
    await this.loadUserData();
    channelData.usersData.forEach((channelUser: any) => {
      const matchedUser = this.allUsers.find(user => user.id === channelUser.id);
      if (matchedUser) {
        userData.push(matchedUser);
      }
    });
    this.channelUserData$ = of(userData);
  }


  openChannelMenu() {
    this.dialog.open(EditChannelDialogComponent, {
      width: '750px',
      height: 'auto',
      hasBackdrop: true,
      panelClass: 'channel-dialog',
      autoFocus: false,
      data: {
        channel: this.channel,
        openingInChat: false
      }
    });
  }


  openUserMenu() {
    this.dialog.open(UserMenuDialogComponent, {
      width: 'auto',
      height: 'auto',
      hasBackdrop: true,
      panelClass: 'corner-right-top-dialog',
      autoFocus: false,
      data: {
        channel: this.channel,
        openingInChat: true
      }
    });
  }


  openAddUserDialog() {
    this.dialog.open(AddPeopleDialogComponent, {
      width: 'auto',
      height: 'auto',
      hasBackdrop: true,
      panelClass: 'corner-right-top-dialog',
      autoFocus: false,
      data: {
        channel: this.channel
      }
    });
  }


  openProfileDialog(node: any) {
    const userId = node.id;
    const userName = node.name;
    const userPhotoURL = node.photoURL;
    const userEmail = node.email;
    const isOnline = node.isOnline;
    this.dialog.open(UserProfileSubViewComponent, {
      width: '500px',
      height: '727px',
      hasBackdrop: true,
      panelClass: 'dialog-main-style',
      autoFocus: false,
      data: {
        id: userId,
        name: userName,
        photoURL: userPhotoURL,
        email: userEmail,
        isOnline: isOnline
      }
    });
  }
}