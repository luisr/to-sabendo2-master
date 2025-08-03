import { z } from 'zod';
import { ai } from '../genkit';
import type { Flow } from '@genkit-ai/flow';

// Define o formato de entrada esperado para o flow
const ReplanInputSchema = z.object({
  currentProjectTasks: z.array(z.object({
    name: z.string(),
    start_date: z.string(),
    end_date: z.string(),
  })),
  newPlanCSV: z.string(), // O conteúdo do novo plano em formato CSV
});

// Define o formato de saída estruturado que a IA deve gerar
const SuggestionSchema = z.object({
  taskName: z.string().describe("Nome da tarefa afetada."),
  action: z.enum(["update", "create", "delete", "no_change"]).describe("A ação sugerida pela IA."),
  changes: z.object({
    old_start_date: z.string().optional().describe("Data de início antiga, se a ação for 'update'."),
    new_start_date: z.string().optional().describe("Nova data de início."),
    old_end_date: z.string().optional().describe("Data de fim antiga, se a ação for 'update'."),
    new_end_date: z.string().optional().describe("Nova data de fim."),
  }).optional().describe("Detalhes das mudanças de data."),
  justification: z.string().describe("Uma breve justificativa para a sugestão."),
});

export const replanAssistantFlow: Flow = ai.defineFlow(
  {
    name: 'replanAssistantFlow',
    inputSchema: ReplanInputSchema,
    outputSchema: z.array(SuggestionSchema),
  },
  async (input) => {
    const { currentProjectTasks, newPlanCSV } = input;
    const model = ai.model('googleai/gemini-1.5-flash');

    const prompt = `
      Você é um assistente de planejamento de projetos especialista. Sua tarefa é analisar um projeto existente e um novo plano, e gerar sugestões de replanejamento.

      **Projeto Atual (em JSON):**
      ${JSON.stringify(currentProjectTasks, null, 2)}

      **Novo Plano (em CSV):**
      ${newPlanCSV}

      **Sua Tarefa:**
      Compare o "Novo Plano" com o "Projeto Atual". Para cada tarefa, determine a ação necessária. As ações podem ser:
      1.  **update**: Se uma tarefa existente no "Projeto Atual" tem datas diferentes no "Novo Plano".
      2.  **create**: Se uma tarefa do "Novo Plano" não existe no "Projeto Atual".
      3.  **delete**: Se uma tarefa do "Projeto Atual" não está presente no "Novo Plano".
      4.  **no_change**: Se uma tarefa existe em ambos os planos com as mesmas datas.

      **Regras Importantes:**
      - A comparação de tarefas deve ser feita pelo nome da tarefa (case-insensitive).
      - Gere uma justificativa curta e clara para cada sugestão.
      - Forneça a saída estritamente no formato JSON especificado.

      Analise cuidadosamente e gere a lista de sugestões.
    `;

    const llmResponse = await model.generate({
      prompt: prompt,
      output: {
        schema: z.array(SuggestionSchema),
      },
    });

    return llmResponse.output() || [];
  }
);
