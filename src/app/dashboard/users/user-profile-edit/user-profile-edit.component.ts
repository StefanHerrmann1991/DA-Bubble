import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NotificationService } from 'src/app/shared/services/notification.service';
import { UsersFirebaseService } from '../../../shared/services/users-firebase.service';
import { UserProfileChooseAvatarComponent } from '../user-profile-choose-avatar/user-profile-choose-avatar.component';
import { AuthenticationService } from 'src/app/shared/services/authentication.service';
import { FileUpload } from 'src/app/models/file-upload';
import { FileStorageService } from 'src/app/shared/services/file-storage.service';


/**
* Component for editing the user's profile.
* This component provides functionality to update user details, including email, name, and profile picture.
* It integrates with Firebase for storing user data and authentication updates, as well as handling file uploads.
*/
@Component({
  selector: 'app-user-profile-edit',
  templateUrl: './user-profile-edit.component.html',
  styleUrls: ['./user-profile-edit.component.scss']
})


export class UserProfileEditComponent {
  url = 'assets/img/avatar/';
  currentPic = this.usersFbService.loggedInUserImg; //User current profile pic
  avatarPic: boolean = false;
  profileEditSuccess: boolean | null = null;


  ngOnInit() {
    this.profileEditSuccess = false;
    //der Standardwert für das Email-Feld setzten
    this.userEditForm.patchValue({
      email: this.usersFbService.loggedInUserEmail,
      name: this.usersFbService.loggedInUserName
    });
  }


  constructor(
    public dialog: MatDialog, public usersFbService: UsersFirebaseService,
    private dialogRef: MatDialogRef<UserProfileChooseAvatarComponent>,
    private notificationService: NotificationService,
    private authService: AuthenticationService,
    private fileService: FileStorageService
  ) { }


  userEditForm = new FormGroup({
    "email": new FormControl('', [Validators.required, Validators.email]),
    "name": new FormControl('', [Validators.required]),
  })


  /*  disabled: true  */
  async onEdit() {
    if (this.userEditForm.valid) {
      const formData = this.userEditForm.value;
      const currentUserID = this.usersFbService.getFromLocalStorage(); //von Localstorage currentuser Id rausholen
      this.saveNewPic(this.currentPic, currentUserID);
      this.changeEmailInFirebase(currentUserID, formData);
      this.changeEmailInAuth(formData.email)
    }
    this.dialog.closeAll();
  }


  /**
  * Changes the user's email in Firebase authentication.
  * @param {any} newEmail - The new email to set for the user.
  */
  async changeEmailInAuth(newEmail: any) {
    if (this.userEditForm.value.email !== newEmail) {
      try {
        this.authService.updateAndVerifyEmail(newEmail);
      } catch (error) {
        console.log('Change email failed')
      }
    }
  }


  /**
  * Changes the user's email in Firebase Firestore.
  * @param {string | null} currentUserID - The current user's unique identifier.
  * @param {any} formData - The form data containing the new email.
  */
  changeEmailInFirebase(currentUserID: string | null, formData: any) {
    // Aktualisieren Sie das Benutzerprofil in Firestore
    this.usersFbService.updateUserProfile(currentUserID!, formData) //mit currentUserID und formDatas
      .then(() => {
        if (this.usersFbService.loggedInUserName !== formData.name) {
          this.profileEditSuccess = true;
          this.openSnackBar();
        }
      })
      .catch((error: any) => {
        this.profileEditSuccess = false;
        this.openSnackBar();
      });
  }


  /**
  * Handles file selection and upload for updating the user's profile picture.
  * @param {any} event - The file selection event.
  */
  onSelect(event: any) {
    const file = new FileUpload(event.target.files[0]);
    let fileType = file.file.type;
    let fileSize = file.file.size;
    if (fileSize > 500 * 1024) {
      window.alert('Die Datei ist zu groß. Bitte senden Sie eine Datei, die kleiner als 500KB ist.');
      return; // wenn die Datei zu groß ist, nicht ausgeben bzw. beenden.
    }
    if (fileType.match(/image\/(png|jpeg|jpg)/)) {
      this.fileService.uploadFile(file).then(file => this.setNewPic(file.url));
    } else {
      window.alert('Bitte nur png, jpg oder jpeg senden');
    }
  }


  /**
  * Sets a new profile picture for the user.
  * @param {any} image - The new image URL to set as the profile picture.
  */
  setNewPic(image: any) {
    this.currentPic = image;
  }


  /**
  * Displays a notification based on the success or failure of the profile update.
  */
  async saveNewPic(image: any, currentUserId: any) {
    this.usersFbService.saveUserPicFromDialog(image, this.avatarPic, currentUserId);
  }


  /**
  * Displays a notification based on the success or failure of the profile update.
  */
  openSnackBar() {
    if (this.profileEditSuccess == true) {
      this.notificationService.showSuccess('Benutzerprofil erfolgreich aktualisiert.');
    } else {
      this.notificationService.showError('Benutzerprofil Aktualisierung fehlgeschlagen. Bitte prüfen Sie die Eingaben!')
    }
  }


  /**
  * Opens a dialog for selecting an avatar as the user's profile picture.
  */
  openAvatarDialog() {
    const dialogRef = this.dialog.open(UserProfileChooseAvatarComponent, {
      width: '500px',
      height: 'auto',
      data: { currentPic: this.currentPic },
      hasBackdrop: true,
      panelClass: 'user-profile-view-dialog',
      autoFocus: false,
    });

    dialogRef.componentInstance.avatarSelected.subscribe((selectedAvatar: string) => {
      this.setNewPic(selectedAvatar);
    });

    dialogRef.close();
  }
}