# Button Styling Guidelines

This document outlines the standardized button styling approach to be used across the YGO Player application for visual consistency.

## Button Classes

Use these classes for all buttons throughout the application:

### Primary Button Class Structure

```html
<button class="btn btn-primary">Primary Action</button>
```

### Available Button Variants

1. **Primary** - Main actions, most prominent

   ```html
   <button class="btn btn-primary">Primary Action</button>
   ```

2. **Secondary** - Alternative or secondary actions

   ```html
   <button class="btn btn-secondary">Secondary Action</button>
   ```

3. **Tertiary** - Subtle actions, often used for cancel/back

   ```html
   <button class="btn btn-tertiary">Tertiary Action</button>
   ```

4. **Danger** - Destructive actions (delete, remove)

   ```html
   <button class="btn btn-danger">Delete</button>
   ```

5. **Success** - Positive actions (save, apply)

   ```html
   <button class="btn btn-success">Save</button>
   ```

6. **Warning** - Cautionary actions
   ```html
   <button class="btn btn-warning">Caution</button>
   ```

### Button Sizes

```html
<button class="btn btn-primary btn-sm">Small Button</button>
<button class="btn btn-primary">Default Size Button</button>
<button class="btn btn-primary btn-lg">Large Button</button>
```

### Additional Modifiers

- Full width: `btn-full-width`
- With icon: `btn-icon`
- Icon-only button: `btn-icon-only`

## React Component Usage

When using React components, prefer the Button component:

```jsx
import { Button } from "../UI";

// Example usages:
<Button variant="primary" size="md">Primary Action</Button>
<Button variant="secondary" size="sm">Secondary Action</Button>
<Button variant="tertiary" size="lg" fullWidth>Tertiary Full Width</Button>
<Button variant="danger">Delete Item</Button>
```

## YGO-Specific Components (Legacy Support)

For YGO-specific components, use the YGO-prefixed classes that mirror our standard classes:

```html
<button class="ygo-btn ygo-btn-primary">YGO Action</button>
<button class="ygo-btn ygo-btn-secondary">Secondary Action</button>
<button class="ygo-btn ygo-btn-action">Game Action</button>
```

## Special Menu Item Buttons

For card action menus and similar contexts, use:

```html
<button class="ygo-card-item">Menu Action</button>
```

## Consistency Notes

- All buttons should have appropriate hover, active, and disabled states
- Maintain proper padding and spacing based on button size
- Use text that clearly indicates the action
- Include icons when they help clarify the action
- For specialized button types not covered here, consult with the design team

## Migration Plan

1. Update all new components to use the standard Button component or button classes
2. Gradually refactor legacy components to use the new button system
3. Ensure all new buttons follow these guidelines
