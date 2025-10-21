#!/usr/bin/env node

/**
 * Selective Zod Schema Generator for TMDB API - TypeScript Version
 *
 * Uses TypeScript Compiler API for robust parsing instead of fragile regex.
 * Generates Zod schemas ONLY for endpoints that need them.
 *
 * This script:
 * 1. Parses TypeScript definitions using TypeScript Compiler API
 * 2. Extracts only the operations needed for AI tools
 * 3. Converts TypeScript types to Zod schemas accurately
 * 4. Applies OpenAI compatibility fixes inline
 */

import * as ts from "typescript";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the endpoints config to know which ones need Zod schemas
import { endpoints } from "./endpoints-config.js";

// Paths
const outputPath = path.join(__dirname, "../../src/_generated/tmdb-zod.ts");
const tmdbTypesPath = path.join(__dirname, "../../src/_generated/tmdbV3.d.ts");

// Extract operations that need Zod schemas from config
const REQUIRED_OPERATIONS = endpoints
  .filter((endpoint) => endpoint.needsZodSchema)
  .map((endpoint) => {
    // Convert path to operation name (matches OpenAPI spec)
    // Examples:
    // /3/genre/movie/list -> genre-movie-list
    // /3/search/movie -> search-movie
    // /3/discover/movie -> discover-movie
    const path = endpoint.path.replace(/^\/3\//, "").replace(/\{[^}]+\}/g, "");
    return path.replace(/\//g, "-"); // Replace ALL slashes with dashes
  })
  .sort();

/**
 * TypeScript to Zod schema converter using Compiler API
 */
interface OperationSchema {
  exportName: string;
  schema: string;
}

/**
 * Converts TypeScript Type to Zod schema string
 */
function convertTypeToZod(type: ts.Type, typeChecker: ts.TypeChecker): string {
  // Handle string literals and primitive types
  if (type.flags & ts.TypeFlags.StringLiteral) {
    const value = (type as ts.StringLiteralType).value;
    return `z.literal("${value}")`;
  }

  if (type.flags & ts.TypeFlags.String) {
    return "z.string()";
  }

  if (
    type.flags & ts.TypeFlags.Number ||
    type.flags & ts.TypeFlags.NumberLiteral
  ) {
    return "z.number()";
  }

  if (
    type.flags & ts.TypeFlags.Boolean ||
    type.flags & ts.TypeFlags.BooleanLiteral
  ) {
    return "z.boolean()";
  }

  if (type.flags & ts.TypeFlags.Never) {
    return "z.never()";
  }

  if (type.flags & ts.TypeFlags.Unknown || type.flags & ts.TypeFlags.Any) {
    return "z.unknown()";
  }

  // Handle union types
  if (type.flags & ts.TypeFlags.Union) {
    const unionType = type as ts.UnionType;
    const unionSchemas = unionType.types.map((t) =>
      convertTypeToZod(t, typeChecker),
    );
    const uniqueSchemas = [...new Set(unionSchemas)];

    if (uniqueSchemas.length === 1) {
      return uniqueSchemas[0];
    }

    return `z.union([${uniqueSchemas.join(", ")}])`;
  }

  // Handle arrays - check symbol name first, then use isArrayType
  if (type.symbol && type.symbol.name === "Array") {
    const typeReference = type as ts.TypeReference;
    if (typeReference.typeArguments && typeReference.typeArguments.length > 0) {
      const elementType = typeReference.typeArguments[0];
      const elementSchema = convertTypeToZod(elementType, typeChecker);
      return `z.array(${elementSchema})`;
    }
    return "z.array(z.unknown())";
  }

  // Handle arrays using TypeChecker method
  if (typeChecker.isArrayType && typeChecker.isArrayType(type)) {
    // For newer TypeScript versions, use getTypeArguments
    const typeReference = type as ts.TypeReference;
    if (typeReference.typeArguments && typeReference.typeArguments.length > 0) {
      const elementType = typeReference.typeArguments[0];
      const elementSchema = convertTypeToZod(elementType, typeChecker);
      return `z.array(${elementSchema})`;
    }
    return "z.array(z.unknown())";
  }

  // Handle object types
  if (type.flags & ts.TypeFlags.Object) {
    const objectType = type as ts.ObjectType;

    // Check if it's an index signature type like [name: string]: unknown
    const indexInfos = typeChecker.getIndexInfosOfType(objectType);
    if (indexInfos.length > 0) {
      const indexInfo = indexInfos[0];
      const valueType = convertTypeToZod(indexInfo.type, typeChecker);
      return `z.record(${valueType})`;
    }

    // Handle regular object properties
    const properties = typeChecker.getPropertiesOfType(objectType);
    if (properties.length > 0) {
      const propertySchemas: string[] = [];

      for (const prop of properties) {
        const propType = typeChecker.getTypeOfSymbolAtLocation(
          prop,
          prop.declarations![0],
        );
        const propName = prop.name;
        const isPropOptional = (prop.flags & ts.SymbolFlags.Optional) !== 0;

        let propSchema = convertTypeToZod(propType, typeChecker);
        if (isPropOptional) {
          propSchema += ".nullable().optional()";
        }

        propertySchemas.push(`        "${propName}": ${propSchema}`);
      }

      if (propertySchemas.length > 0) {
        return `z.object({\n${propertySchemas.join(",\n")}\n      })`;
      }
    }
  }

  // Fallback for unknown types
  console.warn(`   ⚠️  Unknown type flags: ${type.flags}, using z.unknown()`);
  return "z.unknown()";
}

/**
 * Finds the operations interface in the TypeScript AST
 */
function findOperationsInterface(
  sourceFile: ts.SourceFile,
): ts.InterfaceDeclaration | null {
  let operationsInterface: ts.InterfaceDeclaration | null = null;

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === "operations") {
      operationsInterface = node;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return operationsInterface;
}

/**
 * Extracts operation type from the operations interface
 */
function extractOperationType(
  operationsInterface: ts.InterfaceDeclaration,
  operationName: string,
  typeChecker: ts.TypeChecker,
): ts.Type | null {
  for (const member of operationsInterface.members) {
    if (ts.isPropertySignature(member) && member.name) {
      // Handle both identifier and string literal property names
      let memberName = "";
      if (ts.isIdentifier(member.name)) {
        memberName = member.name.text;
      } else if (ts.isStringLiteral(member.name)) {
        memberName = member.name.text;
      }

      if (memberName === operationName) {
        return typeChecker.getTypeAtLocation(member);
      }
    }
  }

  return null;
}

/**
 * Parses operation from TypeScript using Compiler API (for file-based generation)
 */
function parseOperationFromTs(
  program: ts.Program,
  operationName: string,
): OperationSchema | null {
  console.log(`   🔍 Parsing operation: ${operationName}`);

  const result = parseOperationFromTsProgram(program, operationName);

  if (!result) {
    console.warn(`   ⚠️  Failed to parse operation ${operationName}`);
  }

  return result;
}

/**
 * Generates the complete Zod schema file
 */
function generateSelectiveZodFile() {
  console.log(
    "🔄 Generating selective Zod schemas with TypeScript Compiler API...",
  );
  console.log(`   Target operations: ${REQUIRED_OPERATIONS.join(", ")}`);

  // Check if TypeScript definitions exist
  if (!fs.existsSync(tmdbTypesPath)) {
    console.error(`❌ TypeScript definitions not found at: ${tmdbTypesPath}`);
    console.error(
      "   Run 'pnpm codegen:openapi' first to generate TypeScript definitions",
    );
    process.exit(1);
  }

  // Create TypeScript program
  const program = ts.createProgram([tmdbTypesPath], {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.CommonJS,
    allowJs: true,
    skipLibCheck: true,
    noEmit: true,
  });

  console.log("✅ Created TypeScript program for AST parsing");

  let separateSchemas = "";
  let operationsZodEntries = "";
  let generatedCount = 0;

  for (const operation of REQUIRED_OPERATIONS) {
    const schemaData = parseOperationFromTs(program, operation);

    if (schemaData) {
      console.log(`   ✅ Generated schema for: ${operation}`);

      // Create individual export for tree-shaking
      separateSchemas += `// ${operation} schema for direct import (tree-shakable)\n`;
      separateSchemas += `export const ${schemaData.exportName} = ${schemaData.schema};\n\n`;

      // Create entry for backward compatibility object
      operationsZodEntries += `  "${operation}": ${schemaData.exportName},\n`;

      generatedCount++;
    } else {
      console.warn(`   ⚠️  Failed to generate schema for: ${operation}`);
    }
  }

  if (generatedCount === 0) {
    console.error("❌ No operations were successfully processed");
    process.exit(1);
  }

  // Generate the complete file content
  const fileContent = `// Generated by generate-selective-zod.ts
// AST-BASED SCHEMA GENERATION - Uses TypeScript Compiler API for robust parsing
// Only includes Zod schemas for operations marked with needsZodSchema: true
//
// EXTENSIBLE: Add new operations by marking them with needsZodSchema: true in endpoints-config.js
// PERFORMANCE OPTIMIZED:
// - Individual exports for optimal tree-shaking 
// - Backward compatible operationsSchema object
// - AST parsing replaces fragile regex approach
import { z } from "zod";

${separateSchemas}// Backward compatibility object (prefer individual imports above for better tree-shaking)
export const operationsSchema = z.object({
${operationsZodEntries}});
`;

  console.log("🔄 Writing optimized Zod schema file...");
  fs.writeFileSync(outputPath, fileContent);

  const stats = fs.statSync(outputPath);
  const lineCount = fileContent.split("\n").length;

  console.log("✅ Selective Zod schema generation completed!");
  console.log(
    `   📄 Generated ${generatedCount}/${REQUIRED_OPERATIONS.length} operation schemas`,
  );
  console.log(`   📦 File size: ${(stats.size / 1024).toFixed(1)}KB`);
  console.log(`   📝 Line count: ${lineCount} lines`);
  console.log(`   💾 Saved to: ${outputPath}`);
}

/**
 * Generates schemas from TypeScript source string (for testing)
 */
export function generateSchemasFromSource(
  typeScriptSource: string,
  requiredOperations: string[],
): {
  individualSchemas: Map<string, { exportName: string; schema: string }>;
  fileContent: string;
} {
  // Create a virtual TypeScript program from the source string
  const sourceFile = ts.createSourceFile(
    "test.d.ts",
    typeScriptSource,
    ts.ScriptTarget.Latest,
    true,
  );

  const program = ts.createProgram(
    ["test.d.ts"],
    {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.CommonJS,
      allowJs: true,
      skipLibCheck: true,
      noEmit: true,
    },
    {
      getSourceFile: (fileName) =>
        fileName === "test.d.ts" ? sourceFile : undefined,
      writeFile: () => {},
      getCurrentDirectory: () => "",
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => "",
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
      getDefaultLibFileName: () => "lib.d.ts",
    },
  );

  const individualSchemas = new Map<
    string,
    { exportName: string; schema: string }
  >();
  let separateSchemas = "";
  let operationsZodEntries = "";

  for (const operation of requiredOperations) {
    const schemaData = parseOperationFromTsProgram(program, operation);

    if (schemaData) {
      // Store individual schema
      individualSchemas.set(operation, schemaData);

      // Create individual export for tree-shaking
      separateSchemas += `// ${operation} schema for direct import (tree-shakable)\n`;
      separateSchemas += `export const ${schemaData.exportName} = ${schemaData.schema};\n\n`;

      // Create entry for backward compatibility object
      operationsZodEntries += `  "${operation}": ${schemaData.exportName},\n`;
    }
  }

  // Generate the complete file content
  const fileContent = `// Generated by generate-selective-zod.ts
// AST-BASED SCHEMA GENERATION - Uses TypeScript Compiler API for robust parsing
// Only includes Zod schemas for operations marked with needsZodSchema: true
//
// EXTENSIBLE: Add new operations by marking them with needsZodSchema: true in endpoints-config.js
// PERFORMANCE OPTIMIZED:
// - Individual exports for optimal tree-shaking 
// - Backward compatible operationsSchema object
// - AST parsing replaces fragile regex approach
import { z } from "zod";

${separateSchemas}// Backward compatibility object (prefer individual imports above for better tree-shaking)
export const operationsSchema = z.object({
${operationsZodEntries}});
`;

  return { individualSchemas, fileContent };
}

/**
 * Parses operation from a TypeScript program (extracted for reuse)
 */
function parseOperationFromTsProgram(
  program: ts.Program,
  operationName: string,
): OperationSchema | null {
  const sourceFile = program
    .getSourceFiles()
    .find(
      (sf) =>
        !sf.fileName.includes("node_modules") &&
        !sf.fileName.includes("lib.d.ts"),
    );

  if (!sourceFile) {
    return null;
  }

  const typeChecker = program.getTypeChecker();

  // Find the operations interface
  const operationsInterface = findOperationsInterface(sourceFile);
  if (!operationsInterface) {
    return null;
  }

  // Extract the specific operation type
  const operationType = extractOperationType(
    operationsInterface,
    operationName,
    typeChecker,
  );
  if (!operationType) {
    return null;
  }

  // Navigate to parameters.query
  const operationSymbol = operationType.symbol;
  if (!operationSymbol) {
    return null;
  }

  // Get parameters property
  const parametersProperty = operationSymbol.members?.get(
    "parameters" as ts.__String,
  );
  if (!parametersProperty) {
    return null;
  }

  const parametersType = typeChecker.getTypeOfSymbolAtLocation(
    parametersProperty,
    parametersProperty.declarations![0],
  );

  // Get query property from parameters
  const parametersSymbol = parametersType.symbol;
  if (!parametersSymbol) {
    return null;
  }

  const queryProperty = parametersSymbol.members?.get("query" as ts.__String);
  if (!queryProperty) {
    return null;
  }

  const queryType = typeChecker.getTypeOfSymbolAtLocation(
    queryProperty,
    queryProperty.declarations![0],
  );

  // Check if query is optional
  const isQueryOptional = (queryProperty.flags & ts.SymbolFlags.Optional) !== 0;

  // Convert query type to Zod
  let querySchema = convertTypeToZod(queryType, typeChecker);

  // Handle never type (means no query parameters)
  if (queryType.flags & ts.TypeFlags.Never) {
    querySchema = "z.never().nullable().optional()";
  } else if (isQueryOptional) {
    querySchema += ".nullable().optional()";
  }

  // Generate export name
  const exportName =
    operationName
      .split("-")
      .map((word, index) =>
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join("") + "Schema";

  // Generate the complete schema
  const schema = `z.object({
  parameters: z.object({
    query: ${querySchema},
    header: z.never().nullable().optional(),
    path: z.never().nullable().optional(),
    cookie: z.never().nullable().optional(),
  }),
  requestBody: z.never().nullable().optional(),
  responses: z.object({
    200: z.object({
      headers: z.record(z.unknown()),
      content: z.object({
        "application/json": z.unknown(),
      }),
    }),
  }),
})`;

  return { exportName, schema };
}

/**
 * Main execution (when run as CLI)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    generateSelectiveZodFile();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("❌ Failed to generate selective Zod schemas:", errorMessage);
    if (errorStack) {
      console.error(errorStack);
    }
    process.exit(1);
  }
}
