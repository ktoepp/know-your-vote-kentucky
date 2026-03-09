/**
 * Environment variable validation utilities
 * Ensures required environment variables are present for batch processing
 */

export interface RequiredEnvVars {
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  [key: string]: string | undefined;
}

/**
 * Validate that required environment variables are present
 * @param requiredVars Array of required environment variable names
 * @returns Object with validation results
 */
export function validateEnvironmentVariables(requiredVars: string[] = []): {
  isValid: boolean;
  missing: string[];
  present: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const present: string[] = [];
  const warnings: string[] = [];

  // Default required variables for KY content processing
  const defaultRequired = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
  const allRequired = [...new Set([...defaultRequired, ...requiredVars])];

  for (const varName of allRequired) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else {
      present.push(varName);
      
      // Add warnings for potentially invalid values
      if (varName.includes('API_KEY') && value.length < 20) {
        warnings.push(`${varName} appears to be too short for a valid API key`);
      }
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    present,
    warnings
  };
}

/**
 * Check if environment is properly configured for processing
 * @param requiredVars Additional required variables beyond defaults
 * @returns True if environment is ready for processing
 */
export function isProcessingEnvironmentReady(requiredVars: string[] = []): boolean {
  const validation = validateEnvironmentVariables(requiredVars);
  
  if (!validation.isValid) {
    console.error('❌ Missing required environment variables:');
    validation.missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your .env.local file and ensure all required variables are set.');
    return false;
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:');
    validation.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }

  console.log('✅ Environment variables validated successfully');
  return true;
}

/**
 * Display environment configuration status
 * @param requiredVars Additional required variables beyond defaults
 */
export function displayEnvironmentStatus(requiredVars: string[] = []): void {
  const validation = validateEnvironmentVariables(requiredVars);
  
  console.log('\n🔧 Environment Configuration Status:');
  console.log('=====================================');
  
  if (validation.present.length > 0) {
    console.log('✅ Present variables:');
    validation.present.forEach(varName => {
      const value = process.env[varName];
      const displayValue = varName.includes('API_KEY') 
        ? `${value?.substring(0, 8)}...${value?.substring(value.length - 4)}`
        : value;
      console.log(`   - ${varName}: ${displayValue}`);
    });
  }

  if (validation.missing.length > 0) {
    console.log('❌ Missing variables:');
    validation.missing.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  if (validation.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    validation.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }

  console.log(`\nOverall Status: ${validation.isValid ? '✅ Ready' : '❌ Not Ready'}`);
}

/**
 * Get environment variable with fallback
 * @param varName Environment variable name
 * @param fallback Fallback value if variable is not set
 * @returns Environment variable value or fallback
 */
export function getEnvVar(varName: string, fallback?: string): string | undefined {
  return process.env[varName] || fallback;
}

/**
 * Get required environment variable (throws if missing)
 * @param varName Environment variable name
 * @returns Environment variable value
 * @throws Error if variable is not set
 */
export function getRequiredEnvVar(varName: string): string {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable ${varName} is not set`);
  }
  return value;
} 