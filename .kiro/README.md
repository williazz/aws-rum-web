# Kiro CLI Configuration

This directory contains configuration and context files for the Kiro CLI to provide better AI assistance when working on the CloudWatch RUM web client.

## Directory Structure

### `/context/` - Context Steering Files

These files are automatically included in Kiro's context to help it understand the codebase:

-   **architecture.md** - High-level architecture overview, core components, and design patterns
-   **workflows.md** - Common development workflows, build commands, and testing strategies
-   **conventions.md** - Coding standards, naming conventions, and best practices
-   **quick-reference.md** - Quick lookup for project structure and key files

### `/prompts/` - Prompt Templates

Reusable prompt templates for common tasks:

-   **add-event-type.md** - Template for adding new event types
-   **debug-test.md** - Template for debugging test failures
-   **modify-config.md** - Template for configuration changes
-   **optimize-performance.md** - Template for performance optimization

### `/settings/` - Kiro Settings

-   **lsp.json** - Language Server Protocol configuration (created by `/code init`)

## Usage

### Context Steering

Context files are automatically loaded by Kiro. To use them effectively:

```bash
# Kiro will automatically reference context files when relevant
kiro-cli chat
> "How do I add a new event type?"
# Kiro will use architecture.md and workflows.md to guide you
```

### Using Prompt Templates

Load a template to start a structured conversation:

```bash
kiro-cli chat
> "/load .kiro/prompts/add-event-type.md"
# Fill in the template placeholders and Kiro will guide you through the process
```

### Code Intelligence

Initialize LSP for semantic code understanding:

```bash
cd /Users/billyzh/Documents/aws-rum-web
kiro-cli chat
> "/code init"
# Select TypeScript language server
# Now Kiro can navigate code semantically
```

## Customization

### Adding New Context Files

Create new `.md` files in `/context/` for domain-specific knowledge:

-   Keep files focused and concise (< 500 lines)
-   Use clear headings and structure
-   Include code examples where helpful

### Creating New Prompts

Add new templates in `/prompts/` for repetitive tasks:

-   Use placeholders in [BRACKETS]
-   Include step-by-step guidance
-   Reference relevant context files

### Ignoring Files

The `.gitignore` is configured to:

-   ✅ Commit: `/context/`, `/prompts/`, and this README
-   ❌ Ignore: `/settings/lsp.json` (machine-specific)
-   ❌ Ignore: Kiro conversation history and temp files

## Tips for Better AI Assistance

1. **Be Specific**: Reference file paths and function names
2. **Use Context**: Mention which context file is relevant
3. **Load Prompts**: Use templates for structured tasks
4. **Enable LSP**: Run `/code init` for semantic code navigation
5. **Iterate**: Break complex tasks into smaller steps

## Resources

-   [Kiro CLI Documentation](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line.html)
-   [CloudWatch RUM Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html)
-   [Project README](../README.md)
