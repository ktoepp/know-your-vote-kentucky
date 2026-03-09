# Know Your Vote Kentucky

> **Note:** All documentation files are now located in the root of the project for easy discovery and linking.

## 📚 Documentation Index

- [APP_STRUCTURE.md](./APP_STRUCTURE.md): Comprehensive guide to the application structure and feature prioritization.
- [NAVIGATION_STRATEGY.md](./NAVIGATION_STRATEGY.md): Detailed navigation strategy and user experience optimization.
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md): Developer guide covering setup, workflow, styling, API, and troubleshooting.
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md): Complete API reference, endpoints, parameters, and usage.
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md): Database design, table structures, RLS, and management.
- [ACCESSIBILITY_GUIDE.md](./ACCESSIBILITY_GUIDE.md): Accessibility compliance and best practices.
- [STYLING_CONSOLIDATION.md](./STYLING_CONSOLIDATION.md): Styling system, theme, and performance documentation.
- [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md): Database migration and setup procedures.
- [TOOLTIP_SYSTEM.md](./TOOLTIP_SYSTEM.md): Educational tooltip implementation guide.
- [political-intelligence-system.md](./political-intelligence-system.md): AI-powered political analysis features.
- [congressional-labeling-system.md](./congressional-labeling-system.md): Bill categorization and labeling system.
- [UI_IMPROVEMENTS_SUMMARY.md](./UI_IMPROVEMENTS_SUMMARY.md): Summary of UI improvements and design changes.
- [CHAMBER_NORMALIZATION.md](./CHAMBER_NORMALIZATION.md): Chamber normalization strategies and data handling.
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md): Quick reference for common tasks and commands.
- [ICON_THEMING.md](./ICON_THEMING.md): Icon theming and usage guide.
- [THEME_SYSTEM.md](./THEME_SYSTEM.md): Theme system and dark mode documentation.
- [ARCHIVE.md](./ARCHIVE.md): Archive of deprecated or legacy documentation.
- [proposed-event-graph-model.md](./proposed-event-graph-model.md): Proposed event graph data model.

Welcome to the SeeSpan documentation! This comprehensive guide covers all aspects of the SeeSpan congressional bill tracking and visualization system.

## 📚 Documentation Overview

SeeSpan is a modern web application that provides real-time tracking and visualization of congressional bills, events, and activities. Built with Next.js, TypeScript, and Supabase, it offers an accessible, responsive interface for civic engagement and government transparency.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Supabase account (for database)
- Congress.gov API key (optional)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd seespan

# Install dependencies
npm install

# Set up environment variables
cp env-template.txt .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application in action!

## 📖 Documentation Structure

### Core Guides

#### [App Structure Documentation](./APP_STRUCTURE.md) ⭐ **NEW**
Comprehensive guide to the application structure and feature prioritization:
- **Primary User-Facing Features**: Home, Live Content, Search, Bills, Events
- **Core Infrastructure**: Navigation, Theme System, Tooltip System
- **Preserved Subpages**: All subpages maintained for future development
- **Streamlining Strategy**: Phased approach to feature optimization
- **Success Metrics**: Performance and user experience targets

#### [Navigation Strategy](./NAVIGATION_STRATEGY.md) ⭐ **NEW**
Detailed navigation strategy and user experience optimization:
- **Primary Navigation**: Core feature access and user controls
- **Secondary Navigation**: Contextual access to preserved subpages
- **Responsive Design**: Mobile-first navigation patterns
- **Implementation Roadmap**: Phased development approach
- **User Experience Goals**: Intuitive navigation and fast access

#### [Development Guide](./DEVELOPMENT_GUIDE.md)
Comprehensive guide for developers covering:
- Project setup and architecture
- Development workflow and best practices
- Styling system and component guidelines
- API integration patterns
- Testing and deployment procedures
- Troubleshooting common issues

#### [API Documentation](./API_DOCUMENTATION.md)
Complete API reference including:
- All available endpoints and their parameters
- Request/response formats and data models
- Error handling and rate limiting
- External API integrations (Congress.gov, GovInfo)
- Code examples and usage patterns

#### [Database Schema](./DATABASE_SCHEMA.md)
Database design and management guide covering:
- Table structures and relationships
- Indexes and performance optimization
- Row Level Security (RLS) policies
- Backup and recovery procedures
- Data validation and cleanup functions

#### [Accessibility Guide](./ACCESSIBILITY_GUIDE.md)
Accessibility compliance and best practices:
- WCAG 2.1 AA compliance requirements
- Color contrast and keyboard navigation
- Screen reader support and ARIA implementation
- Testing procedures and tools
- Component accessibility guidelines

#### [Styling Consolidation](./STYLING_CONSOLIDATION.md)
Styling system documentation:
- CSS architecture and organization
- Theme system and dark mode support
- Component styling guidelines
- Accessibility considerations
- Performance optimization

### Additional Resources

#### [Supabase Migration](./SUPABASE_MIGRATION.md)
Database migration and setup procedures

#### [Tooltip System](./TOOLTIP_SYSTEM.md)
Educational tooltip implementation guide

#### [Political Intelligence System](./political-intelligence-system.md)
AI-powered political analysis features

#### [Congressional Labeling System](./congressional-labeling-system.md)
Bill categorization and labeling system

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS v4, CSS Variables
- **Database**: Supabase (PostgreSQL)
- **APIs**: Congress.gov, GovInfo
- **Deployment**: Vercel (recommended)

### Key Features
- **Real-time Data**: Live congressional data from Congress.gov
- **Bill Tracking**: Comprehensive bill status and progress monitoring
- **Interactive Visualizations**: Graphs, timelines, and relationship mapping
- **Educational Tooltips**: Government term explanations and context
- **Accessibility**: WCAG 2.1 AA compliant design
- **Responsive Design**: Mobile-first approach with touch optimization
- **Dark Mode**: Automatic and manual theme switching
- **Search**: Full-text search across bills, events, and content

### Project Structure
```
seespan/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── components/        # App-specific components
│   │   ├── globals.css        # Global styles
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Shared components
│   │   ├── bills/            # Bill-related components
│   │   ├── ui/               # UI components
│   │   └── dev/              # Development tools
│   └── lib/                  # Utilities and helpers
├── docs/                     # Documentation
├── scripts/                  # Build and utility scripts
└── public/                   # Static assets
```

## 🎯 Feature Prioritization

### Primary User-Facing Features (Immediate Focus)
1. **Home Page** (`/`) - Main dashboard with live congressional activity
2. **Live Content** (`/live-content`) - Real-time congressional events
3. **Search** (`/search`) - Comprehensive congressional search
4. **Bills** (`/bills`) - Bill tracking and analysis
5. **Events** (`/events`) - Congressional event directory

### Core Infrastructure (Maintenance Focus)
- **Navigation System** - Primary navigation and user controls
- **Theme System** - Consistent styling and accessibility
- **Tooltip System** - Educational content for government terms

### Preserved Subpages (Future Development)
- **About, Members, Dashboard, Explore, Browse, Find Content, Activity, Table, Upload, Video, Social Content, Link Dashboard** - All preserved for future development

## 🔧 Development Workflow

### Code Style Guidelines
- **TypeScript**: Strict configuration with proper type definitions
- **React**: Functional components with hooks, proper error boundaries
- **CSS**: CSS variables for theming, BEM-like naming conventions
- **Accessibility**: WCAG AA compliance, ARIA labels, keyboard navigation

### Git Workflow
```bash
# Feature development
git checkout -b feature/your-feature-name
# Make changes
git commit -m "feat(scope): description"
git push origin feature/your-feature-name
# Create pull request
```

### Available Scripts
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with sample data

# Testing
npm run test            # Run unit tests
npm run test:e2e        # Run end-to-end tests
npm run test:contrast   # Check color contrast

# Linting
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript type checking
```

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#1e40af) - Navigation and primary actions
- **Secondary**: Green (#15803d) - Success states and positive actions
- **Accent**: Red (#b91c1c) - Error states and destructive actions
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Headings**: Clear hierarchy with proper contrast ratios
- **Body Text**: Readable font sizes with adequate line spacing
- **Accessibility**: Support for high contrast and forced colors modes

### Components
- **Navigation**: Responsive navigation with mobile menu
- **Cards**: Bill and event display cards with consistent styling
- **Tooltips**: Educational tooltips for government terms
- **Forms**: Accessible form components with proper validation

## 🔒 Security & Privacy

### Data Protection
- **Row Level Security (RLS)**: Database-level access control
- **API Rate Limiting**: Protection against abuse
- **Input Validation**: Server-side validation for all inputs
- **HTTPS**: Secure communication for all data transmission

### Privacy
- **Minimal Data Collection**: Only necessary user data is stored
- **User Control**: Users can manage their preferences and data
- **Transparency**: Clear privacy policy and data usage information

## 🚀 Deployment

### Production Deployment
1. **Vercel** (Recommended)
   - Connect GitHub repository
   - Configure environment variables
   - Automatic deployments on push

2. **Other Platforms**
   - Docker support available
   - Manual deployment instructions provided

### Environment Variables
```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
CONGRESS_API_KEY=your_congress_api_key
GOVINFO_API_KEY=your_govinfo_api_key
```

## 🤝 Contributing

### Getting Started
1. Read the [Development Guide](./DEVELOPMENT_GUIDE.md)
2. Review the [App Structure Documentation](./APP_STRUCTURE.md)
3. Set up your development environment
4. Choose an issue to work on
5. Follow the coding standards and guidelines
6. Submit a pull request

### Development Standards
- Write comprehensive tests for new features
- Ensure accessibility compliance
- Update documentation for changes
- Follow TypeScript best practices
- Maintain consistent code style

### Code Review Process
1. Self-review before submitting PR
2. Request reviews from team members
3. Address feedback promptly
4. Ensure CI/CD passes

## 📞 Support

### Getting Help
- **Documentation**: Start with the guides above
- **Issues**: Check existing issues or create new ones
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

### Common Issues
- **Build Errors**: Check TypeScript and linting errors
- **API Issues**: Verify environment variables and API keys
- **Styling Problems**: Review CSS variables and Tailwind configuration
- **Database Issues**: Check Supabase connection and RLS policies

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

- **Congress.gov**: For providing congressional data APIs
- **Supabase**: For the excellent database and real-time features
- **Next.js Team**: For the amazing React framework
- **Tailwind CSS**: For the utility-first CSS framework
- **Open Source Community**: For the tools and libraries that make this possible

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Maintainers**: SeeSpan Development Team

For the most up-to-date information, always refer to the latest documentation in the repository.

## 📄 Chamber Normalization

This directory contains comprehensive documentation for the SeeSpan congressional intelligence platform.

## Documentation Index

### Core Documentation
- [**README**](./README.md) - This overview
- [**APP_STRUCTURE**](./APP_STRUCTURE.md) - Application structure and navigation
- [**API_DOCUMENTATION**](./API_DOCUMENTATION.md) - API endpoints and data structures
- [**DATABASE_SCHEMA**](./DATABASE_SCHEMA.md) - Database schema and data models
- [**DEVELOPMENT_GUIDE**](./DEVELOPMENT_GUIDE.md) - Development setup and guidelines

### Feature Documentation
- [**ACCESSIBILITY_GUIDE**](./ACCESSIBILITY_GUIDE.md) - Accessibility standards and implementation
- [**THEME_SYSTEM**](./THEME_SYSTEM.md) - Theme system and styling architecture
- [**TOOLTIP_SYSTEM**](./TOOLTIP_SYSTEM.md) - Tooltip system and content guidelines
- [**CHAMBER_NORMALIZATION**](./CHAMBER_NORMALIZATION.md) - Chamber value standardization system

### User Guides
- [**QUICK_REFERENCE**](./QUICK_REFERENCE.md) - Quick reference for common tasks
- [**NAVIGATION_STRATEGY**](./NAVIGATION_STRATEGY.md) - Navigation patterns and user flows

### Technical Documentation
- [**STYLING_CONSOLIDATION**](./STYLING_CONSOLIDATION.md) - Styling consolidation and best practices
- [**ICON_THEMING**](./ICON_THEMING.md) - Icon theming and usage guidelines
- [**UI_IMPROVEMENTS_SUMMARY**](./UI_IMPROVEMENTS_SUMMARY.md) - UI improvements and enhancements

### Specialized Documentation
- [**CONGRESSIONAL_LABELING_SYSTEM**](./congressional-labeling-system.md) - Congressional labeling and categorization
- [**POLITICAL_INTELLIGENCE_SYSTEM**](./political-intelligence-system.md) - Political intelligence and analysis
- [**PROPOSED_EVENT_GRAPH_MODEL**](./proposed-event-graph-model.md) - Event graph model and relationships

### Archive
- [**ARCHIVE**](./ARCHIVE.md) - Archived documentation and deprecated features
- [**SUPABASE_MIGRATION**](./SUPABASE_MIGRATION.md) - Database migration documentation

## Enhanced Content Generation

SeeSpan's UI and API use an advanced content generation system for all bill and event cards. This system:
- Guarantees all titles and summaries are complete, self-contained thoughts (never fragments)
- Produces standardized lengths for visual consistency
- Avoids truncation with ellipses
- Uses professional, non-partisan, educational language

**How to use:**
- Pass `ensureCompleteThoughts: true` to the content generation utilities (`generateBillContent`, `generateEventContent`).
- See [docs/APP_STRUCTURE.md](./APP_STRUCTURE.md#enhanced-content-generation-system) for details and examples. 

## Real-Time Data Fetching for Key Players and Congressional Leaders

- The application now fetches the current President, Vice President, and congressional leaders in real time using the [White House API](https://www.whitehouse.gov/developers/) and [Congress.gov API](https://api.congress.gov/).
- If the APIs are unavailable, the app falls back to mock data to ensure the UI remains functional.
- API keys for Congress.gov must be set in your environment variables as `NEXT_PUBLIC_CONGRESS_API_KEY` (client) and `CONGRESS_API_KEY` (server).
- See `src/app/page.tsx` and `src/app/api/framer/speakers/route.ts` for implementation details. 