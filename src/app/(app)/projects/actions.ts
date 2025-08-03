
'use server';

import { run } from 'genkit';
import { replanAssistantFlow } from '@/ai/flows/replan-assistant';
import { Project, Task } from '@/lib/types';

interface Suggestion {
    taskName: string;
    action: 'create' | 'update' | 'delete';
    justification: string;
    changes?: any;
    approved: boolean;
}

export async function getReplanSuggestions(
  project: Project,
  tasks: Task[],
  baseline: string
): Promise<Suggestion[]> {
  try {
    const result = await run(replanAssistantFlow, {
      project,
      tasks,
      baseline,
    });
    return result.map((s) => ({ ...s, approved: true }));
  } catch (error) {
    console.error(error);
    // You might want to throw a more specific error or return an empty array
    throw new Error('Failed to get replan suggestions.');
  }
}
