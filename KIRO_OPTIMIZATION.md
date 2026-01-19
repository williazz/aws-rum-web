# Kiro CLI Optimization Summary

This document explains the Kiro CLI optimizations added to the aws-rum-web repository.

## What Was Added

### 1. Context Steering Files (`.kiro/context/`)

These files provide Kiro with deep knowledge about the codebase:

-   **architecture.md** - System design, core components, build outputs, key patterns
-   **workflows.md** - Development commands, testing strategies, common issues
-   **conventions.md** - TypeScript style, plugin patterns, testing conventions, file naming
-   **quick-reference.md** - Project structure, entry points, configuration, dependencies
-   **plugin-system.md** - Deep dive into the plugin architecture and monkey patching

**Benefit**: Kiro automatically understands the codebase structure and can provide contextually relevant suggestions without you explaining the architecture every time.

### 2. Prompt Templates (`.kiro/prompts/`)

Reusable templates for common development tasks:

-   **add-event-type.md** - Step-by-step guide for adding new telemetry events
-   **debug-test.md** - Structured approach to debugging test failures
-   **modify-config.md** - Template for adding/modifying configuration options
-   **optimize-performance.md** - Framework for performance optimization tasks

**Benefit**: Load a template with `/load .kiro/prompts/[template].md` to get structured guidance for complex tasks.

### 3. Documentation (`.kiro/README.md`)

Comprehensive guide on using Kiro with this repository, including:

-   Directory structure explanation
-   Usage examples
-   Customization tips
-   Best practices

### 4. Git Configuration

Updated `.gitignore` to:

-   ✅ Commit context files and prompts (shared knowledge)
-   ❌ Ignore machine-specific settings (LSP config)
-   ❌ Ignore Kiro temporary files

## How to Use

### Basic Usage

Just start chatting - Kiro will automatically reference context files:

```bash
kiro-cli chat
> "How do I add a new event type for tracking form submissions?"
```

### Using Templates

Load a template for structured guidance:

```bash
kiro-cli chat
> "/load .kiro/prompts/add-event-type.md"
# Fill in the placeholders
```

### Enable Code Intelligence

Initialize LSP for semantic code navigation:

```bash
kiro-cli chat
> "/code init"
# Select TypeScript
```

Now Kiro can:

-   Find symbol definitions across files
-   Navigate to implementations
-   Find all references to a function/class
-   Understand code relationships

### Example Workflows

**Adding a new plugin:**

```bash
> "/load .kiro/prompts/add-event-type.md"
> Event name: FormSubmission
> Event type: interaction
> Data to capture: form ID, field count, validation errors
```

**Debugging a test:**

```bash
> "/load .kiro/prompts/debug-test.md"
> Test file: src/plugins/event-plugins/__tests__/WebVitalsPlugin.test.ts
> Error: TypeError: Cannot read property 'observe' of undefined
```

**Understanding architecture:**

```bash
> "Explain how the dispatch system batches events"
# Kiro references architecture.md and dispatch/ code
```

## Benefits

1. **Faster Onboarding** - New contributors get instant context about the codebase
2. **Consistent Patterns** - Templates ensure new code follows existing conventions
3. **Reduced Repetition** - No need to explain architecture in every conversation
4. **Better Suggestions** - Kiro understands project-specific patterns and constraints
5. **Structured Workflows** - Templates guide you through complex multi-step tasks

## Customization

### Add New Context Files

Create focused context files for specific domains:

```bash
# Example: Add context about the session management system
touch .kiro/context/session-management.md
```

### Create New Templates

Add templates for repetitive tasks:

```bash
# Example: Template for adding new configuration options
touch .kiro/prompts/add-config-option.md
```

### Update Existing Context

Keep context files up-to-date as the architecture evolves:

```bash
# Edit context files as needed
vim .kiro/context/architecture.md
```

## Tips for Maximum Effectiveness

1. **Reference Context**: Mention relevant context files in your questions
    - "Based on the plugin system, how should I..."
2. **Use Templates**: Load templates for structured tasks

    - `/load .kiro/prompts/add-event-type.md`

3. **Enable LSP**: Initialize code intelligence for semantic understanding

    - `/code init` in project root

4. **Be Specific**: Include file paths and function names

    - "In src/dispatch/Dispatch.ts, the batchEvents function..."

5. **Iterate**: Break complex tasks into smaller steps
    - "First, let's create the JSON schema. Then we'll..."

## Maintenance

### When to Update Context Files

-   **Architecture changes**: Update `architecture.md` when core components change
-   **New patterns**: Add to `conventions.md` when establishing new coding patterns
-   **Workflow changes**: Update `workflows.md` when build/test processes change
-   **New common tasks**: Create new prompt templates for repetitive workflows

### Keeping Context Lean

-   Keep each context file under 500 lines
-   Focus on high-level patterns, not implementation details
-   Use code examples sparingly - let Kiro read the actual code
-   Remove outdated information promptly

## Next Steps

1. Try asking Kiro about the codebase architecture
2. Load a prompt template and walk through a task
3. Initialize LSP with `/code init` for code navigation
4. Create custom context files for your specific needs
5. Share improvements with the team

## Questions?

-   See `.kiro/README.md` for detailed usage instructions
-   Check [Kiro CLI docs](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line.html)
-   Review existing context files for examples
