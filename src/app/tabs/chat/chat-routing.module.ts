import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ChatPage } from './chat.page';

const routes: Routes = [
  {
    path: '',
    component: ChatPage
  },
  {
    path: 'room/:roomId',
    loadChildren: () => import('../../pages/chat-room/chat-room.module').then(m => m.ChatRoomPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChatPageRoutingModule {}