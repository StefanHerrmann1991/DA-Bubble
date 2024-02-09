import { FlatTreeControl } from '@angular/cdk/tree';
import { Injectable, inject } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Channel } from '../../models/channel';
import { UserProfile } from '../../models/user-profile';
import { FirebaseUtilsService } from './firebase-utils.service';
import { NotificationService } from './notification.service';
import { UsersFirebaseService } from './users-firebase.service';

import {
  Firestore, collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc
} from '@angular/fire/firestore';


interface ChannelsNode {
  channelName: string;
  channelId: string;
  isClosedChannel: boolean;
  children?: ChannelsNode[];
}

interface ExampleFlatNode {
  expandable: boolean;
  channelName: string;
  level: number;
}

/**
 * Service for handling channel-related operations.
 * This service integrates with Firebase Firestore for data retrieval and updates,
 * and utilizes Angular Material's tree structures to manage and display channel data.
 */

@Injectable({
  providedIn: 'root'
})

export class ChannelService {

  firestore: Firestore = inject(Firestore);
  unsubUsers: any;
  users: any;
  channelContent: Channel[] = [];
  channelTree: ChannelsNode[] = [];
  channels: Channel[] = [];
  themes: any;
  unsubChannel: any;
  unsubChannels: any;
  unsubChannelTree: any;
  unsubMessage: any;
  unsubChannelContent: any;
  currentUserId: any;


  constructor(
    private firebaseUtils: FirebaseUtilsService,
    private userService: UsersFirebaseService,
    private notificationService: NotificationService) {
    this.currentUserId = this.userService.getFromLocalStorage();
  }


  ngOnDestroy() {
    this.unsubChannelTree();
    this.unsubChannel();
    this.unsubChannelContent();
    this.unsubChannels();
  }


  /**
   * Transforms channel nodes for the tree structure.
   * @param {ChannelsNode} node - The channel node to transform.
   * @param {number} level - The current level of the node in the tree.
   * @returns {ExampleFlatNode} A transformed node suitable for the flat tree control.
   */
  private _transformer = (node: ChannelsNode, level: number) => {
    const isExpandable = (node.children && node.children.length > 0) || node.channelName === 'Weitere';
    return {
      expandable: isExpandable,
      channelName: node.channelName,
      channelId: node.channelId,
      isClosedChannel: node.isClosedChannel,  // Ensure this property is mapped
      level: level,
    };
  };


  treeControl = new FlatTreeControl<ExampleFlatNode>(
    node => node.level,
    node => node.expandable,
  );


  treeFlattener = new MatTreeFlattener<ChannelsNode, ExampleFlatNode>(
    this._transformer,
    node => node.level,
    node => node.expandable,
    node => node.children,
  );

  /**
    * Determines if a tree node has children.
    * @param {number} _ - Index of the node.
    * @param {ExampleFlatNode} node - The tree node to check.
    * @returns {boolean} True if the node is expandable (has children), false otherwise.
    */
  hasChild = (_: number, node: ExampleFlatNode) => node.expandable;

  public dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  public dataLoaded = new BehaviorSubject<boolean>(false);


  getAllChannels() {
    return this.unsubChannelContent = onSnapshot(this.firebaseUtils.getColl('channel'), (list: any) => {
      list.forEach((element: any) => {
        const channelObj = this.setChannelObj(element.data(), element.id);
        this.channels.push(channelObj);
      });
      this.dataSource.data
      this.dataLoaded.next(true);
    });
  }


  /**
   * Subscribes to the channels tree and updates the tree data source.
   */
  subChannelTree() {
    return this.unsubChannelTree = onSnapshot(this.firebaseUtils.getColl('channel'), (list: any) => {
      this.channelTree = [];
      this.populateChannelsAndMore(list);
      this.updateDataSource();
      this.dataLoaded.next(true);
    });
  }


  /**
   * Checks if a given channel is a closed channel. Its necessary to prevent the search function from opening
   * closed channels when the node can't be determined via the route.
   * @param {string} channelId - The ID of the channel to check.
   * @returns {boolean} True if the channel is closed, false otherwise.
   */
  getIsClosedChannel(channelId: string): boolean {
    const findChannel = (node: ChannelsNode): ChannelsNode | undefined => {
      if (node.channelId === channelId) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findChannel(child);
          if (found) return found;
        }
      }
      return undefined;
    };
    for (const channel of this.channelTree) {
      const foundChannel = findChannel(channel);
      if (foundChannel) return foundChannel.isClosedChannel;
    }
    return false; // Default to false if channel is not found
  }


  populateChannelsAndMore(list: any) {
    let moreChannels: ChannelsNode[] = []; 
    list.forEach((element: any) => {
      const channelObj = this.setChannelObj(element.data(), element.id);
      const containsCurrentUser = channelObj.usersData.some((user: any) => user.id === this.currentUserId);
      if (containsCurrentUser) {
        this.channelTree.push({ ...channelObj, isClosedChannel: false });
      } else {
        moreChannels.push({ ...channelObj, isClosedChannel: true });
      }
    });
    this.sortChannelTree();
    this.appendMoreChannels(moreChannels);
  }


  sortChannelTree() {
    this.channelTree.sort((a, b) => a.channelName.toLowerCase().localeCompare(b.channelName.toLowerCase()));
  }


  appendMoreChannels(moreChannels: ChannelsNode[]) {
    if (moreChannels.length) {
      this.channelTree.push({
        channelName: 'Weitere',
        channelId: 'weitere-id',
        isClosedChannel: false,  // Assuming 'Weitere' is not a closed channel
        children: moreChannels
      });
    }
  }


  updateDataSource() {
    this.themes = [{ channelName: 'Channel', children: this.channelTree }];
    this.dataSource.data = this.themes;
  }


  /**
   * Expands the first node in the channels tree.
   */
  expandChannels() {
    const firstNode = this.treeControl.dataNodes[0];
    if (firstNode) {
      this.treeControl.expand(firstNode);
    }
  }


  /**
   * Subscribes to channel content changes and executes a callback with the channel data.
   * @param {string} documentId - The document ID of the channel to subscribe to.
   * @param {(channelData: any) => void} callback - The callback to execute with the channel data.
   */
  subChannelContent(documentId: string, callback: (channelData: any) => void) {
    const docRef = doc(this.firebaseUtils.getColl('channel'), documentId);
    return onSnapshot(docRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        callback(docSnapshot.data());
      } else {
        this.notificationService.showError('Der Channel existiert nicht')
      }
    });
  }


  /**
  * Updates a channel's information in Firestore.
  * @param {Channel} channel - The channel object with updated information.
  */
  async updateChannel(channel: Channel) {
    if (channel.channelId) {
      const docRef = this.firebaseUtils.getSingleDocRef('channel', channel.channelId);
      const plainChannelObject = channel.toJSON();
      await updateDoc(docRef, plainChannelObject);
    } 
  }


  setChannelObj(obj: any, docId: string): any {
    return new Channel({
      channelId: docId,
      channelName: obj.channelName,
      creator: obj.creator,
      description: obj.description,
      creationTime: obj.creationTime,
      usersData: obj.usersData,
      children: []
    });
  }


  setChannelContentObj(obj: any, docId: string): Channel {
    const channelJSON = { ...obj, channelId: docId };
    return Channel.fromJSON(channelJSON);
  }


  async getChannels() {
    const itemCollection = collection(this.firestore, 'channel');
    const channelArray: any[] = [];
    const querySnapshot = await getDocs(itemCollection);
    querySnapshot.forEach(doc => {
      const channel = this.setChannelObj(doc.data(), doc.id);
      channelArray.push(channel);
    });
    return channelArray;
  }


  async getSingleChannel(docId: string) {
    const docRef = doc(this.firestore, "channel", docId);
    const channelDoc = (await getDoc(docRef)).data();
    return Channel.fromJSON(channelDoc);
  }


  getAllUsers() {
    return this.unsubUsers = onSnapshot(this.firebaseUtils.getColl('users'), (list: any) => {
      list.forEach((element: any) => {
        const channelObj = this.setUserObj(element.data(), element.id);
        this.users.push(channelObj);
      });
    });
  }


  setUserObj(obj: any, docId: string) {
    return new UserProfile({
      name: obj.name,
      email: obj.email,
      id: docId,
      photoURL: obj.photoURL,
      isOnline: obj.isOnline,
    });
  }

  private userUpdateSource = new Subject<void>();
  userUpdated$ = this.userUpdateSource.asObservable();

  userUpdated() {
    this.userUpdateSource.next();
  }

}
