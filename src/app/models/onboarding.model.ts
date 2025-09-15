export interface OnboardingData {
  // Step 1: Mother's Personal Profile (removed redundant fields from registration)
  personalInfo: {
    motherAge: number;
    city: string;
    state: string;
    employmentStatus: 'employed' | 'unemployed' | 'maternity_leave' | 'student';
    languagesSpoken: string[];
    motherMedicalConditions: string[];
    motherMedicalConditionsOther?: string;
    allergies: string;
    hasNippleIssues: boolean;
    nippleIssuesDescription?: string;
    breastfeedingDuration: string;
  };

  // Step 2: Pregnancy Status & Baby Information
  pregnancyInfo: {
    motherType: 'pregnant' | 'new_mom';
    expectedDueDate?: string; // Required if pregnant
    isFirstChild: boolean; // Moved from personalInfo since it appears in step 2 UI
    
    // Baby information - required if new_mom, supports multiple babies
    babies?: {
      name: string;
      dateOfBirth: string;
      gender: 'male' | 'female' | 'other';
      birthWeight: number; // in kg
      mostRecentWeight: number; // in kg
      dateOfMostRecentWeightCheck: string;
      birthHeight: number; // in cm
      deliveryType: 'vaginal' | 'c_section' | 'assisted';
      gestationalAge: number; // in weeks
      
      // Breastfeeding Details (per baby)
      directBreastfeedsIn24h: number;
      latchQuality: 'excellent' | 'good' | 'fair' | 'poor';
      offersBothBreastsPerFeeding: boolean;
      timeLatched: string; // time range options
      
      // Daily Output (per baby)
      wetDiapersIn24h: number;
      dirtyDiapersIn24h: number;
      
      // Health Information (per baby)
      medicalConditions: string;
      hasBeenHospitalized: boolean;
      hospitalizationReason?: string;
      
      // Formula Feeding Details (per baby)
      formulaBrand?: string;
      formulaBrandOther?: string;
      formulaTimesPerDay?: number;
      formulaAmountPerFeed?: number;
      formulaReason?: string;
      formulaReasonOther?: string;
    }[];
    
    // Keep babyInfo for backward compatibility
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

  // Step 3: Formula & Bottle Feeding Details
  formulaFeedingInfo: {
    usesFormula: boolean;
    
    // Formula details - required if usesFormula is true
    formulaDetails?: {
      formulaBrand: string;
      timesOfferedPerDay: number;
      amountPerFeed: number; // in ml
      reasonForFormula: string;
    };
    
    // Bottle feeding details
    usesBottles: boolean;
    bottleDetails?: {
      bottleBrand: string;
      bottleBrandOther?: string; // For "Other" bottle brand
      feedDuration: string; // time to finish feed
      usesPacedBottleFeeding: boolean;
      bottleContents: 'breast_milk' | 'formula' | 'both';
    };
    
    // Pumping details
    usesPump: boolean;
    pumpingDetails?: {
      pumpBrand: string;
      pumpBrandOther?: string; // For "Other" pump brand
      pumpType: 'manual' | 'electric_single' | 'electric_double';
      pumpsBothBreasts: boolean;
      sessionsPerDay: number;
      minutesPerSession: number;
      averageOutputMl: number;
      totalDailyOutput: number;
    };
  };

  // Step 4: Support System & Demographics
  supportInfo: {
    currentSupportSystem: string[]; // Changed to array for multi-select
    currentSupportSystemOther?: string; // Optional field for "Other" input
    familyStructure: 'nuclear' | 'extended' | 'single_parent' | 'other';
    educationLevel: 'high_school' | 'some_college' | 'bachelors' | 'masters' | 'doctorate';
    householdIncome: 'under_3l' | '3l_6l' | '6l_10l' | '10l_15l' | '15l_25l' | 'over_25l' | 'prefer_not_to_say';
  };

  // Step 5: Current Challenges & Program Expectations
  challengesAndExpectationsInfo: {
    currentChallenges: string[]; // Multi-select from predefined list (for new mothers)
    breastfeedingGoals: string[]; // Multi-select from predefined list (for expecting mothers)
    breastfeedingGoalsOther?: string; // Optional field for "Other" input
    expectationsFromProgram: string;
  };

  // Metadata
  completedSteps: number[];
  isCompleted: boolean;
  completedAt?: Date;
}

// Predefined options for dropdowns and multi-selects
export const OnboardingOptions = {
  employmentStatus: [
    { value: 'employed', label: 'Employed' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'maternity_leave', label: 'On Maternity Leave' },
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

  indianStates: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Other'
  ],

  motherMedicalConditions: [
    'Diabetes', 'Hypertension', 'Thyroid disorders', 'PCOS', 'Depression/Anxiety',
    'Previous breast surgery', 'Medications affecting milk supply', 'Hormonal imbalances',
    'Mastitis history', 'IGT (Insufficient Glandular Tissue)', 'Other'
  ],

  breastfeedingDuration: [
    { value: '1_month', label: '1 month' },
    { value: '3_months', label: '3 months' },
    { value: '6_months', label: '6 months' },
    { value: '1_year', label: '1 year' },
    { value: '18_months', label: '18 months' },
    { value: '2_years', label: '2 years' },
    { value: '2_years_plus', label: 'More than 2 years' },
    { value: 'as_long_as_possible', label: 'As long as possible' }
  ],

  deliveryTypes: [
    { value: 'vaginal', label: 'Vaginal delivery' },
    { value: 'c_section', label: 'Cesarean section' },
    { value: 'assisted', label: 'Assisted delivery (forceps/vacuum)' },
  ],

  latchQuality: [
    { value: 'deep', label: 'Deep latch, no pain' },
    { value: 'shallow', label: 'Shallow latch, causes pain' },
    { value: 'not_latching', label: 'Not latching at all' },
  ],

  timeLatched: [
    { value: '5_min', label: '5 minutes or less' },
    { value: '10_min', label: '6-10 minutes' },
    { value: '15_min', label: '11-15 minutes' },
    { value: '20_min', label: '16-20 minutes' },
    { value: '20_plus', label: '20+ minutes' },
  ],

  commonFormulaBrands: [
    'Nestle NAN', 'Enfamil', 'Similac', 'Aptamil', 'Farex', 'Lactogen', 'Other'
  ],

  formulaReasons: [
    'Low milk supply', 'Baby not gaining weight', 'Returning to work',
    'Medical reasons', 'Personal choice', 'Convenience', 'Other'
  ],

  commonBottleBrands: [
    'Philips Avent', 'Dr. Brown\'s', 'Tommee Tippee', 'MAM', 'Chicco', 'Medela', 'Other'
  ],

  bottleContents: [
    { value: 'breast_milk', label: 'Breast milk only' },
    { value: 'formula', label: 'Formula only' },
    { value: 'both', label: 'Both breast milk and formula' }
  ],

  bottleFeedDuration: [
    { value: '5_min', label: '5 minutes or less' },
    { value: '10_min', label: '6-10 minutes' },
    { value: '15_min', label: '11-15 minutes' },
    { value: '20_min', label: '16-20 minutes' },
    { value: '20_plus', label: 'More than 20 minutes' }
  ],

  commonPumpBrands: [
    'Medela', 'Spectra', 'Philips Avent', 'Lansinoh', 'Ameda', 'Tommee Tippee', 'Other'
  ],

  pumpTypes: [
    { value: 'manual', label: 'Manual pump' },
    { value: 'electric_single', label: 'Electric single pump' },
    { value: 'electric_double', label: 'Electric double pump' },
  ],

  familyStructure: [
    { value: 'nuclear_same_city', label: 'Nuclear, family in same city' },
    { value: 'nuclear_different_city', label: 'Nuclear, family in different city' },
    { value: 'nuclear_different_country', label: 'Nuclear, family in different country' },
    { value: 'joint_family', label: 'Joint Family' },
  ],

  educationLevels: [
    { value: 'high_school', label: 'High School' },
    { value: 'bachelors', label: "Bachelor's" },
    { value: 'masters', label: "Master's" },
    { value: 'doctoral', label: 'Doctoral Degree' },
  ],

  householdIncomes: [
    { value: '0_10l', label: '0-10 Lakhs' },
    { value: '10_25l', label: '10-25 Lakhs' },
    { value: '25_35l', label: '25-35 Lakhs' },
    { value: '35_50l', label: '35-50 Lakhs' },
    { value: '50plus_l', label: '50+ Lakhs' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ],

  currentChallenges: [
    'Latching difficulties', 'Low milk supply', 'Oversupply', 'Sore/cracked nipples',
    'Engorgement', 'Blocked ducts', 'Mastitis', 'Pumping issues', 'Sleep deprivation',
    'Time management', 'Returning to work', 'Partner support', 'Family pressure',
    'Public breastfeeding confidence', 'Pain while feeding', 'Baby weight concerns',
    'None - everything is going well'
  ],

  supportSystem: [
    'Parents/In-Laws',
    'Nanny/Jhapa', 
    'Minimal or No Help',
    'Other'
  ],

  breastfeedingGoals: [
    'Get breastfeeding education from a leading lactation expert',
    'Would like to achieve exclusive breastfeeding',
    'Would like to replace some formula feeds and come to largely breastfeeding',
    'Feel Confident and have a smooth breastfeeding journey',
    'Other'
  ],

  babyMedicalConditions: [
    'Jaundice', 'Tongue tie', 'Lip tie', 'Reflux', 'Colic', 'Low birth weight',
    'Premature birth', 'Breathing difficulties', 'Feeding difficulties', 
    'Heart conditions', 'Allergies', 'Other'
  ],

  // Legacy options still referenced in HTML (will be updated later)
  timePerBreast: [
    { value: '0_min', label: '0 min' },
    { value: '5_min', label: '5 minutes or less' },
    { value: '10_min', label: '6-10 minutes' },
    { value: '15_min', label: '11-15 minutes' },
    { value: '20_min', label: '16-20 minutes' },
    { value: '20_plus', label: '20+ minutes' },
  ],

  experienceLevels: [
    { value: 'first_time', label: 'This is my first baby' },
    { value: 'experienced', label: 'I have breastfed before successfully' },
    { value: 'had_challenges', label: 'I had challenges with previous children' },
  ],

  storageMethod: [
    'Refrigerator (fresh milk)', 'Freezer bags', 'Storage bottles', 
    'Ice packs for transport', 'Freezer stash'
  ],

  topicsOfInterest: [
    'Newborn care basics', 'Sleep training', 'Nutrition during breastfeeding',
    'Pumping and storage', 'Returning to work', 'Baby development milestones',
    'Maternal mental health', 'Partner involvement', 'Weaning guidance',
    'Milk supply optimization', 'Dealing with growth spurts', 'Travel with baby'
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
    motherAge: number;
    city: string;
    state: string;
  };

  babyProfile: {
    name: string;
    dateOfBirth: Date;
    gender: string;
    birthWeight: number;
    birthHeight: number;
    deliveryType: string;
    gestationalAge: number;
    currentWeight: number;
    weightCheckDate: Date;
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
}