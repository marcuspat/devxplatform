import pluralize from 'pluralize';

import type { GeneratorUtils } from '../types/index.js';

export function createGeneratorUtils(): GeneratorUtils {
  return {
    toCamelCase(str: string): string {
      return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/[\s-_]+/g, '');
    },

    toPascalCase(str: string): string {
      return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
        .replace(/[\s-_]+/g, '');
    },

    toKebabCase(str: string): string {
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    },

    toSnakeCase(str: string): string {
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    },

    pluralize(str: string): string {
      return pluralize.plural(str);
    },

    singularize(str: string): string {
      return pluralize.singular(str);
    },
  };
}

// Additional utility functions

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function uncapitalize(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function constantCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

export function dotCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1.$2')
    .replace(/[\s_-]+/g, '.')
    .toLowerCase();
}

export function pathCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1/$2')
    .replace(/[\s_-]+/g, '/')
    .toLowerCase();
}

export function sentenceCase(str: string): string {
  const result = str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();
  
  return capitalize(result);
}

export function titleCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

export function isValidIdentifier(str: string): boolean {
  // Check if string is a valid JavaScript/TypeScript identifier
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}

export function sanitizeIdentifier(str: string): string {
  // Convert string to a valid identifier
  let result = str.replace(/[^a-zA-Z0-9_$]/g, '_');
  
  // Ensure it doesn't start with a number
  if (/^[0-9]/.test(result)) {
    result = '_' + result;
  }
  
  return result;
}

export function extractImports(code: string): string[] {
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

export function generateImportStatement(
  imports: string | string[],
  from: string,
  isDefault = false,
): string {
  if (isDefault) {
    return `import ${imports} from '${from}';`;
  }
  
  if (Array.isArray(imports)) {
    return `import { ${imports.join(', ')} } from '${from}';`;
  }
  
  return `import { ${imports} } from '${from}';`;
}

export function sortImports(imports: string[]): string[] {
  return imports.sort((a, b) => {
    // External packages first
    const aIsExternal = !a.startsWith('.') && !a.startsWith('@/');
    const bIsExternal = !b.startsWith('.') && !b.startsWith('@/');
    
    if (aIsExternal && !bIsExternal) return -1;
    if (!aIsExternal && bIsExternal) return 1;
    
    // Then alphabetically
    return a.localeCompare(b);
  });
}