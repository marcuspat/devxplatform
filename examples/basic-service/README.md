# Basic Service Example

This example demonstrates how to use the DevEX platform to generate a basic service.

## Usage

1. Install the CLI:
   ```bash
   npm install -g @devex/cli
   ```

2. Generate a service:
   ```bash
   devex generate my-api --type api --language typescript --framework express
   ```

3. Or use interactive mode:
   ```bash
   devex generate --interactive
   ```

## Configuration

The `devex.config.json` file configures the platform for this project:

- Templates are loaded from `./templates`
- Generated services are placed in `./generated`
- All core generators are enabled

## Generated Structure

A typical generated service will include:

```
generated/
├── src/
│   ├── index.ts
│   ├── routes/
│   ├── middleware/
│   └── types/
├── tests/
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```