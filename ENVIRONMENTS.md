# Environment Configuration

This project supports three different environments: **Local**, **Beta**, and **Production**. Each environment has its own configuration and API endpoints.

## Environment Overview

| Environment | Production | Beta | Local | API URL | Use Case |
|-------------|------------|------|-------|---------|----------|
| **Local** | `false` | `false` | `true` | `http://localhost:3000/api` | Local development |
| **Beta** | `false` | `true` | `false` | `https://beta-api.naricare.com/api` | Staging/testing |
| **Production** | `true` | `false` | `false` | `https://api.naricare.com/api` | Live production |

## Environment Files

- `src/environments/environment.ts` - Local development environment
- `src/environments/environment.beta.ts` - Beta/staging environment  
- `src/environments/environment.prod.ts` - Production environment

## Available Commands

### Development Server

```bash
# Local development (default)
npm run start
# or
ionic serve

# Beta environment
npm run start:beta
# or
ionic serve --configuration beta

# Production environment (not recommended for development)
ng serve --configuration production
```

### Building

```bash
# Development build
npm run build

# Beta build
npm run build:beta
# or
ionic build --configuration beta

# Production build
npm run build:prod
# or
ionic build --configuration production
```

### Ionic-specific Commands

```bash
# Ionic serve commands
ionic:serve          # Local development
ionic:serve:beta     # Beta environment

# Ionic build commands
ionic:build          # Development build
ionic:build:beta     # Beta build
ionic:build:prod     # Production build
```

## Environment Detection

You can detect the current environment directly from the environment configuration:

```typescript
import { environment } from '../environments/environment';

// Check if production
if (environment.production) {
  // Production-specific logic
}

// Check if beta (cast to any to access beta property)
if ((environment as any).beta) {
  // Beta-specific logic
}

// Check if local development (cast to any to access local property)
if ((environment as any).local) {
  // Local development logic
}

// Get API URL
const apiUrl = environment.apiUrl;

// Log environment info for debugging
if (!environment.production) {
  console.log('Environment:', environment);
}
```

## Configuration Details

### Local Environment
- **Purpose**: Local development
- **API**: Points to localhost backend
- **Features**: Full debugging, source maps, hot reload
- **Firebase**: Uses the `naricare-app` project (same for all environments)

### Beta Environment  
- **Purpose**: Staging/testing before production
- **API**: Points to beta API server
- **Features**: Production-like optimizations with source maps for debugging
- **Firebase**: Uses the `naricare-app` project (same as production)
- **Deployment**: Netlify site `naricare-app`, https://beta-app.naricare.com, built from `staging`

### Production Environment
- **Purpose**: Live production application
- **API**: Points to production API server
- **Features**: Full optimizations, no source maps, minified
- **Firebase**: Uses the `naricare-app` project
- **Deployment**: Netlify site `naricare-prod`, https://app.naricare.com, built from `master`

## Deployment Workflow

The app is hosted on Netlify. Each site auto-builds when its branch changes.

| Env | Netlify site | URL | Branch | Build |
|-----|--------------|-----|--------|-------|
| Beta | `naricare-app` | https://beta-app.naricare.com | `staging` | `npm run build:beta` |
| Production | `naricare-prod` | https://app.naricare.com | `master` | `npm run build:prod` |

1. **Local Development**: Create a feature branch from `staging` and test locally
2. **Beta Testing**: Open a PR into `staging`; on merge, Netlify deploys Beta
3. **Production Release**: After Beta approval, open a PR from `staging` into `master`; on merge, Netlify deploys Prod

Manual fallback (after building into `dist/`):

```bash
npx -p netlify-cli netlify deploy --prod --no-build --dir dist --site <site>
```

## Environment Variables

Each environment can have different configurations for:

- API URLs
- Firebase configuration
- Feature flags
- Debug settings
- Analytics tracking
- Third-party service endpoints

## Best Practices

1. **Never commit sensitive data** to environment files
2. **Use environment detection** for conditional logic
3. **Test in beta** before production deployment
4. **Keep environment configs in sync** for shared settings
5. **Use descriptive API URLs** that clearly indicate the environment

## Troubleshooting

### Common Issues

1. **Wrong API URL**: Check that the environment is building with the correct configuration
2. **Firebase Configuration**: Ensure Firebase settings match the intended environment
3. **Cache Issues**: Clear browser cache when switching environments

### Debugging

```typescript
// Add this to your app.component.ts to see current environment
import { EnvironmentUtil } from './shared/utils/environment.util';

export class AppComponent {
  constructor() {
    EnvironmentUtil.logEnvironmentInfo();
  }
}
```

## Security Notes

- Local environment uses localhost API (for development only)
- Beta environment should use HTTPS in staging
- Production environment must use HTTPS
- Never expose production API keys in non-production environments
- Use different Firebase projects for different environments when possible