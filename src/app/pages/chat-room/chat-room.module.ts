import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ChatRoomPageRoutingModule } from './chat-room-routing.module';
import { ChatRoomPage } from './chat-room.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatRoomPageRoutingModule,
    SharedModule
  ],
  declarations: [ChatRoomPage]
})
export class ChatRoomPageModule {}