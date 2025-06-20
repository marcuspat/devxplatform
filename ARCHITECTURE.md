# DevEX Platform Architecture

## Overview

The DevEX Platform is an enterprise-grade service generation and development portal built with TypeScript in strict mode. It provides a comprehensive solution for generating services, APIs, and infrastructure with customizable templates and extensible plugin architecture.

## Core Architecture Decisions

### 1. Monorepo Structure with Workspaces
- **Decision**: Use npm workspaces for monorepo management
- **Rationale**: Enables shared dependencies, simplified build processes, and better code organization
- **Implementation**: Root package.json with workspaces configuration

### 2. TypeScript Strict Mode
- **Decision**: Enable all strict TypeScript compiler options
- **Rationale**: Maximum type safety, better developer experience, fewer runtime errors
- **Configuration**: Comprehensive tsconfig.json with strict: true and additional strict options

### 3. Plugin-based Architecture
- **Decision**: Extensible plugin system for customization
- **Rationale**: Allows enterprise customization without core modifications
- **Implementation**: Plugin manager with lifecycle hooks

### 4. Template Engine Flexibility
- **Decision**: Support both Handlebars and EJS template engines
- **Rationale**: Flexibility for different team preferences and template complexity
- **Implementation**: Configurable template renderer with rich helper functions

### 5. Configuration-driven Generation
- **Decision**: JSON/YAML configuration files define service specifications
- **Rationale**: Declarative approach, version control friendly, tooling integration
- **Implementation**: Zod-based validation schemas with comprehensive error handling

## Directory Structure

```
/Users/mp/Documents/Code/claude-code/projects/devxplatform/
├── packages/
│   ├── platform-core/          # Core engine and types
│   ├── templates/               # Template system implementation
│   ├── portal-ui/              # Web interface (React-based)
│   ├── cli/                    # Command-line interface
│   └── infrastructure/         # Deployment and infrastructure tools
├── examples/
│   ├── basic-service/          # Basic service generation example
│   └── microservice-cluster/   # Complex microservice example
├── package.json                # Root workspace configuration
├── tsconfig.json              # Root TypeScript configuration
├── .eslintrc.cjs              # ESLint configuration
├── .prettierrc                # Prettier configuration
└── ARCHITECTURE.md            # This file
```

## Package Details

### Platform Core (`@devex/platform-core`)

**Location**: `/Users/mp/Documents/Code/claude-code/projects/devxplatform/packages/platform-core/`

**Key Files**:
- `src/index.ts` - Main exports
- `src/engine/platform-engine.ts` - Core orchestration engine
- `src/engine/generator-engine.ts` - Service generation logic
- `src/engine/template-engine.ts` - Template rendering engine
- `src/engine/plugin-manager.ts` - Plugin lifecycle management
- `src/types/index.ts` - Comprehensive type definitions
- `src/config/schemas.ts` - Zod validation schemas
- `src/utils/` - Utility functions (logger, file operations, validation)

**Architecture**:
- Event-driven engine with plugin hooks
- Comprehensive error handling with custom error types
- Validation-first approach using Zod schemas
- Extensible generator system

### Templates (`@devex/templates`)

**Location**: `/Users/mp/Documents/Code/claude-code/projects/devxplatform/packages/templates/`

**Key Files**:
- `src/template-manager.ts` - Template orchestration
- `src/template-registry.ts` - Template discovery and registration
- `src/template-renderer.ts` - Multi-engine rendering (Handlebars/EJS)

**Features**:
- Dynamic template discovery
- Rich helper functions for code generation
- Conditional file generation
- Binary file support

### CLI (`@devex/cli`)

**Location**: `/Users/mp/Documents/Code/claude-code/projects/devxplatform/packages/cli/`

**Key Files**:
- `src/index.ts` - CLI entry point with Commander.js
- `src/commands/generate.ts` - Service generation command
- `src/commands/init.ts` - Project initialization
- `src/commands/list.ts` - Available options listing
- `src/commands/config.ts` - Configuration management

**Features**:
- Interactive and non-interactive modes
- Progress indicators with Ora
- Colored output with Chalk
- Comprehensive validation

### Portal UI (`@devex/portal-ui`)

**Location**: `/Users/mp/Documents/Code/claude-code/projects/devxplatform/packages/portal-ui/`

**Technology Stack**:
- React 18 with TypeScript
- Vite for build tooling
- Radix UI for components
- TanStack Query for data fetching
- Tailwind CSS for styling

### Infrastructure (`@devex/infrastructure`)

**Location**: `/Users/mp/Documents/Code/claude-code/projects/devxplatform/packages/infrastructure/`

**Features**:
- Docker container generation
- Kubernetes manifest generation
- Terraform configuration generation
- CI/CD pipeline templates

## Configuration Files

### Root Configuration

**TypeScript Configuration** (`/Users/mp/Documents/Code/claude-code/projects/devxplatform/tsconfig.json`):
- Strict mode enabled with all strict options
- Modern ES2022 target with NodeNext modules
- Composite project references for workspace packages
- Path mapping for internal packages

**ESLint Configuration** (`/Users/mp/Documents/Code/claude-code/projects/devxplatform/.eslintrc.cjs`):
- TypeScript-first linting with strict rules
- Import order enforcement
- React-specific rules for portal-ui
- Consistent code quality across packages

**Prettier Configuration** (`/Users/mp/Documents/Code/claude-code/projects/devxplatform/.prettierrc`):
- Consistent code formatting
- Semicolons, trailing commas, single quotes
- Print width of 100 characters

### Package Configurations

Each package has its own:
- `package.json` with workspace dependencies
- `tsconfig.json` extending root configuration
- Package-specific scripts and dependencies

## Service Generation Flow

1. **Configuration Validation**: Service config validated against Zod schemas
2. **Template Selection**: Best matching template found based on type/language/framework
3. **Plugin Hooks**: Pre-generation plugins executed
4. **Template Rendering**: Files rendered with context data and helpers
5. **File Generation**: Output files written to target directory
6. **Post-processing**: Package files generated, post-generation plugins executed
7. **Completion**: Success/failure reporting with detailed logging

## Extensibility Points

### Custom Templates
- Templates discoverable from configured directories
- JSON/YAML template definitions
- Conditional file generation
- Custom dependency injection

### Plugin System
- Lifecycle hooks (pre/post generation/validation)
- Custom logic injection
- Configuration extension
- Tool integration

### Helper Functions
- Template helpers for code generation
- String manipulation utilities
- File system operations
- Validation utilities

## Development Guidelines

### Code Quality
- TypeScript strict mode enforced
- Comprehensive error handling
- Extensive JSDoc documentation
- Consistent naming conventions

### Testing Strategy
- Unit tests with Vitest
- Integration tests for CLI commands
- Template generation testing
- E2E testing for portal UI

### Build Process
- TypeScript compilation with project references
- Workspace-aware building
- Parallel package building
- Development mode with watch

## Enterprise Features

### Security
- Input validation at all levels
- Safe template rendering
- Plugin sandboxing considerations
- Audit logging capabilities

### Scalability
- Workspace-based organization
- Plugin architecture for extensions
- Template caching and optimization
- Parallel generation capabilities

### Observability
- Structured logging with Winston
- Progress reporting
- Error tracking and reporting
- Performance metrics collection

## Future Enhancements

### Portal UI Completion
- Web-based service generation interface
- Template management UI
- Configuration editors
- Generation history and monitoring

### Advanced Templates
- Multi-service templates
- Microservice orchestration
- Infrastructure as code integration
- CI/CD pipeline generation

### Enterprise Integration
- SSO authentication
- Role-based access control
- Git integration
- Deployment automation

This architecture provides a solid foundation for enterprise-grade service generation with extensibility, maintainability, and developer experience as core principles.