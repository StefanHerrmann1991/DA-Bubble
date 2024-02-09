import { Component, HostListener, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Channel } from 'src/app/models/channel';
import { ChannelService } from 'src/app/shared/services/channel.service';
import { FirebaseUtilsService } from 'src/app/shared/services/firebase-utils.service';
import { MainIdsService } from 'src/app/shared/services/main-ids.service';
import { NotificationService } from 'src/app/shared/services/notification.service';
import { UsersFirebaseService } from 'src/app/shared/services/users-firebase.service';


/**
 * Component for displaying and managing the edit channel dialog.
 * This component allows users to edit channel details like name and description, leave a channel, or delete it.
 */
@Component({
  selector: 'app-edit-channel-dialog',
  templateUrl: './edit-channel-dialog.component.html',
  styleUrls: ['./edit-channel-dialog.component.scss']
})


export class EditChannelDialogComponent {


  channel: Channel = new Channel(this.data.channel);
  currentUserId: string | null = '';
  channelNameInput = new FormControl(this.channel.channelName);
  channelDescriptionInput = new FormControl(this.channel.description);
  isEditing: boolean = false;
  editChannelName: boolean = false;
  editDescription: boolean = false;
  isOutlineVisible: boolean = true;
  isMobile: boolean = false;
  openingInChat: boolean = this.data.openingInChat;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private userService: UsersFirebaseService,
    private channelService: ChannelService,
    public dialogRef: MatDialogRef<EditChannelDialogComponent>,
    public notificationService: NotificationService,
    private firestoreUtils: FirebaseUtilsService,
    private router: Router,
    private idsService: MainIdsService
  ) { }


  ngOnInit() {
    this.currentUserId = this.userService.getFromLocalStorage()
    this.checkMobileMode(window.innerWidth);
  }


  toggleEdit() {
    this.isEditing = !this.isEditing;
  }


  /**
  * HostListener for window resize events to adjust mobile responsiveness.
  * @param {any} event - The resize event.
  */
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkMobileMode(event.target.innerWidth);
  }


  /**
   * Checks and sets the mobile mode based on window width.
   * @param {number} width - The width of the window.
   */
  private checkMobileMode(width: number): void {
    this.isMobile = width <= 750;   
  }


  toggleOutline() {
    this.isOutlineVisible = !this.isOutlineVisible;
  }


  closeCreateChannelDialog() {
    this.dialogRef.close();
  }


  /**
   * Leaves the channel if the user is not in the main channel.
   */
  leaveChannel() {
    if (this.channel.channelName === 'allgemein') {
      this.notificationService.showError('Der allgemeine Channel kann nicht verlassen werden.')
    }
    else this.leaveTheChannel();
  }


  /**
   * Logic for leaving the channel and updating the information in firestore.
   * It also shows notification for success and error messages. 
   */
  async leaveTheChannel() {
    try {
      if (this.channel && this.currentUserId && this.channel.usersData) {
        const userIndex = this.channel.usersData.findIndex((user: any) => this.currentUserId === user.id);
        if (userIndex > -1) {
          this.channel.usersData.splice(userIndex, 1);
          await this.channelService.updateChannel(this.channel);
          this.notificationService.showSuccess('Sie haben den Channel verlassen.');
        } else {
          this.notificationService.showError('Sie sind nicht Teil dieses Channels.');
        }
      }
    } catch (error) {
      this.notificationService.showError('Ein Fehler ist aufgetreten beim Verlassen des Channels.');
    }
  }


  toggleDescriptionInput() {
    this.editChannelName = !this.editChannelName;
  }


  toggleChannelNameInput() {
    this.editDescription = !this.editDescription;
  }


  deleteChannel() {
    if (this.currentUserId == this.channel.creator.id) {
      this.firestoreUtils.deleteCollection('channel', this.channel.channelId);
    }
    this.router.navigate([`/dashboard/channel/${this.idsService.mainChannelId}`]);
    this.closeCreateChannelDialog();
  }


  saveChannelName() {
    this.channel.channelName = this.channelNameInput.value || '';
    this.channelService.updateChannel(this.channel);
    this.toggleDescriptionInput();
  }


  saveDescription() {
    this.channel.description = this.channelDescriptionInput.value;
    this.channelService.updateChannel(this.channel);
    this.toggleChannelNameInput();
  }

}
