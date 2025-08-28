import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { ApiService, UpdateAvailabilityRequest } from '../../services/api.service';

interface TimeSlot {
  start: string;
  end: string;
  enabled: boolean;
  editing?: boolean;
}

interface DayAvailability {
  dayOfWeek: number;
  dayName: string;
  enabled: boolean;
  timeSlots: TimeSlot[];
}

@Component({
  selector: 'app-availability-scheduler-modal',
  templateUrl: './availability-scheduler-modal.component.html',
  styleUrls: ['./availability-scheduler-modal.component.scss'],
})
export class AvailabilitySchedulerModalComponent implements OnInit {
  weekSchedule: DayAvailability[] = [
    { dayOfWeek: 0, dayName: 'Sunday', enabled: false, timeSlots: [] },
    { dayOfWeek: 1, dayName: 'Monday', enabled: false, timeSlots: [] },
    { dayOfWeek: 2, dayName: 'Tuesday', enabled: false, timeSlots: [] },
    { dayOfWeek: 3, dayName: 'Wednesday', enabled: false, timeSlots: [] },
    { dayOfWeek: 4, dayName: 'Thursday', enabled: false, timeSlots: [] },
    { dayOfWeek: 5, dayName: 'Friday', enabled: false, timeSlots: [] },
    { dayOfWeek: 6, dayName: 'Saturday', enabled: false, timeSlots: [] }
  ];

  selectedTimezone = 'Asia/Kolkata';
  loading = true;
  loadError: string | null = null;
  
  timeOptions = [
    { value: '06:00', label: '6:00am' },
    { value: '06:30', label: '6:30am' },
    { value: '07:00', label: '7:00am' },
    { value: '07:30', label: '7:30am' },
    { value: '08:00', label: '8:00am' },
    { value: '08:30', label: '8:30am' },
    { value: '09:00', label: '9:00am' },
    { value: '09:30', label: '9:30am' },
    { value: '10:00', label: '10:00am' },
    { value: '10:30', label: '10:30am' },
    { value: '11:00', label: '11:00am' },
    { value: '11:30', label: '11:30am' },
    { value: '12:00', label: '12:00pm' },
    { value: '12:30', label: '12:30pm' },
    { value: '13:00', label: '1:00pm' },
    { value: '13:30', label: '1:30pm' },
    { value: '14:00', label: '2:00pm' },
    { value: '14:30', label: '2:30pm' },
    { value: '15:00', label: '3:00pm' },
    { value: '15:30', label: '3:30pm' },
    { value: '16:00', label: '4:00pm' },
    { value: '16:30', label: '4:30pm' },
    { value: '17:00', label: '5:00pm' },
    { value: '17:30', label: '5:30pm' },
    { value: '18:00', label: '6:00pm' },
    { value: '18:30', label: '6:30pm' },
    { value: '19:00', label: '7:00pm' },
    { value: '19:30', label: '7:30pm' },
    { value: '20:00', label: '8:00pm' },
    { value: '20:30', label: '8:30pm' },
    { value: '21:00', label: '9:00pm' },
    { value: '21:30', label: '9:30pm' },
    { value: '22:00', label: '10:00pm' }
  ];

  constructor(
    private modalController: ModalController,
    private apiService: ApiService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loadExistingAvailability();
  }

  async loadExistingAvailability() {
    try {
      this.loading = true;
      this.loadError = null;
      
      const response = await this.apiService.getMyExpertAvailability().toPromise();
      
      if (response?.success && response.data) {
        this.parseAvailabilityData(response.data);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      this.loadError = error instanceof Error ? error.message : 'Failed to load availability';
      // Continue with empty schedule if loading fails
    } finally {
      this.loading = false;
    }
  }

  private parseAvailabilityData(availabilitySlots: any[]) {
    // Group slots by day of week
    const slotsByDay = new Map<number, any[]>();
    
    availabilitySlots.forEach(slot => {
      const dayOfWeek = slot.day_of_week;
      if (!slotsByDay.has(dayOfWeek)) {
        slotsByDay.set(dayOfWeek, []);
      }
      slotsByDay.get(dayOfWeek)?.push(slot);
    });
    
    // Update weekSchedule with loaded data
    this.weekSchedule.forEach(day => {
      const daySlots = slotsByDay.get(day.dayOfWeek) || [];
      
      if (daySlots.length > 0) {
        day.enabled = true;
        day.timeSlots = daySlots
          .filter(slot => slot.is_available) // Only include available slots
          .map(slot => ({
            start: this.formatTimeFromAPI(slot.start_time),
            end: this.formatTimeFromAPI(slot.end_time),
            enabled: slot.is_available
          }));
      }
    });
  }

  private formatTimeFromAPI(timeString: string): string {
    // Convert "09:00:00" to "09:00"
    return timeString.substring(0, 5);
  }

  getDayInitial(dayName: string): string {
    return dayName.charAt(0).toUpperCase();
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'pm' : 'am';
    return `${hour12}:${minutes}${ampm}`;
  }

  addTimeSlot(day: DayAvailability) {
    // Always add default time slot that user can customize
    day.timeSlots.push({
      start: '09:00',
      end: '17:00',
      enabled: true
    });
    day.enabled = true;
  }

  onTimeChange(day: DayAvailability, slotIndex: number) {
    // Validate the time slot after user changes
    const slot = day.timeSlots[slotIndex];
    if (slot.start >= slot.end) {
      // Auto-adjust end time to be 1 hour after start time
      const startTime = slot.start;
      const [hours, minutes] = startTime.split(':').map(Number);
      const endHour = (hours + 1) % 24;
      slot.end = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  removeTimeSlot(day: DayAvailability, index: number) {
    day.timeSlots.splice(index, 1);
    if (day.timeSlots.length === 0) {
      day.enabled = false;
    }
  }

  private addHours(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    const newHour = (h + hours) % 24;
    return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  async save() {
    const loading = await this.loadingController.create({
      message: 'Saving your availability...'
    });
    await loading.present();

    try {
      const availability = this.buildAvailabilityRequest();
      const result = await this.apiService.updateExpertAvailability(availability).toPromise();
      
      if (result?.success) {
        await this.showToast('Availability updated successfully!', 'success');
        this.dismiss(true);
      } else {
        throw new Error(result?.error || 'Failed to update availability');
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      await this.showToast(error instanceof Error ? error.message : 'Failed to save availability', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  private buildAvailabilityRequest(): UpdateAvailabilityRequest {
    const availability: UpdateAvailabilityRequest['availability'] = [];
    
    this.weekSchedule.forEach(day => {
      if (day.enabled && day.timeSlots.length > 0) {
        day.timeSlots.forEach(slot => {
          if (slot.enabled) {
            availability.push({
              dayOfWeek: day.dayOfWeek,
              startTime: slot.start,
              endTime: slot.end,
              isAvailable: true
            });
          }
        });
      }
    });
    
    return { availability };
  }

  private async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  dismiss(data?: any) {
    this.modalController.dismiss(data);
  }

  isValidTimeSlot(slot: TimeSlot): boolean {
    return slot.start < slot.end;
  }

  hasAnySchedule(): boolean {
    return this.weekSchedule.some(day => day.enabled && day.timeSlots.length > 0);
  }

  async confirmClearSchedule() {
    const alert = await this.alertController.create({
      header: 'Clear All Schedule',
      message: 'Are you sure you want to clear your entire schedule? This will mark you as unavailable for all consultations (like taking leave).',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Clear Schedule',
          cssClass: 'danger',
          handler: () => {
            this.clearAllSchedule();
          }
        }
      ]
    });

    await alert.present();
  }

  clearAllSchedule() {
    this.weekSchedule.forEach(day => {
      day.enabled = false;
      day.timeSlots = [];
    });
  }
}