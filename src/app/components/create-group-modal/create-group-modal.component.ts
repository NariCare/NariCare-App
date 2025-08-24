import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { ApiService } from '../../services/api.service';
import { ChatRoom } from '../../models/chat.model';

interface UserOption {
  id: string;
  name: string;
  role: string;
  selected: boolean;
}

@Component({
  selector: 'app-create-group-modal',
  templateUrl: './create-group-modal.component.html',
  styleUrls: ['./create-group-modal.component.scss'],
})
export class CreateGroupModalComponent implements OnInit {
  groupForm: FormGroup;
  searchQuery = '';
  availableUsers: UserOption[] = [];
  selectedUsers: UserOption[] = [];
  isSearching = false;
  isCreatingGroup = false;
  
  groupTypes = [
    { value: 'general', label: 'General Discussion' },
    { value: 'consultation', label: 'Consultation Group' }
  ];

  topics = [
    'newborn', 'pumping', 'twins', 'working-moms', 'sleep-training', 
    'weaning', 'nutrition', 'postpartum', 'breastfeeding-challenges', 'other'
  ];

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private formBuilder: FormBuilder,
    private chatService: ChatService,
    private apiService: ApiService
  ) {
    this.groupForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      type: ['general', [Validators.required]],
      topic: ['other', [Validators.required]],
      isPrivate: [false],
      maxParticipants: [20, [Validators.required, Validators.min(5), Validators.max(100)]]
    });
  }

  ngOnInit() {
    this.loadUsers();
    
    // Debug form validation
    this.groupForm.valueChanges.subscribe(() => {
      console.log('Form status:', this.groupForm.status);
      console.log('Form valid:', this.groupForm.valid);
      console.log('Form values:', this.groupForm.value);
      console.log('Form errors:', this.getFormValidationMessage());
    });
  }

  async loadUsers(query?: string) {
    this.isSearching = true;
    try {
      const response = await this.apiService.searchUsers(query, 50).toPromise();
      console.log('Search users response:', response);
      
      if (response?.success && response.data) {
        // Handle nested users array structure
        const users = response.data.users || response.data;
        
        if (Array.isArray(users)) {
          this.availableUsers = users.map((user: any) => ({
            id: user.id || user.uid,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            selected: false
          }));
        } else {
          console.error('Users data is not an array:', users);
          this.availableUsers = [];
          this.showToast('Invalid user data format received', 'danger');
        }
      } else {
        console.log('No users found or API call failed');
        this.availableUsers = [];
        if (!response?.success) {
          this.showToast(response?.message || 'Failed to search users', 'danger');
        }
      }
    } catch (error: any) {
      console.error('Failed to load users:', error);
      this.availableUsers = [];
      
      // Provide a more helpful error message based on the error type
      const status = error?.status || error?.error?.status;
      if (status === 404) {
        this.showToast('User search endpoint not yet implemented', 'warning');
      } else if (status === 401 || status === 403) {
        this.showToast('Authentication required for user search', 'danger');
      } else if (status === 0 || !status) {
        this.showToast('Unable to connect to server', 'danger');
      } else {
        this.showToast(`Failed to load users (${status}). Please try again.`, 'danger');
      }
    } finally {
      this.isSearching = false;
    }
  }

  onSearchChange(event: any) {
    this.searchQuery = event.detail.value;
    if (this.searchQuery.length >= 2) {
      this.loadUsers(this.searchQuery);
    } else if (this.searchQuery.length === 0) {
      this.loadUsers();
    }
  }

  toggleUserSelection(user: UserOption) {
    user.selected = !user.selected;
    
    if (user.selected && !this.selectedUsers.find(u => u.id === user.id)) {
      this.selectedUsers.push(user);
    } else if (!user.selected) {
      this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    }
  }

  removeSelectedUser(user: UserOption) {
    this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    
    // Update the available users list
    const availableUser = this.availableUsers.find(u => u.id === user.id);
    if (availableUser) {
      availableUser.selected = false;
    }
  }

  async createGroup() {
    if (this.groupForm.invalid) {
      this.showToast('Please fill in all required fields correctly', 'danger');
      return;
    }

    // Prevent multiple submissions
    if (this.isCreatingGroup) {
      return;
    }

    this.isCreatingGroup = true;

    try {
      const formData = this.groupForm.value;
      
      const roomData: Omit<ChatRoom, 'id'> = {
        name: formData.name,
        description: formData.description,
        type: formData.type, // Use selected type (general/consultation)
        topic: formData.topic,
        isPrivate: formData.isPrivate,
        participants: this.selectedUsers.map(u => u.id),
        moderators: [], // Backend handles moderator assignment automatically
        maxParticipants: formData.maxParticipants,
        createdAt: new Date()
      };

      console.log('Creating group with data:', roomData);
      const createdRoom = await this.chatService.createRoom(roomData);
      
      if (createdRoom) {
        this.showToast(`Group "${createdRoom.name}" created successfully!`, 'success');
        this.modalController.dismiss({
          created: true,
          room: createdRoom
        });
      } else {
        throw new Error('Failed to create group');
      }

    } catch (error: any) {
      console.error('Error creating group:', error);
      
      // Parse different types of errors
      let errorMessage = 'Failed to create group. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('user IDs do not exist')) {
          errorMessage = 'Some selected users are no longer available. Please refresh the user list.';
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Authentication expired. Please log in again.';
        } else {
          errorMessage = error.message;
        }
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      }
      
      this.showToast(errorMessage, 'danger');
    } finally {
      this.isCreatingGroup = false;
    }
  }

  dismiss() {
    this.modalController.dismiss({
      created: false
    });
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  // Helper method to check if user is already selected
  isUserSelected(userId: string): boolean {
    return this.selectedUsers.some(u => u.id === userId);
  }

  // Helper method to get group type label
  getGroupTypeLabel(value: string): string {
    const type = this.groupTypes.find(t => t.value === value);
    return type ? type.label : value;
  }

  // Helper method to get selected users names
  getSelectedUsersNames(): string {
    return this.selectedUsers.map(u => u.name).join(', ');
  }

  // Helper method to check if form is ready for submission
  isFormReadyForSubmission(): boolean {
    return this.groupForm.valid && !this.isCreatingGroup;
  }

  // Helper method to get form validation status
  getFormValidationMessage(): string {
    if (this.groupForm.valid) {
      return 'Ready to create group';
    }

    const errors = [];
    if (this.groupForm.get('name')?.invalid) {
      errors.push('Group name (3-50 characters)');
    }
    if (this.groupForm.get('description')?.invalid) {
      errors.push('Description (10-200 characters)');
    }
    if (this.groupForm.get('type')?.invalid) {
      errors.push('Group type');
    }
    if (this.groupForm.get('topic')?.invalid) {
      errors.push('Topic');
    }
    if (this.groupForm.get('maxParticipants')?.invalid) {
      errors.push('Max participants (5-100)');
    }

    return `Missing: ${errors.join(', ')}`;
  }
}