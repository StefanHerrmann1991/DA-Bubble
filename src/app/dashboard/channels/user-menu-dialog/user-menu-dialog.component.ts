import { Component, Inject, Input } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { Channel } from 'src/app/models/channel';
import { AddPeopleDialogComponent } from '../add-people-dialog/add-people-dialog.component';
import { UsersFirebaseService } from 'src/app/shared/services/users-firebase.service';
import { UserProfile } from 'src/app/models/user-profile';
import { UserProfileSubViewComponent } from '../../users/user-profile-sub-view/user-profile-sub-view.component';
import { ChannelService } from 'src/app/shared/services/channel.service';
import { Subscription } from 'rxjs';


/**
 * Component for managing and displaying a user menu dialog.
 * This component is responsible for showing user information within a dialog and provides functionality for adding users to channels.
 */
@Component({
  selector: 'app-user-menu-dialog',
  templateUrl: './user-menu-dialog.component.html',
  styleUrls: ['./user-menu-dialog.component.scss']
})
export class UserMenuDialogComponent {

  allUsers: UserProfile[] = [];
  allUsersArray: any[] = [];
  channel: Channel = new Channel(this.data.channel);
  @Input() isMobile: boolean = false;
  openingInChat: boolean = this.data.openingInChat;
  channelUsers: UserProfile[] = [];
  private userUpdateSubscription?: Subscription;

  constructor(
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<UserMenuDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private userService: UsersFirebaseService,
    private channelService: ChannelService
  ) { }


  ngOnInit() {
    this.getAllUsers();
    this.subscribeToUserUpdates();
  }


  subscribeToUserUpdates() {
    this.userUpdateSubscription = this.channelService.userUpdated$.subscribe(() => {
      this.clearUserList(); // Reset or clear the list
      this.getAllUsers(); // Then reload or update the list
    });
  }


  clearUserList() {
    this.allUsersArray = []; // Clear the existing users array
    this.channelUsers = []; // Clear the channel users array
  }


  ngOnDestroy() {
    if (this.userUpdateSubscription) {
      this.userUpdateSubscription.unsubscribe();
    }
  }


  /**
  * Retrieves all users and prepares the data for display in the dialog.
  */
  async getAllUsers() {
    this.allUsers = await this.userService.getUsers();
    this.allUsers.forEach((user: UserProfile) => {
      let userToJSON = user.toJSON();
      this.allUsersArray.push(userToJSON);
    });
    this.getUsersForDialog();
  }


  /**
  * Filters users for the dialog based on the channel's user data.
  */
  getUsersForDialog() {
    this.channel.usersData.forEach((channelUser: any) => {
      const matchedUser = this.allUsersArray.find(user => user.id === channelUser.id);
      if (matchedUser) {
        this.channelUsers.push(matchedUser)
      }
    });
  }


  closeDialog() {
    this.dialogRef.close();
  }


  addUserDialog() {
    let dialogStyle;
    if (this.openingInChat) { dialogStyle = 'corner-right-top-dialog'; }
    if (!this.openingInChat) { dialogStyle = 'top-left-right-dialog'; }
    this.dialog.open(AddPeopleDialogComponent, {
      width: 'auto',
      height: 'auto',
      hasBackdrop: true,
      panelClass: dialogStyle,
      autoFocus: false,
      data: {
        channel: this.channel,
        openingInChat: this.openingInChat
      }
    });
  }


  /**
  * Opens a profile dialog displaying detailed user information, when clicking on the users name.
  * @param {any} node - The data object containing user information.
  */
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
