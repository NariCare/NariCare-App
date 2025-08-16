/*
  # Add New User Fields Migration
  
  1. Schema Updates
    - Add `whatsapp_number` column to users table
    - Add `mother_type` column to users table  
    - Add `due_date` column to users table
    - Add `social_provider` column to users table
  
  2. Data Integrity
    - All new columns are optional to maintain compatibility
    - Proper constraints and indexes added
    
  3. Notes
    - These fields support the enhanced registration and onboarding flow
    - Social provider tracking for authentication analytics
*/

-- Add new columns to users table
DO $$
BEGIN
  -- Add whatsapp_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE users ADD COLUMN whatsapp_number VARCHAR(20);
  END IF;
  
  -- Add mother_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'mother_type'
  ) THEN
    ALTER TABLE users ADD COLUMN mother_type VARCHAR(20) CHECK (mother_type IN ('pregnant', 'new_mom'));
  END IF;
  
  -- Add due_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE users ADD COLUMN due_date DATE;
  END IF;
  
  -- Add social_provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'social_provider'
  ) THEN
    ALTER TABLE users ADD COLUMN social_provider VARCHAR(50);
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_mother_type ON users(mother_type);
CREATE INDEX IF NOT EXISTS idx_users_social_provider ON users(social_provider);
CREATE INDEX IF NOT EXISTS idx_users_due_date ON users(due_date) WHERE due_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.whatsapp_number IS 'WhatsApp contact number for user communication';
COMMENT ON COLUMN users.mother_type IS 'Type of mother: pregnant or new_mom';
COMMENT ON COLUMN users.due_date IS 'Expected due date for pregnant mothers';
COMMENT ON COLUMN users.social_provider IS 'Social authentication provider: google, facebook, etc.';