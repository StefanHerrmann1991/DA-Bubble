import { UsersFirebaseService } from 'src/app/shared/services/users-firebase.service';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ThreadService } from 'src/app/shared/services/thread.service';
import { Subscription } from 'rxjs';
import { SearchService } from 'src/app/shared/services/search.service';
import { UserProfile } from 'src/app/models/user-profile';
import { Message } from 'src/app/models/message';
import { FirebaseUtilsService } from 'src/app/shared/services/firebase-utils.service';
import { FileStorageService } from 'src/app/shared/services/file-storage.service';
import { NotificationService } from 'src/app/shared/services/notification.service';
import { FileUpload } from 'src/app/models/file-upload';
import { DrawerService } from 'src/app/shared/services/drawer.service';
import { MessageService } from 'src/app/shared/services/message.service';


/**
* Component for handling and displaying threads related to messages.
* This component allows users to view, create, and interact with message threads.
* It integrates with various services for message management, user data retrieval,
* file uploads, and notifications.
*/
@Component({
  selector: 'app-threads',
  templateUrl: './threads.component.html',
  styleUrls: ['./threads.component.scss']
})
export class ThreadsComponent {
  @Output() replyCountUpdated = new EventEmitter<number>();
  private subscriptions = new Subscription();
  allUsers: UserProfile[] = [];
  filteredUsers: UserProfile[] = [];
  currentUser: UserProfile = new UserProfile;
  currentId: string = '';
  messageCreator: any;
  message: any;
  text: string = '';
  collPath = '';
  parentMessageId: string = '';
  thread: any;
  userThread: UserProfile = new UserProfile();
  fileUploadThread?: FileUpload;
  fileTypeThread: string = '';
  imageFile?: FileUpload;
  pdfFile?: FileUpload;
  currentTime: any;
  isOpened: boolean = false;
  isPDF: boolean = false;
  showTagMenu: boolean = false;
  shiftPressed: boolean = false;
  messageSending: boolean = false;
  scrollElement: any;
  @ViewChild('scroller') scrollElementRef?: ElementRef;
  @ViewChild('endScrollElement') endScrollElement?: ElementRef;
  @ViewChild('threadTextarea') threadTextarea?: ElementRef;
  private observer?: IntersectionObserver;
  isElementVisible: boolean = false;
  searchMessage: boolean = false;



  constructor(
    private route: ActivatedRoute,
    public threadService: ThreadService,
    private firebaseUtils: FirebaseUtilsService,
    private searchService: SearchService,
    private userService: UsersFirebaseService,
    private fileService: FileStorageService,
    private notificationService: NotificationService,
    public drawerService: DrawerService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.userService.getUser(this.userService.getFromLocalStorage()).then((user: any) => { this.currentUser = user });
  }




  ngOnInit(): void {
    this.route.params.subscribe(params => {
      let channelId = params['channelId'];
      let chatId = params['chatId'];
      if (channelId) this.currentId = channelId;
      else if (chatId) this.currentId = chatId;
    });
    this.subscriptions.add(
      this.threadService.message$.subscribe(message => {
        this.messageCreator = message.user;
        this.message = message
        this.parentMessageId = this.message.messageId
        this.getPDFurl(message);
        this.collPath = `${message.origin}/${this.currentId}/message/${message.messageId}/thread`
        this.threadService.subReplies(this.collPath);
        this.userService.getUser(this.message.user.id).then((user: UserProfile) => this.userThread = user);
      })
    );
    this.loadUserData();
  }


  ngAfterViewInit() {
    this.initIntersectionObserver();
    this.threadTextarea?.nativeElement.focus();
  }


  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    this.subscriptions.unsubscribe();
  }


  /**
  * Initializes the intersection observer for detecting when an element is within the viewport. Handles the scroll event
  * in the thread section
  */
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


  async loadUserData() {
    this.userService.getUsers().then((users: any) => this.allUsers = users);
  }


  /**
   * Function used for tracking items in a list or array(thread replies) with ngFor.
   * @param {number} index - The index of the item in the array.
   * @param {any} item - The item being tracked.
   * @returns {string} The unique identifier for the item.
   */
  trackByFunction(index: number, item: any) {
    return item.messageId; // oder eine eindeutige Eigenschaft der Nachricht
  }


  scrollDown() {
    this.scrollElement = this.scrollElementRef?.nativeElement;
    this.scrollElement.scrollTop = this.scrollElement.scrollHeight;
  }


  /**
  * Formats a timestamp into a readable time format.
  * @param {any} timestamp - The timestamp to format.
  * @returns {string} Formatted time string.
  */
  getTimeOfDate(timestamp: any) {
    const date = new Date(timestamp.seconds * 1000);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    return formattedTime;
  }


  /**
  * Checks for the presence of a tag in the message input with the @ symbol to highlight .
  */
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
    this.filteredUsers = searchResult.filteredUser;
  }


  /**
  * Inserts a tagged user into the message input.
  * @param {string} user - The username of the user to tag.
  */
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


  /**
  * Toggles the emoji menu visibility.
  * @param {Event} event - The event that triggered the toggle.
  */
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


  getAllReplies() {
    return this.threadService.replies
  }


  /**
  * Creates a message object for a reply.
  * @returns {Message} The newly created message object.
  */
  createMessageObject() {
    this.currentTime = new Date();
    return new Message({
      text: this.text,
      time: this.currentTime,
      messageId: '',
      user: this.currentUser.toJSON(),
      textEdited: false,
      type: 'reply',
      origin: '',
      reactions: [],
      fileUpload: this.fileUploadThread?.toJSON() || [],
      threadCount: '',
      timeOflastReply: ''
    });
  }

  /**
  * Sends a reply to a thread.
  */
  sendReplyTo() {

    this.firebaseUtils.addCollWithPath(this.collPath, 'messageId', this.createMessageObject().toJSON())
      .then(() => {
        // The message has been sent, we can stop any sending indicators.
        this.messageSending = false;
        // Step 3: Manually fetch the updated count of messages/replies.
        return this.threadService.fetchUpdatedCount(this.collPath);
      })
      .then((newCount: any) => {
        // Step 4: Update the UI with the new count.
        let path = `${this.message.origin}/${this.currentId}/message/${this.message.messageId}`
        this.messageService.updateCount(path, newCount, this.currentTime);
      })
      .catch(error => {
        //console.error("Error sending reply: ", error);
      });
    // Reset the message input.
    this.text = '';
    this.fileUploadThread = undefined;
    this.fileTypeThread = '';
  }


  /**
  * Sends a reply when the 'Enter' key is pressed.
  * @param {KeyboardEvent} event - The keyboard event.
  */
  sendByKey(event: KeyboardEvent) {
    if (event.key == 'Shift') {
      this.shiftPressed = event.type === 'keydown';
    }
    if (event.key === 'Enter' && !this.shiftPressed && !this.isEmptyOrWhitespace(this.text) || this.fileTypeThread !== '' && !this.messageSending) {
      this.messageSending = true;
      this.sendReplyTo();
    }
  }


  /**
  * Checks if a message is empty or contains only whitespace to disable the send button.
  * @param {string} message - The message to check.
  * @returns {boolean} True if the message is empty or whitespace, false otherwise.
  */
  isEmptyOrWhitespace(message: string): boolean {
    return message.replace(/\n/g, '').trim().length === 0;
  }


  /**
  * Handles the file upload process for a thread.
  * @param {any} event - The file upload event.
  */
  async getPDFurl(message: any) {
    if (message.fileUpload && message.fileUpload.name) {
      if (message.fileUpload.name.includes('pdf')) {
        this.imageFile = undefined;
        this.isPDF = true;
        this.pdfFile = message.fileUpload;
      } else {
        this.pdfFile = undefined;
        this.isPDF = false;
        this.imageFile = message.fileUpload;
      }
    }
  }


  // Upload File

  onUploadThread(event: any) {
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
      this.fileService.uploadFile(file).then(file => this.fileUploadThread = file);
    }
  }


  /**
  * Sets the file type icon based on the type of the file.
  * @param {string} type - The file type.
  */
  setFileType(type: string) {
    if (type.includes('jpeg' || 'jpg')) this.fileTypeThread = 'assets/img/icons/jpg.png';
    if (type.includes('png')) this.fileTypeThread = 'assets/img/icons/png.png';
    if (type.includes('pdf')) this.fileTypeThread = 'assets/img/icons/pdf.png';
  }


  /**
  * Deletes a file from the storage.
  * @param {string} filePath - The path of the file to delete.
  */
  onDelete(filePath: string) {
    this.fileService.deleteFile(filePath);
    this.fileUploadThread = undefined;
    this.fileTypeThread = '';
  }
}
