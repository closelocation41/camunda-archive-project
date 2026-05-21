import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CamundaVariable {
  value: unknown;
  type?: string;
  valueInfo?: Record<string, unknown>;
}

@Injectable()
export class CamundaApiService {
  private readonly logger = new Logger(CamundaApiService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('CAMUNDA_BASE_URL').replace(/\/$/, '');
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
