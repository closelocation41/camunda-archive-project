import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface CamundaVariable {
  value: unknown;
  type?: string;
  valueInfo?: Record<string, unknown>;
}

@Injectable()
export class CamundaApiService implements OnModuleInit {
  private readonly logger = new Logger(CamundaApiService.name);
  private readonly baseUrl: string;
  private readonly workflowDefinitions = [
    {
      key: 'completed_task_move_to_archive',
      fileName: 'completed_task_move_to_archive.bpmn',
      name: 'Completed Task Move To Archive',
    },
    {
      key: 'archived_task_move_to_complete',
      fileName: 'archived_task_move_to_complete.bpmn',
      name: 'Archived Task Move To Complete',
    },
  ];

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('CAMUNDA_BASE_URL').replace(/\/$/, '');
  }

  async onModuleInit() {
    void this.ensureWorkflowDefinitionsWithRetry();
  }

  async getProcessInstance(id: string) {
    return this.get(`/process-instance/${id}`);
  }

  async getHistoricProcessInstances(params: Record<string, unknown>) {
    return this.get('/history/process-instance', params);
  }

  async getHistoricActivities(processInstanceId: string) {
    return this.get('/history/activity-instance', { processInstanceId, sortBy: 'startTime', sortOrder: 'asc' });
  }

  async getHistoricVariables(processInstanceId: string) {
    return this.get('/history/variable-instance', { processInstanceId });
  }

  async getIncidents(params: Record<string, unknown>) {
    return this.get('/incident', params);
  }

  async getBpmnXml(processDefinitionId: string) {
    return this.get(`/process-definition/${encodeURIComponent(processDefinitionId)}/xml`);
  }

  async deployWorkflowDefinitionsIfMissing() {
    let failures = 0;
    for (const workflow of this.workflowDefinitions) {
      try {
        const deployed = await this.processDefinitionExists(workflow.key);
        if (deployed) {
          this.logger.log(`${workflow.fileName} already deployed in Camunda`);
          continue;
        }

        await this.deployBpmn(workflow.fileName, workflow.name);
        this.logger.log(`${workflow.fileName} deployed to Camunda`);
      } catch (error) {
        failures += 1;
        const message = error instanceof Error ? error.message : 'Unknown Camunda deployment failure';
        this.logger.warn(`Unable to ensure ${workflow.fileName}: ${message}`);
      }
    }
    return { failures };
  }

  async startProcess(processDefinitionKey: string, variables: Record<string, CamundaVariable>, businessKey?: string) {
    return this.post(`/process-definition/key/${encodeURIComponent(processDefinitionKey)}/start`, {
      businessKey,
      variables,
    });
  }

  async modifyProcessInstance(processInstanceId: string, instructions: Array<Record<string, unknown>>, annotation: string) {
    return this.post(`/process-instance/${encodeURIComponent(processInstanceId)}/modification`, {
      skipCustomListeners: false,
      skipIoMappings: false,
      annotation,
      instructions,
    });
  }

  async addTaskComment(taskId: string, processInstanceId: string, message: string) {
    return this.post(`/task/${encodeURIComponent(taskId)}/comment/create`, { processInstanceId, message });
  }

  private async get(path: string, params?: Record<string, unknown>): Promise<any> {
    const response = await this.awaitHttp(this.http.get(`${this.baseUrl}${path}`, { params, auth: this.auth() }));
    return response.data;
  }

  private async post(path: string, body: unknown): Promise<any> {
    this.logger.debug(`POST ${path}`);
    const response = await this.awaitHttp(this.http.post(`${this.baseUrl}${path}`, body, { auth: this.auth() }));
    return response.data;
  }

  private async processDefinitionExists(key: string) {
    try {
      await this.get(`/process-definition/key/${encodeURIComponent(key)}`);
      return true;
    } catch (error) {
      if (this.httpStatus(error) === 404) {
        return false;
      }
      throw error;
    }
  }

  private async deployBpmn(fileName: string, deploymentName: string) {
    const filePath = this.resolveBpmnPath(fileName);
    const xml = readFileSync(filePath, 'utf8');
    const form = new FormData();
    form.append('deployment-name', deploymentName);
    form.append('enable-duplicate-filtering', 'true');
    form.append('deploy-changed-only', 'true');
    form.append(fileName, new Blob([xml], { type: 'text/xml' }), fileName);

    const response = await this.awaitHttp(
      this.http.post(`${this.baseUrl}/deployment/create`, form, {
        auth: this.auth(),
      }),
    );
    return response.data;
  }

  private resolveBpmnPath(fileName: string) {
    const candidates = [
      join(__dirname, '../../assets/bpmn', fileName),
      join(process.cwd(), 'dist/assets/bpmn', fileName),
      join(process.cwd(), 'src/assets/bpmn', fileName),
    ];
    const found = candidates.find((candidate) => existsSync(candidate));
    if (!found) {
      throw new Error(`BPMN file not found: ${fileName}`);
    }
    return found;
  }

  private httpStatus(error: unknown) {
    return typeof error === 'object' && error !== null && 'response' in error
      ? (error as { response?: { status?: number } }).response?.status
      : undefined;
  }

  private async ensureWorkflowDefinitionsWithRetry(attempt = 1) {
    const result = await this.deployWorkflowDefinitionsIfMissing();
    if (result.failures === 0 || attempt >= 5) {
      return;
    }

    const delayMs = Math.min(30000, attempt * 5000);
    this.logger.warn(`Retrying Camunda BPMN deployment in ${delayMs / 1000}s`);
    setTimeout(() => void this.ensureWorkflowDefinitionsWithRetry(attempt + 1), delayMs);
  }

  private awaitHttp<T extends { data: unknown }>(request: { subscribe: (observer: { next: (value: T) => void; error: (error: unknown) => void }) => void }) {
    return new Promise<T>((resolve, reject) => request.subscribe({ next: resolve, error: reject }));
  }

  private auth() {
    return {
      username: this.config.get<string>('CAMUNDA_ADMIN_USER', 'demo'),
      password: this.config.get<string>('CAMUNDA_ADMIN_PASSWORD', 'demo'),
    };
  }
}
