import type { FlexBubble } from "./types.js";

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateFlexMenu(value: FlexBubble): ValidationResult {
  const errors: string[] = [];
  if (value.type !== "bubble") errors.push("root.type must be bubble");
  if (value.size !== "mega") errors.push("root.size must be mega");
  if (value.footer.contents.length !== 6)
    errors.push("footer must contain six buttons");

  const postbackData = new Set<string>();
  for (const [index, component] of value.footer.contents.entries()) {
    if (component.type !== "button") {
      errors.push(`footer.contents[${index}] must be a button`);
      continue;
    }
    if (!component.action.label.trim())
      errors.push(`button ${index} has no label`);
    if (!component.action.data.startsWith("action=")) {
      errors.push(`button ${index} has invalid postback data`);
    }
    if (postbackData.has(component.action.data)) {
      errors.push(`button ${index} duplicates postback data`);
    }
    postbackData.add(component.action.data);
  }
  return { valid: errors.length === 0, errors };
}
