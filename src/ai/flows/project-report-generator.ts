'use server';

/**
 * @fileOverview An AI tool to generate comprehensive project reports.
 *
 * - generateProjectReport - A function that handles the report generation process.
 * - GenerateProjectReportInput - The input type for the generateProjectReport function.
 * - GenerateProjectReportOutput - The return type for the generateProjectReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProjectReportInputSchema = z.object({
  projectName: z.string().describe('The name of the project or "Visão Consolidada" for a consolidated view.'),
  kpis: z.string().describe('Key Performance Indicators (KPIs) for the project(s), in JSON format.'),
  taskHistory: z.string().describe('A summary of the task history and current status.'),
  overviewChartData: z.string().describe('Data for the overview chart, showing completed vs. pending tasks over time, in JSON format.'),
});
export type GenerateProjectReportInput = z.infer<typeof GenerateProjectReportInputSchema>;

const GenerateProjectReportOutputSchema = z.object({
  reportTitle: z.string().describe("The main title for the report."),
  executiveSummary: z.string().describe("A high-level executive summary of the project's status."),
  kpiAnalysis: z.string().describe("A detailed analysis of the provided KPIs."),
  taskAnalysis: z.string().describe("An analysis of the task history, progress, and current status."),
  chartInsight: z.string().describe("An insight or interpretation derived from the overview chart data."),
  recommendations: z.string().describe("Actionable recommendations for the project manager based on the overall analysis."),
});
export type GenerateProjectReportOutput = z.infer<typeof GenerateProjectReportOutputSchema>;

export async function generateProjectReport(input: GenerateProjectReportInput): Promise<GenerateProjectReportOutput> {
  return generateProjectReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProjectReportPrompt',
  input: {schema: GenerateProjectReportInputSchema},
  output: {schema: GenerateProjectReportOutputSchema},
  prompt: `Você é um analista de projetos de IA de classe mundial. Sua tarefa é gerar um relatório de projeto abrangente e bem formatado para um gerente de projetos.
  
  **IMPORTANTE: Todas as respostas devem ser exclusivamente em português do Brasil.** Use formatação com negrito e listas para tornar a leitura mais clara.

  O relatório é para: {{{projectName}}}.

  Analise os seguintes dados:
  - KPIs: {{{kpis}}}
  - Histórico e Status das Tarefas: {{{taskHistory}}}
  - Dados do Gráfico (Concluídas vs. Pendentes): {{{overviewChartData}}}

  Com base em sua análise, gere as seguintes seções para o relatório:
  1.  **Sumário Executivo**: Uma visão geral breve e de alto nível sobre a saúde do projeto e os principais pontos.
  2.  **Análise de KPIs**: Interprete os KPIs fornecidos. O que eles dizem sobre o desempenho do projeto em relação a orçamento, cronograma, risco e taxa de conclusão?
  3.  **Análise de Tarefas**: Comente sobre o andamento das tarefas. Existem gargalos ou áreas de preocupação?
  4.  **Insight do Gráfico**: Qual é a principal história que o gráfico de visão geral das tarefas está contando? O projeto está acelerando ou o backlog está crescendo?
  5.  **Recomendações**: Forneça recomendações claras e acionáveis para o gerente de projeto.

  Estruture sua saída de acordo com o esquema definido. Seja profissional, perspicaz e conciso.`,
});

const generateProjectReportFlow = ai.defineFlow(
  {
    name: 'generateProjectReportFlow',
    inputSchema: GenerateProjectReportInputSchema,
    outputSchema: GenerateProjectReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
