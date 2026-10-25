import { optionLabel, type NameOf, type PromptData } from "./assist-prompt";

/**
 * The socket server's text for each option (optionLabels[i] for options[i],
 * resolved from cards.cdb / strings.conf; null = unknown). Older servers
 * don't send it.
 */
export type LabelledPrompt = PromptData & { optionLabels?: Array<string | null> };

/** The option's own text ("Set it to your field") when the server sent it, else "Option 2 · Card (effect 5)". */
export function promptOptionLabel(prompt: PromptData, desc: string, index: number, nameOf: NameOf): string {
  const label = (prompt as LabelledPrompt).optionLabels?.[index];
  return label?.trim() ? label : optionLabel(desc, index, nameOf);
}
