import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, doc, getDoc, query, updateDoc } from '@angular/fire/firestore';
import { Message } from '../models/message';
import { UserProfile } from '../models/user-profile';
import { Channel } from '../models/channel';
import { Router } from '@angular/router';
import { collectionData } from 'rxfire/firestore';
import { DirectChat } from '../models/direct-chat';

type ReceiverType = UserProfile | Channel;

@Injectable({
  providedIn: 'root'
})
export class MessageService {


  constructor(
    private firestore: Firestore = inject(Firestore),
    private router: Router
  ) { }

  // SEND MESSAGE

  async sendMessage(message: Message, receiver: any, newMessage: boolean, directChat: any) {
    // If a message is sent with new Message to a user & redirect to the chat
    if (receiver instanceof UserProfile) {
      const docId =  await this.createDirectChat(directChat);
      this.uploadMessage('direct-messages', docId, 'message', message);
      if (newMessage) this.router.navigateByUrl('/main/chat/' + docId);
      // if a message is sent with new Message to a channel or inside a channel & redirect to the channel
    } else if (receiver instanceof Channel) {
      this.uploadMessage('channels', receiver.channelId, 'message', message);
      if (newMessage) this.router.navigateByUrl('/main/channel/' + receiver.channelId);
    } else {
      // if a message is sent inside a user chat
      this.uploadMessage('direct-messages', receiver, 'message', message);
    }
  }
 

  // returns reference 
  getRefSubcollChannel(mainColl: string, docId: string | null, subColl: string) {
    return collection(this.firestore, `${mainColl}/${docId}/${subColl}`);
  }


  // adds a message to a chat/channel
  async uploadMessage(mainColl: string, docId: string, subColl: string, message: Message) {
    console.log(message)
    const docRef = await addDoc(this.getRefSubcollChannel(mainColl, docId, subColl), message.toJSON());
    await updateDoc(docRef, { messageId: docRef.id });
  }


  // creates a new direct chat with user
  async createDirectChat(directChat: DirectChat) {
    const itemCollection = collection(this.firestore, 'chat');
    const docRef = await addDoc(itemCollection, directChat.toJSON());
    await updateDoc(docRef, { chatId: docRef.id });
    return docRef.id;
  }

  // gets a specific direct chat 
  async getDirectChatDoc(docId: string) {
    const docRef = doc(this.firestore, "chat", docId);
    const chatDoc = (await getDoc(docRef)).data();
    return new DirectChat(chatDoc);
  }

  async getMessageDocRef(coll: string, docId: string, subcoll: string, messageId: string) {
    const docRef = doc(this.firestore, coll, docId, subcoll, messageId);
  }

  // GET MESSAGE

  getChannelMessages(mainColl: string, docId: string | null, subColl: string) {
    const channelMessages$ = collectionData(this.getRefSubcollChannel(mainColl, docId, subColl));
    return channelMessages$
  }

  // UPDATE MESSAGE

  // async updateMessage(docId: string, editedText: string) {
  //   const docRef = await this.getDirectChatDoc(docId);
  //   updateDoc(docRef, { text: editedText})
  // }
}
