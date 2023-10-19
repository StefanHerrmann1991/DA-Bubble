import { Component, ElementRef, ViewChild, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UsersFirebaseService } from 'src/app/services/users-firebase.service';
import { FirebaseUtilsService } from 'src/app/services/firebase-utils.service';
import { UserProfile } from 'src/app/models/user-profile';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-add-people-dialog',
  templateUrl: './add-people-dialog.component.html',
  styleUrls: ['./add-people-dialog.component.scss']
})
export class AddPeopleDialogComponent {

  channel = this.data.channel;
  selectedOption: string | undefined;
  inputOpened = false;
  public search: string = '';
  searchOutput: boolean = false;
  text: string = '';
  showTagMenu: boolean = false;
  addedUsers: UserProfile[] = [];
  separatorKeysCodes: number[] = [ENTER, COMMA];
  userCtrl = new FormControl('');
  filteredUsers: Observable<any[]>;
  allUsers: any = [];
  users: any[] = [];
  isKnownUser: boolean = false;
  @ViewChild('userInput') userInput!: ElementRef<HTMLInputElement>;


  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private usersService: UsersFirebaseService,
    private firebaseUtils: FirebaseUtilsService,
    private dialogRef: MatDialogRef<AddPeopleDialogComponent>,
    private announcer: LiveAnnouncer,
    private cdRef: ChangeDetectorRef
  ) {
    this.filteredUsers = this.userCtrl.valueChanges.pipe(
      startWith(null),
      map((user: string | null) => (user ? this._filter(user) : this.allUsers.slice())),
    );
  }

  ngOnInit() {
    this.getAllUsers();
  }


  async getAllUsers() {
    this.allUsers = await this.usersService.getUsers();
    console.log(this.allUsers)
  }

  addUsers() {

  }


  pushCertainUsersToChannel() {
    this.users.forEach((user: any) => {
      const userObject = user instanceof UserProfile ? user.toJSON() : user;
      this.channel.usersData.push(userObject);
    });
  }


  remove(name: string): void {
    const index = this.users.findIndex((user: any) => user.name === name);
    if (index >= 0) {
      this.users.splice(index, 1);
      this.announcer.announce(`Removed ${name}`);
    }
  }

  
  selected(event: MatAutocompleteSelectedEvent): void {
    const selectedUser = event.option.value;
    this.users.push(selectedUser);
    this.userInput.nativeElement.value = '';
    this.userCtrl.setValue(null);
    this.checkKnownUsers();
    const index = this.allUsers.findIndex((user: any) => user.name === selectedUser.name);
    if (index !== -1) {
      this.allUsers.splice(index, 1);
    }
  }
  checkKnownUsers(): void {
    for (let user of this.users) {
      if (!this.allUsers.some((knownUser: any) => knownUser.name === user.name) &&
        !this.users.some((addedUser: any) => addedUser.name === user.name)) {
        this.isKnownUser = false;
        this.cdRef.detectChanges();
        return;
      }
    }
    this.isKnownUser = true;
    this.cdRef.detectChanges();
  }
  private _filter(value: any): any[] {
    if (typeof value !== 'string') {
      return [];
    }
    const filterValue = value.toLowerCase();
    return this.allUsers.filter((user: any) => user.name.toLowerCase().includes(filterValue));
  }
  closeDialog() {
    this.dialogRef.close();
  }
  validateInput(): void {
    const inputValue = this.userCtrl.value?.trim();
    if (!inputValue) {
      this.isKnownUser = true;
      this.cdRef.detectChanges();
      return;
    }
    this.isKnownUser = this.allUsers.some((user: any) => user.name === inputValue);
    this.cdRef.detectChanges();
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.users.push({ name: value });
    }
    event.chipInput!.clear();
    this.checkKnownUsers();
  }
  isUserKnown(name: string): boolean {
    return this.allUsers.some((user: any) => user.name === name);
  }






}