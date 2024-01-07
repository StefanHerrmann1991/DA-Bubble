import { Injectable, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Firestore, collection, collectionData, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from '@angular/fire/firestore';
import { Observable, Subject } from 'rxjs';
import { UserProfile } from '../../models/user-profile';
import { MainIdsService } from './main-ids.service';


interface User {
  name: string;
  email: string;
  id?: string;
  photoURL?: string;
}

@Injectable({
  providedIn: 'root'
})


export class UsersFirebaseService implements OnInit {
  picURL: any;
  user: UserProfile = new UserProfile;
  id: any;
  loggedInUserID: any;
  loggedInUserImg: any;
  loggedInUserName: any;
  loggedInUserEmail: any;



  constructor(
    private firestore: Firestore,
    private auth: Auth, private AngFirestore: AngularFirestore,
    private idService: MainIdsService
  ) { }

  ngOnInit() { }

  async addUserToFirebase(user: any, uid: string) {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      await setDoc(userRef, user);
      this.id = uid;
    } catch (error) {
      throw error;
    }
  }


  saveToLocalStorage(idValue: any) {
    localStorage.setItem('currentUser', idValue);
  }

  removeFromLocalStorage() {
    localStorage.removeItem('currentUser');
  }

  getFromLocalStorage() {
    const currentUser = localStorage.getItem('currentUser');
    return currentUser;
  }


  async getUsers() {
    const itemCollection = collection(this.firestore, 'users');
    const usersArray: any[] = [];
    const querySnapshot = await getDocs(itemCollection);
    querySnapshot.forEach(doc => {
      const users = this.setUserObject(doc.data());
      usersArray.push(users);
    });
    return usersArray;
  }


  async getUser(uid: any) {
    const itemDoc = doc(this.firestore, 'users', uid);
    const querySnapshot = await getDoc(itemDoc);
    const user = this.setUserObject(querySnapshot.data())
    this.getCurrentUserData(user.name, user.email, user.photoURL);
    return new UserProfile(user);  // Changed it so it gives back a user Object
  }


  getCurrentUserData(name: any, email: any, photoURL: any) {
    this.loggedInUserName = name;
    this.loggedInUserEmail = email;
    this.loggedInUserImg = photoURL;
  }


  getCurrentUserSubject() {
    const userSubject = new Subject<any>();
    const uid = this.getFromLocalStorage();
    const unsubscribeFn = onSnapshot(doc(this.firestore, "users", `${uid}`), (doc) => {
      if (doc.exists()) {
        userSubject.next(doc.data());
      } else {
        userSubject.error(new Error("No such document"));
      }
    }, error => userSubject.error(error));

    return {
      observable: userSubject.asObservable(),
      unsubscribe: unsubscribeFn
    };
  }


  setUserObject(obj: any): User {
    if (!obj) {
      throw new Error('Provided object is undefined or null');
    }
    return new UserProfile({
      name: obj.name || '',
      email: obj.email || '',
      id: obj.id || '',
      photoURL: obj.photoURL || '',
      isOnline: obj.isOnline || false
    });
  }


  async checkIfSubcollectionExists(documentPath: string): Promise<boolean> {
    const subcollectionRef = collection(this.firestore, documentPath);
    const snapshot = await getDocs(subcollectionRef);
    return !snapshot.empty;
  }


  async saveUserPic(image: string) {
    this.user.photoURL = image;
    const docRef = doc(this.firestore, 'users', `${this.id}`);
    await updateDoc(docRef, {
      photoURL: image
    });
  }

  /**ändert das neue Bild des Benutzers mit dem dialog component -> user-profile-edit.component */
  async saveUserPicFromDialog(image: string, avatarPic: boolean, currentUserID: any) {
    this.user.photoURL = image;
    const docRef = doc(this.firestore, 'users', `${currentUserID}`);
    if (avatarPic) {
      await updateDoc(docRef, {
        photoURL: 'assets/img/avatar/' + image
      }
      );
    } else {
      await updateDoc(docRef, {
        photoURL: image
      })
    }
  }


  async getLoggedInUser(currentUserID: any) {
    const docRef = doc(this.firestore, 'users', currentUserID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const userData = docSnap.data(); // Daten aus dem Snapshot abrufen
      this.loggedInUserID = docSnap.id;
      this.loggedInUserImg = userData['photoURL'];
      this.loggedInUserName = userData['name'];
      this.loggedInUserEmail = userData['email'];
    } else {
      console.log("No such document!");
    }
  }


  //User updaten ins Firestore
  async updateUserProfile(userID: string, formData: any) {
    try {
      const userRef = doc(this.firestore, 'users', userID);
      await setDoc(userRef, formData, { merge: true }); // Mit { merge: true } werden vorhandene Daten beibehalten und nur die aktualisierten Felder überschrieben
      this.getUser(userID);
    } catch (error) {
      throw error;
    }
  }


  async updateUserOnlineStatus(userID: any, onlineStatus: boolean) {
    try {
      const userRef = doc(this.firestore, 'users', userID);
      await updateDoc(userRef, { isOnline: onlineStatus }); // Mit { merge: true } werden vorhandene Daten beibehalten und nur die aktualisierten Felder überschrieben
    } catch (error) {
      throw error;
    }
  }


  getAllUserData(): Observable<UserProfile[]> {
    const collRef = collection(this.firestore, 'users');
    return collectionData(collRef) as Observable<UserProfile[]>;
  }
}