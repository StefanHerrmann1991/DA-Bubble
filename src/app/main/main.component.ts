import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { UserProfile } from 'src/app/models/user-profile';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { DrawerService } from 'src/app/services/drawer.service';
import { ThreadService } from 'src/app/services/thread.service';
import { UsersFirebaseService } from 'src/app/services/users-firebase.service';
import { UserProfileSubViewComponent } from './users/user-profile-sub-view/user-profile-sub-view.component';
import { UserProfileViewComponent } from './users/user-profile-view/user-profile-view.component';


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  public search: string = '';
  filteredUser: any = [];
  filteredChannel: any = [];
  usersAndChannels: any = [];
  searchOutput: boolean = false;
  isMobile = false;
  public currentUser: UserProfile = new UserProfile();
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  isMenuOpen = false;
  userId: string | null = '';

  constructor(
    private router: Router,
    public userFbService: UsersFirebaseService,
    public dialog: MatDialog,
    public drawerService: DrawerService,
    public threadService: ThreadService,
    private authService: AuthenticationService
  ) {
    window.addEventListener('beforeunload', () => this.updateUserStatus());
  }


  ngOnInit(): void {
    this.router.navigate(['/main/channel/MLYdOZo8nhH04EOnjoUg']);
    // this.userFbService.getLoggedInUser(this.userFbService.getFromLocalStorage());
    this.getCurrentUser();
    this.userId = this.userFbService.getFromLocalStorage();
  }

  ngOnDestroy() {
    this.updateUserStatus();
  }


  private checkMobileMode(width: number): void {
    this.isMobile = width <= 750;
    console.log(this.isMobile);
  }
  
  updateUserStatus() {
    this.userFbService.updateUserOnlineStatus(this.userId, false)
  }

  closeMenu() {
    if (this.menuTrigger) {
      this.menuTrigger.closeMenu();
    }
    this.isMenuOpen = false; // Make sure this line is executed regardless of the condition.
  }


  async getCurrentUser() {
    const user = await this.userFbService.getUser(this.userFbService.getFromLocalStorage())
    this.currentUser = new UserProfile(user);
  }


  userLoggedout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }


  openUserProfile() {
    this.dialog.open(UserProfileViewComponent, {
      width: '500px',
      height: 'auto',
      hasBackdrop: true,
      panelClass: 'user-profile-view-dialog',
      autoFocus: false,
    });
  }



  // async searchData() {
  //   const searchResult = await this.searchService.searchUsersAndChannels(this.search)
  //   this.filteredUser = searchResult.filteredUser;
  //   this.filteredChannel = searchResult.filteredChannel;
  // }


  // deleteSearch() {
  //   this.search = '';
  //   this.filteredUser = [];
  //   this.filteredChannel = [];
  //   this.toggleSearchOutput();
  // }


  // toggleSearchOutput() {
  //   this.searchOutput = !this.searchOutput;
  // }


  // @HostListener('document:click', ['$event'])
  // onDocumentClick(event: MouseEvent) {
  //   const target = event.target as HTMLElement;
  //   if (!target.closest('input') && !target.closest('.searchOutputHeader')) {
  //     this.searchOutput = false;
  //   }
  // }


  openProfileDialogInSearch(node: any) {
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


  isScreenSmall = window.innerWidth < 450;

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.isScreenSmall = event.target.innerWidth < 450;
    this.checkMobileMode(event.target.innerWidth);
  }

}
