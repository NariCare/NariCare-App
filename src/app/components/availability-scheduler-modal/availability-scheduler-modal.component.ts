import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { ApiService, UpdateAvailabilityRequest } from '../../services/api.service';

interface TimeSlot {
  start: string;
  end: string;
  enabled: boolean;
  editing?: boolean;
  startPeriod?: 'AM' | 'PM';
  endPeriod?: 'AM' | 'PM';
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
    { value: '12:00', label: '12:00' },
    { value: '12:30', label: '12:30' },
    { value: '01:00', label: '1:00' },
    { value: '01:30', label: '1:30' },
    { value: '02:00', label: '2:00' },
    { value: '02:30', label: '2:30' },
    { value: '03:00', label: '3:00' },
    { value: '03:30', label: '3:30' },
    { value: '04:00', label: '4:00' },
    { value: '04:30', label: '4:30' },
    { value: '05:00', label: '5:00' },
    { value: '05:30', label: '5:30' },
    { value: '06:00', label: '6:00' },
    { value: '06:30', label: '6:30' },
    { value: '07:00', label: '7:00' },
    { value: '07:30', label: '7:30' },
    { value: '08:00', label: '8:00' },
    { value: '08:30', label: '8:30' },
    { value: '09:00', label: '9:00' },
    { value: '09:30', label: '9:30' },
    { value: '10:00', label: '10:00' },
    { value: '10:30', label: '10:30' },
    { value: '11:00', label: '11:00' },
    { value: '11:30', label: '11:30' }
  ];

  periodOptions = [
    { value: 'AM', label: 'AM' },
    { value: 'PM', label: 'PM' }
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
          .map(slot => {
            const startTime = this.formatTimeFromAPI(slot.start_time);
            const endTime = this.formatTimeFromAPI(slot.end_time);
            return {
              start: this.convertTo12HourTime(startTime),
              end: this.convertTo12HourTime(endTime),
              startPeriod: this.getTimePeriod(startTime),
              endPeriod: this.getTimePeriod(endTime),
              enabled: slot.is_available
            };
          });
      }
    });
  }

  private formatTimeFromAPI(timeString: string): string {
    // Convert "09:00:00" to "09:00"
    return timeString.substring(0, 5);
  }

  private convertTo12HourTime(time24: string): string {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour.toString().padStart(2, '0')}:${minutes}`;
  }

  private getTimePeriod(time24: string): 'AM' | 'PM' {
    const hour = parseInt(time24.split(':')[0]);
    return hour < 12 ? 'AM' : 'PM';
  }

  private convertTo24HourTime(time12: string, period: 'AM' | 'PM'): string {
    const [hours, minutes] = time12.split(':');
    let hour = parseInt(hours);
    
    if (period === 'AM' && hour === 12) {
      hour = 0;
    } else if (period === 'PM' && hour !== 12) {
      hour += 12;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
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
      end: '05:00',
      startPeriod: 'AM',
      endPeriod: 'PM',
      enabled: true
    });
    day.enabled = true;
  }

  onTimeChange(day: DayAvailability, slotIndex: number) {
    // Ensure periods are set if missing
    const slot = day.timeSlots[slotIndex];
    if (!slot.startPeriod) slot.startPeriod = 'AM';
    if (!slot.endPeriod) slot.endPeriod = 'PM';
    
    // Validate the time slot after user changes
    const start24 = this.convertTo24HourTime(slot.start, slot.startPeriod);
    const end24 = this.convertTo24HourTime(slot.end, slot.endPeriod);
    
    if (start24 >= end24) {
      // Auto-adjust end time to be 1 hour after start time
      const [hours, minutes] = start24.split(':').map(Number);
      const endHour = (hours + 1) % 24;
      const newEnd24 = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      slot.end = this.convertTo12HourTime(newEnd24);
      slot.endPeriod = this.getTimePeriod(newEnd24);
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
          if (slot.enabled && slot.startPeriod && slot.endPeriod) {
            availability.push({
              dayOfWeek: day.dayOfWeek,
              startTime: this.convertTo24HourTime(slot.start, slot.startPeriod),
              endTime: this.convertTo24HourTime(slot.end, slot.endPeriod),
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
    if (!slot.startPeriod || !slot.endPeriod) return false;
    const start24 = this.convertTo24HourTime(slot.start, slot.startPeriod);
    const end24 = this.convertTo24HourTime(slot.end, slot.endPeriod);
    return start24 < end24;
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