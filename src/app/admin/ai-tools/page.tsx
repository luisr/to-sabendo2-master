
import PageHeader from "@/components/shared/page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import ProjectCreationAssistant from "@/components/ai/project-creation-assistant";
import RiskPredictionTool from "@/components/ai/risk-prediction-tool";
import DelayPredictionTool from "@/components/ai/delay-prediction-tool";
import ProjectReportGenerator from "@/components/ai/project-report-generator";

export default function AiToolsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Assistente de IA (Admin)" />
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">Criação de Projeto</TabsTrigger>
          <TabsTrigger value="risk">Previsão de Risco</TabsTrigger>
          <TabsTrigger value="delay">Previsão de Atraso</TabsTrigger>
          <TabsTrigger value="report">Relatório de Projeto</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <ProjectCreationAssistant />
        </TabsContent>
        <TabsContent value="risk">
          <RiskPredictionTool />
        </TabsContent>
        <TabsContent value="delay">
          <DelayPredictionTool />
        </TabsContent>
        <TabsContent value="report">
          <ProjectReportGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
