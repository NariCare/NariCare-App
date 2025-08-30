export interface OnboardingData {
  // Step 1: Personal Information
  personalInfo: {
    email: string;
    fullName: string;
    phoneNumber: string;
    employmentStatus: 'employed' | 'unemployed' | 'maternity_leave' | 'student';
    languagesSpoken: string[];
  };

  // Step 2: Pregnancy & Birth Information
  pregnancyInfo: {
    motherType: 'pregnant' | 'new_mom';
    dueDate?: string; // Required if pregnant
    isFirstChild: boolean;
    
    // Baby information - required if new_mom
    babyInfo?: {
      name: string;
      dateOfBirth: string;
      gender: 'male' | 'female' | 'other';
      birthWeight: number; // in kg
      birthHeight: number; // in cm
      deliveryType: 'vaginal' | 'c_section' | 'assisted';
      gestationalAge: number; // in weeks
      currentWeight?: number; // most recent weight
      weightCheckDate?: string;
    };
  };

  // Step 3: Breastfeeding Details
  breastfeedingInfo: {
    experienceLevel: 'first_time' | 'experienced' | 'had_challenges';
    currentlyBreastfeeding: boolean;
    
    // Required if currently breastfeeding
    breastfeedingDetails?: {
      directFeedsPerDay: number; // 0-12+
      latchQuality: 'deep' | 'shallow' | 'varies';
      offersBothBreasts: boolean;
      timePerBreast: '5_min' | '10_min' | '15_min' | '20_min' | 'varies';
      breastfeedingDuration: string; // how long planning to breastfeed
    };

    // Baby's output tracking
    babyOutput: {
      peeCount24h: number;
      poopCount24h: number;
    };
  };

  // Step 4: Medical & Health Information
  medicalInfo: {
    motherMedicalConditions: string[]; // Pre-defined list + "Other" option
    motherMedicalConditionsOther?: string;
    allergies: string;
    nippleAnatomicalIssues: boolean;
    nippleIssuesDescription?: string; // Required if nippleAnatomicalIssues is true
    
    // Baby medical info
    babyMedicalConditions: string;
    babyHospitalized: boolean;
    babyHospitalizationReason?: string; // Required if babyHospitalized is true
  };

  // Step 5: Feeding & Pumping
  feedingInfo: {
    usesFormula: boolean;
    
    // Formula details - required if usesFormula is true
    formulaDetails?: {
      formulaType: string;
      amountPerFeed: number;
      feedsPerDay: number;
      reasonForFormula: string;
    };

    usesBottle: boolean;
    
    // Bottle details - required if usesBottle is true
    bottleDetails?: {
      bottleType: string;
      amountPerFeed: number;
      feedsPerDay: number;
      contentType: 'breast_milk' | 'formula' | 'both';
    };

    ownsPump: boolean;
    
    // Pumping details - required if ownsPump is true
    pumpingDetails?: {
      pumpType: 'manual' | 'electric_single' | 'electric_double';
      sessionsPerDay: number;
      averageOutput: number; // ml per session
      pumpingDuration: number; // minutes per session
      storageMethod: string[];
    };

    usesBreastmilkSupplements: boolean;
    supplementsDetails?: string; // Required if usesBreastmilkSupplements is true
  };

  // Step 6: Support System & Demographics
  supportInfo: {
    currentSupportSystem: string;
    familyStructure: 'nuclear' | 'extended' | 'single_parent' | 'other';
    educationLevel: 'high_school' | 'some_college' | 'bachelors' | 'masters' | 'doctorate';
    householdIncome: 'under_25k' | '25k_50k' | '50k_75k' | '75k_100k' | '100k_150k' | 'over_150k' | 'prefer_not_to_say';
  };

  // Step 7: Preferences & Goals
  preferencesInfo: {
    currentChallenges: string[]; // Multi-select from predefined list
    expectationsFromProgram: string;
    milkSupplyGoals?: string; // Optional - for mothers with supply concerns
    
    // Notification preferences
    notificationPreferences: {
      articleUpdates: boolean;
      consultationReminders: boolean;
      groupMessages: boolean;
      growthReminders: boolean;
      expertMessages: boolean;
      pumpingReminders: boolean;
    };

    topicsOfInterest: string[]; // Multi-select from predefined list
  };

  // Metadata
  completedSteps: number[];
  isCompleted: boolean;
  completedAt?: Date;
}

// Predefined options for dropdowns and multi-selects
export const OnboardingOptions = {
  employmentStatus: [
    { value: 'employed', label: 'Employed (including maternity leave)' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'student', label: 'Student' },
  ],

  languages: [
    'Hindi',
    'English', 
    'Bengali',
    'Telugu',
    'Marathi',
    'Tamil',
    'Gujarati',
    'Urdu',
    'Kannada',
    'Odia',
    'Malayalam',
    'Punjabi',
    'Assamese',
    'Maithili',
    'Sanskrit',
    'Nepali',
    'Konkani',
    'Manipuri',
    'Bodo',
    'Dogri',
    'Kashmiri',
    'Santali',
    'Other'
  ],

  deliveryTypes: [
    { value: 'vaginal', label: 'Vaginal delivery' },
    { value: 'c_section', label: 'Cesarean section' },
    { value: 'assisted', label: 'Assisted delivery (forceps/vacuum)' },
  ],

  experienceLevels: [
    { value: 'first_time', label: 'This is my first baby' },
    { value: 'experienced', label: 'I have breastfed before successfully' },
    { value: 'had_challenges', label: 'I had challenges with previous children' },
  ],

  latchQuality: [
    { value: 'deep', label: 'Deep latch' },
    { value: 'shallow', label: 'Shallow latch' },
    { value: 'varies', label: 'Varies by feeding' },
  ],

  timePerBreast: [
    { value: '5_min', label: '5 minutes or less' },
    { value: '10_min', label: '10 minutes' },
    { value: '15_min', label: '15 minutes' },
    { value: '20_min', label: '20 minutes or more' },
    { value: 'varies', label: 'Varies by feeding' },
  ],

  motherMedicalConditions: [
    'Diabetes', 'Hypertension', 'Thyroid disorders', 'PCOS', 'Depression/Anxiety',
    'Previous breast surgery', 'Medications affecting milk supply', 'Hormonal imbalances',
    'Mastitis history', 'IGT (Insufficient Glandular Tissue)', 'None', 'Other'
  ],

  familyStructure: [
    { value: 'nuclear', label: 'Nuclear family (partner + children)' },
    { value: 'extended', label: 'Extended family (grandparents, relatives)' },
    { value: 'single_parent', label: 'Single parent' },
    { value: 'other', label: 'Other family structure' },
  ],

  educationLevels: [
    { value: 'high_school', label: 'High school or equivalent' },
    { value: 'some_college', label: 'Some college' },
    { value: 'bachelors', label: "Bachelor's degree" },
    { value: 'masters', label: "Master's degree" },
    { value: 'doctorate', label: 'Doctorate degree' },
  ],

  householdIncomes: [
    { value: 'under_25k', label: 'Under $25,000' },
    { value: '25k_50k', label: '$25,000 - $50,000' },
    { value: '50k_75k', label: '$50,000 - $75,000' },
    { value: '75k_100k', label: '$75,000 - $100,000' },
    { value: '100k_150k', label: '$100,000 - $150,000' },
    { value: 'over_150k', label: 'Over $150,000' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ],

  currentChallenges: [
    'Latching difficulties', 'Low milk supply', 'Oversupply', 'Sore/cracked nipples',
    'Engorgement', 'Blocked ducts', 'Mastitis', 'Pumping issues', 'Sleep deprivation',
    'Time management', 'Returning to work', 'Partner support', 'Family pressure',
    'Public breastfeeding confidence', 'Pain while feeding', 'Baby weight concerns'
  ],

  topicsOfInterest: [
    'Newborn care basics', 'Sleep training', 'Nutrition during breastfeeding',
    'Pumping and storage', 'Returning to work', 'Baby development milestones',
    'Maternal mental health', 'Partner involvement', 'Weaning guidance',
    'Milk supply optimization', 'Dealing with growth spurts', 'Travel with baby'
  ],

  pumpTypes: [
    { value: 'manual', label: 'Manual pump' },
    { value: 'electric_single', label: 'Electric single pump' },
    { value: 'electric_double', label: 'Electric double pump' },
  ],

  storageMethod: [
    'Refrigerator (fresh milk)', 'Freezer bags', 'Storage bottles', 
    'Ice packs for transport', 'Freezer stash'
  ]
};

// Helper interfaces for form validation and step management
export interface OnboardingStepValidation {
  stepNumber: number;
  isValid: boolean;
  requiredFields: string[];
  errors: { [key: string]: string };
}

export interface OnboardingProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  percentComplete: number;
  canProceed: boolean;
}

// Data mapping interfaces for syncing with existing modules
export interface OnboardingDataMapping {
  userProfile: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    employmentStatus: string;
    languages: string[];
    medicalConditions: string[];
    allergies: string;
  };

  babyProfile: {
    name: string;
    dateOfBirth: Date;
    gender: string;
    birthWeight: number;
    birthHeight: number;
    deliveryType: string;
    gestationalAge: number;
  };

  growthRecords: {
    babyId: string;
    weight: number;
    recordDate: Date;
    notes: string;
  }[];

  feedingPreferences: {
    breastfeedingGoals: string;
    pumpingSchedule: any;
    formulaPreferences: any;
  };

  notificationSettings: {
    [key: string]: boolean;
  };
}