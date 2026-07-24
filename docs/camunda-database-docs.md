### Complete Camunda 7 Table List — Category Wise
---

#### Repository Tables (ACT_RE_*)

| Table Name |
| ---------- |
| ACT_RE_DEPLOYMENT |
| ACT_RE_PROCDEF |
| ACT_RE_MODEL |
| ACT_RE_DECISION_DEF |
| ACT_RE_DECISION_REQUIREMENT_DEF |
| ACT_RE_CAM_FORM_DEF |
| ACT_RE_PROCDEF_INFO (optional) |
| ACT_RE_BYTEARRAY (variant/legacy; optional) |
| ACT_RE_DEPLOYMENT_RESOURCE (mapping variant; optional) |

---

#### Runtime Tables (ACT_RU_*)

| Table Name |
| ---------- |
| ACT_RU_EXECUTION |
| ACT_RU_TASK |
| ACT_RU_VARIABLE |
| ACT_RU_JOB |
| ACT_RU_TIMER_JOB |
| ACT_RU_JOBDEF (or ACT_RU_JOB_DEF) |
| ACT_RU_EVENT_SUBSCR |
| ACT_RU_INCIDENT |
| ACT_RU_IDENTITYLINK |
| ACT_RU_EXTERNAL_TASK (ACT_RU_EXT_TASK) |
| ACT_RU_BATCH |
| ACT_RU_METER_LOG (optional, metrics) |
| ACT_RU_AUTHORIZATION |
| ACT_RU_FILTER |
| ACT_RU_DEADLETTER_JOB (optional, vendor/feature) |
| ACT_RU_SUSPENDED_JOB (optional, vendor/feature) |

---

#### History Tables (ACT_HI_*)

| Table Name |
| ---------- |
| ACT_HI_PROCINST |
| ACT_HI_ACTINST |
| ACT_HI_TASKINST |
| ACT_HI_VARINST |
| ACT_HI_DETAIL |
| ACT_HI_COMMENT |
| ACT_HI_ATTACHMENT |
| ACT_HI_OP_LOG |
| ACT_HI_INCIDENT |
| ACT_HI_IDENTITYLINK |
| ACT_HI_DECINST (ACT_HI_DEC_INSTANCE) |
| ACT_HI_DEC_IN |
| ACT_HI_DEC_OUT |
| ACT_HI_BATCH |
| ACT_HI_JOB_LOG |
| ACT_HI_EXTERNAL_TASK_LOG (ACT_HI_EXT_TASK_LOG) |
| ACT_HI_CASEINST (CMMN optional) |
| ACT_HI_CASEACTINST (CMMN optional) |
| ACT_HI_CASETASKINST (CMMN optional) |

---

#### General / Engine Tables (ACT_GE_*)

| Table Name |
| ---------- |
| ACT_GE_BYTEARRAY |
| ACT_GE_PROPERTY |
| ACT_GE_SCHEMA_LOG |
| ACT_GE_BYTEARRAY_METADATA (plugin/variant; optional) |

---

#### Identity Tables (ACT_ID_*)

| Table Name |
| ---------- |
| ACT_ID_USER |
| ACT_ID_GROUP |
| ACT_ID_MEMBERSHIP |
| ACT_ID_INFO |
| ACT_ID_TENANT |
| ACT_ID_TENANT_MEMBER |

---

#### Authorization / Permission Tables

| Table Name |
| ---------- |
| ACT_RU_AUTHORIZATION (core) |
| ACT_RU_AUTHORIZATION_RESOURCE (extension/variant; optional) |

---

#### Metrics, Metering & Plugin Tables (Optional / Distribution Dependent)

| Table Name |
| ---------- |
| ACT_METER_* (series of metric tables; optional) |
| ACT_RU_METER_LOG (runtime meter events; optional) |
| ACT_PLUGIN_* (plugin-specific tables; optional) |
| ACT_MONITOR_* (monitoring extensions; optional) |

---

#### Common Legacy / Variant / Extension Tables (may appear in some installs)

| Table Name |
| ---------- |
| ACT_RE_BYTEARRAY (legacy resource storage) |
| ACT_BYTEARRAY (legacy alias) |
| ACT_HI_JOB (variant) |
| ACT_HI_TASK (variant) |
| ACT_PROPERTY (legacy alias) |

---




---

# Complete Camunda 7 Database Table Mapping

| Table                               | Category   | Use Case                                                                            | History Available? | History Stored In                                          |
| ----------------------------------- | ---------- | ----------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------- |
| ACT_RE_DEPLOYMENT                   | Repository | Deployment metadata                                                                 | ❌ No               | —                                                          |
| ACT_RE_PROCDEF                      | Repository | BPMN Process Definitions                                                            | ❌ No               | —                                                          |
| ACT_RE_CASE_DEF                     | Repository | CMMN Case Definitions                                                               | ❌ No               | —                                                          |
| ACT_RE_DECISION_DEF                 | Repository | DMN Decision Definitions                                                            | ❌ No               | —                                                          |
| ACT_RE_DECISION_REQ_DEF             | Repository | DMN Decision Requirement Graph                                                      | ❌ No               | —                                                          |
| ACT_GE_BYTEARRAY                    | General    | BPMN XML, DMN XML, Forms, Serialized Variables, Attachments, Exception Stack Traces | ⚠ Referenced only  | Referenced by many ACT_HI_* tables through `BYTEARRAY_ID_` |
| ACT_GE_PROPERTY                     | General    | Engine configuration                                                                | ❌ No               | —                                                          |
| ACT_GE_SCHEMA_LOG                   | General    | Database schema upgrade log                                                         | ❌ No               | —                                                          |
| ACT_ID_USER                         | Identity   | Users                                                                               | ❌ No               | —                                                          |
| ACT_ID_GROUP                        | Identity   | Groups                                                                              | ❌ No               | —                                                          |
| ACT_ID_MEMBERSHIP                   | Identity   | User-Group mapping                                                                  | ❌ No               | —                                                          |
| ACT_ID_TENANT                       | Identity   | Tenants                                                                             | ❌ No               | —                                                          |
| ACT_ID_TENANT_MEMBER                | Identity   | Tenant membership                                                                   | ❌ No               | —                                                          |
| ACT_ID_INFO                         | Identity   | User information                                                                    | ❌ No               | —                                                          |
| ACT_ID_AUTH                         | Identity   | Authorization                                                                       | ❌ No               | —                                                          |
| ACT_RU_EXECUTION                    | Runtime    | Process execution tree                                                              | ✅ Partial          | ACT_HI_PROCINST, ACT_HI_ACTINST                            |
| ACT_RU_TASK                         | Runtime    | Active user tasks                                                                   | ✅ Yes              | ACT_HI_TASKINST                                            |
| ACT_RU_VARIABLE                     | Runtime    | Runtime variables                                                                   | ✅ Yes              | ACT_HI_VARINST, ACT_HI_DETAIL                              |
| ACT_RU_INCIDENT                     | Runtime    | Active incidents                                                                    | ✅ Yes              | ACT_HI_INCIDENT                                            |
| ACT_RU_JOB                          | Runtime    | Async jobs                                                                          | ✅ Logs only        | ACT_HI_JOB_LOG                                             |
| ACT_RU_JOBDEF                       | Runtime    | Job definitions                                                                     | ❌ No               | —                                                          |
| ACT_RU_TIMER_JOB                    | Runtime    | Waiting timer jobs                                                                  | ❌ No               | —                                                          |
| ACT_RU_SUSPENDED_JOB                | Runtime    | Suspended jobs                                                                      | ❌ No               | —                                                          |
| ACT_RU_DEADLETTER_JOB               | Runtime    | Failed jobs                                                                         | ❌ No               | —                                                          |
| ACT_RU_EXTERNAL_TASK                | Runtime    | External Tasks                                                                      | ✅ Logs only        | ACT_HI_EXT_TASK_LOG                                        |
| ACT_RU_EVENT_SUBSCR                 | Runtime    | Message/Signal/Event subscriptions                                                  | ❌ No               | —                                                          |
| ACT_RU_IDENTITYLINK                 | Runtime    | Runtime candidate users/groups                                                      | ✅ Yes              | ACT_HI_IDENTITYLINK                                        |
| ACT_RU_AUTHORIZATION *(Enterprise)* | Runtime    | Runtime authorization cache                                                         | ❌ No               | —                                                          |
| ACT_RU_FILTER                       | Runtime    | Saved task filters                                                                  | ❌ No               | —                                                          |
| ACT_RU_BATCH                        | Runtime    | Batch execution                                                                     | ✅ Yes              | ACT_HI_BATCH                                               |
| ACT_RU_METER_LOG                    | Runtime    | Metrics                                                                             | ❌ Already log      | —                                                          |
| ACT_HI_PROCINST                     | History    | Completed Process Instances                                                         | —                  | Source: ACT_RU_EXECUTION                                   |
| ACT_HI_ACTINST                      | History    | Activity execution history                                                          | —                  | Source: ACT_RU_EXECUTION                                   |
| ACT_HI_TASKINST                     | History    | Completed User Tasks                                                                | —                  | Source: ACT_RU_TASK                                        |
| ACT_HI_VARINST                      | History    | Latest Variable Values                                                              | —                  | Source: ACT_RU_VARIABLE                                    |
| ACT_HI_DETAIL                       | History    | Variable Updates & Form Properties                                                  | —                  | Source: ACT_RU_VARIABLE                                    |
| ACT_HI_ATTACHMENT                   | History    | Task/Process Attachments                                                            | —                  | Runtime API                                                |
| ACT_HI_COMMENT                      | History    | Comments                                                                            | —                  | Runtime API                                                |
| ACT_HI_OP_LOG                       | History    | User Operation Log                                                                  | —                  | Engine                                                     |
| ACT_HI_INCIDENT                     | History    | Incident History                                                                    | —                  | ACT_RU_INCIDENT                                            |
| ACT_HI_JOB_LOG                      | History    | Job Execution Log                                                                   | —                  | ACT_RU_JOB                                                 |
| ACT_HI_EXT_TASK_LOG                 | History    | External Task Log                                                                   | —                  | ACT_RU_EXTERNAL_TASK                                       |
| ACT_HI_BATCH                        | History    | Batch History                                                                       | —                  | ACT_RU_BATCH                                               |
| ACT_HI_IDENTITYLINK                 | History    | Identity Link History                                                               | —                  | ACT_RU_IDENTITYLINK                                        |
| ACT_HI_DECINST                      | History    | DMN Decision Execution                                                              | —                  | Decision Engine                                            |
| ACT_HI_DEC_IN                       | History    | Decision Input Values                                                               | —                  | Decision Engine                                            |
| ACT_HI_DEC_OUT                      | History    | Decision Output Values                                                              | —                  | Decision Engine                                            |
| ACT_HI_CASEINST                     | History    | CMMN Case History                                                                   | —                  | Runtime Case                                               |
| ACT_HI_CASEACTINST                  | History    | CMMN Activity History                                                               | —                  | Runtime Case                                               |

---

# Runtime → History Mapping

| Runtime Table        | History Table(s)                              |
| -------------------- | --------------------------------------------- |
| ACT_RU_EXECUTION     | ACT_HI_PROCINST, ACT_HI_ACTINST               |
| ACT_RU_TASK          | ACT_HI_TASKINST                               |
| ACT_RU_VARIABLE      | ACT_HI_VARINST, ACT_HI_DETAIL                 |
| ACT_RU_INCIDENT      | ACT_HI_INCIDENT                               |
| ACT_RU_JOB           | ACT_HI_JOB_LOG                                |
| ACT_RU_EXTERNAL_TASK | ACT_HI_EXT_TASK_LOG                           |
| ACT_RU_BATCH         | ACT_HI_BATCH                                  |
| ACT_RU_IDENTITYLINK  | ACT_HI_IDENTITYLINK                           |
| CMMN Runtime         | ACT_HI_CASEINST, ACT_HI_CASEACTINST           |
| DMN Runtime          | ACT_HI_DECINST, ACT_HI_DEC_IN, ACT_HI_DEC_OUT |

---

# Runtime Data NOT Fully Preserved in History

| Runtime Table         | What Is Missing from History                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| ACT_RU_EXECUTION      | Full execution tree, concurrent execution hierarchy, execution IDs, scope hierarchy                  |
| ACT_RU_EVENT_SUBSCR   | Message, signal, compensation, conditional event subscriptions                                       |
| ACT_RU_JOBDEF         | Job definition metadata                                                                              |
| ACT_RU_TIMER_JOB      | Pending timer jobs                                                                                   |
| ACT_RU_SUSPENDED_JOB  | Suspended jobs                                                                                       |
| ACT_RU_DEADLETTER_JOB | Dead-letter jobs waiting for retry                                                                   |
| ACT_RU_JOB            | Current runtime job state (only execution logs are retained)                                         |
| ACT_RU_EXTERNAL_TASK  | Current lock/worker state (only log entries are retained)                                            |
| ACT_RU_FILTER         | Saved task filters                                                                                   |
| ACT_RU_METER_LOG      | Metrics (stored only in this table)                                                                  |
| ACT_RU_AUTHORIZATION  | Runtime authorization data                                                                           |
| ACT_GE_PROPERTY       | Engine configuration                                                                                 |
| ACT_GE_SCHEMA_LOG     | Schema version history only                                                                          |
| ACT_GE_BYTEARRAY      | Binary content itself is not copied into history tables; history stores references (`BYTEARRAY_ID_`) |

---

# Tables With No History Equivalent

| Table                   | Reason                   |
| ----------------------- | ------------------------ |
| ACT_RE_DEPLOYMENT       | Repository metadata      |
| ACT_RE_PROCDEF          | BPMN definition          |
| ACT_RE_CASE_DEF         | CMMN definition          |
| ACT_RE_DECISION_DEF     | DMN definition           |
| ACT_RE_DECISION_REQ_DEF | DRD definition           |
| ACT_ID_USER             | Identity management      |
| ACT_ID_GROUP            | Identity management      |
| ACT_ID_MEMBERSHIP       | Identity management      |
| ACT_ID_TENANT           | Identity management      |
| ACT_ID_TENANT_MEMBER    | Identity management      |
| ACT_ID_INFO             | User profile information |
| ACT_ID_AUTH             | Authorization            |
| ACT_GE_PROPERTY         | Engine configuration     |
| ACT_GE_SCHEMA_LOG       | Schema version log       |
| ACT_RU_EVENT_SUBSCR     | Runtime only             |
| ACT_RU_JOBDEF           | Runtime only             |
| ACT_RU_TIMER_JOB        | Runtime only             |
| ACT_RU_SUSPENDED_JOB    | Runtime only             |
| ACT_RU_DEADLETTER_JOB   | Runtime only             |
| ACT_RU_FILTER           | Runtime only             |
| ACT_RU_METER_LOG        | Metrics/log table        |
| ACT_RU_AUTHORIZATION    | Runtime authorization    |

### Note



---

# Camunda 7 Database  

---

## Chapter 1 — Repository Tables (ACT_RE_*)

---

### ACT_RE_DEPLOYMENT

**Table Summary (Text):**  
Stores metadata for deployments (processes, decisions, forms, models). Inserted on deployment creation; rarely updated; deleted when deployment is removed. Primary key is `ID_`. Used to locate resources stored in `ACT_GE_BYTEARRAY` and to resolve deployed definitions.

**Relationships (Text):**  
Parent of binary resources in `ACT_GE_BYTEARRAY`; referenced by `ACT_RE_PROCDEF`, `ACT_RE_MODEL`, `ACT_RE_DECISION_DEF`, and `ACT_RE_CAM_FORM_DEF`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Deployment id (PK). |
| NAME_ | VARCHAR | Deployment name. |
| DEPLOY_TIME_ | TIMESTAMP | Timestamp when deployment occurred. |
| TENANT_ID_ | VARCHAR | Tenant id for multi-tenant deployments. |
| ENGINE_VERSION_ | VARCHAR | Engine version that created the deployment. |
| CATEGORY_ | VARCHAR | Optional category. |

---

### ACT_RE_PROCDEF

**Table Summary (Text):**  
Holds metadata for deployed process definitions (one row per version). Inserted on deployment; used at runtime to instantiate processes. Primary key `ID_`. Contains keys, version, resource names and flags.

**Relationships (Text):**  
References `ACT_RE_DEPLOYMENT` via `DEPLOYMENT_ID_`; referenced by runtime tables (`ACT_RU_EXECUTION`, `ACT_RU_TASK`) and history tables.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Process definition id (PK). |
| REV_ | INTEGER | Revision for optimistic locking. |
| CATEGORY_ | VARCHAR | Category of the process. |
| NAME_ | VARCHAR | Display name. |
| KEY_ | VARCHAR | Process definition key. |
| VERSION_ | INTEGER | Version number. |
| DEPLOYMENT_ID_ | VARCHAR | FK to `ACT_RE_DEPLOYMENT.ID_`. |
| RESOURCE_NAME_ | VARCHAR | Resource name in deployment. |
| DGRM_RESOURCE_NAME_ | VARCHAR | Diagram resource name. |
| TENANT_ID_ | VARCHAR | Tenant id. |
| SUSPENSION_STATE_ | INTEGER | Suspension state flag. |
| HISTORY_LEVEL_ | VARCHAR | History level at deployment time. |
| STARTABLE_IN_TASKLIST_ | INTEGER | Flag for Tasklist startability. |

---

### ACT_RE_DECISION_DEF

**Table Summary (Text):**  
Stores deployed decision (DMN) definition metadata. Inserted on DMN deployment; used by the decision service. Primary key `ID_`. Contains key, version, resource name and tenant info.

**Relationships (Text):**  
References `ACT_RE_DEPLOYMENT`; may be linked to `ACT_RE_DECISION_REQ_DEF`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Decision definition id (PK). |
| KEY_ | VARCHAR | Decision definition key. |
| CATEGORY_ | VARCHAR | Category. |
| NAME_ | VARCHAR | Display name. |
| DEPLOYMENT_ID_ | VARCHAR | FK to `ACT_RE_DEPLOYMENT.ID_`. |
| RESOURCE_NAME_ | VARCHAR | Resource name. |
| VERSION_ | INTEGER | Version number. |
| TENANT_ID_ | VARCHAR | Tenant id. |
| DECISION_REQUIREMENTS_ID_ | VARCHAR | FK to decision requirements (DRD) if linked. |

---

### ACT_RE_DECISION_REQ_DEF

**Table Summary (Text):**  
Stores Decision Requirements (DRD) metadata linking multiple decisions. Inserted on DRD deployment. Primary key `ID_`. Used to group decision definitions and track deployments.

**Relationships (Text):**  
Parent for `ACT_RE_DECISION_DEF` when decisions belong to a DRD; references `ACT_RE_DEPLOYMENT`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | DRD id (PK). |
| NAME_ | VARCHAR | DRD name. |
| KEY_ | VARCHAR | DRD key. |
| DEPLOYMENT_ID_ | VARCHAR | FK to `ACT_RE_DEPLOYMENT.ID_`. |
| TENANT_ID_ | VARCHAR | Tenant id. |
| RESOURCE_NAME_ | VARCHAR | Resource name. |

---

### ACT_RE_CAM_FORM_DEF

**Table Summary (Text):**  
Stores deployed Camunda form definitions (form metadata). Inserted on form deployment; used by Tasklist and forms rendering. Primary key `ID_`. May reference binary content in `ACT_GE_BYTEARRAY`.

**Relationships (Text):**  
References `ACT_RE_DEPLOYMENT`; form content may be stored in `ACT_GE_BYTEARRAY`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Form definition id (PK). |
| NAME_ | VARCHAR | Form name. |
| KEY_ | VARCHAR | Form key. |
| DEPLOYMENT_ID_ | VARCHAR | FK to `ACT_RE_DEPLOYMENT.ID_`. |
| RESOURCE_NAME_ | VARCHAR | Resource name. |
| TENANT_ID_ | VARCHAR | Tenant id. |
| VERSION_ | INTEGER | Version number. |

---

## Chapter 2 — Runtime Tables (ACT_RU_*)

---

### ACT_RU_EXECUTION

**Table Summary (Text):**  
Represents runtime executions (tokens) for process instances and scopes. Inserted when process instances start or when new executions are created; updated frequently; deleted when execution ends. Primary key `ID_`. Central to runtime state and navigation.

**Relationships (Text):**  
Parent for `ACT_RU_TASK`, `ACT_RU_VARIABLE`, `ACT_RU_EVENT_SUBSCR`, `ACT_RU_EXTERNAL_TASK`; references `ACT_RE_PROCDEF` via `PROC_DEF_ID_`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Execution id (PK). |
| REV_ | INTEGER | Revision for optimistic locking. |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| BUSINESS_KEY_ | VARCHAR | Business key of the instance. |
| PARENT_ID_ | VARCHAR | Parent execution id. |
| PROC_DEF_ID_ | VARCHAR | FK to process definition id. |
| ACT_ID_ | VARCHAR | Current activity id. |
| IS_ACTIVE_ | INTEGER | Active flag. |
| IS_CONCURRENT_ | INTEGER | Concurrent flag. |
| IS_SCOPE_ | INTEGER | Scope flag. |
| SUSPENSION_STATE_ | INTEGER | Suspension state. |
| TENANT_ID_ | VARCHAR | Tenant id. |
| NAME_ | VARCHAR | Optional execution name. |
| START_TIME_ | TIMESTAMP | Start time (if tracked). |

---

### ACT_RU_TASK

**Table Summary (Text):**  
Stores active user tasks. Inserted when a user task becomes active; updated on assignment/claim; deleted on completion and moved to history. Primary key `ID_`. Used by Tasklist and runtime services.

**Relationships (Text):**  
References `ACT_RU_EXECUTION` and `ACT_RE_PROCDEF`; related to `ACT_RU_VARIABLE` and `ACT_HI_TASKINST`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Task id (PK). |
| REV_ | INTEGER | Revision for optimistic locking. |
| EXECUTION_ID_ | VARCHAR | FK to execution owning the task. |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| PROC_DEF_ID_ | VARCHAR | Process definition id. |
| NAME_ | VARCHAR | Task name. |
| PARENT_TASK_ID_ | VARCHAR | Parent task id for subtasks. |
| DESCRIPTION_ | VARCHAR / TEXT | Task description. |
| TASK_DEF_KEY_ | VARCHAR | BPMN task definition key. |
| OWNER_ | VARCHAR | Owner user id. |
| ASSIGNEE_ | VARCHAR | Assigned user id. |
| DELEGATION_ | VARCHAR | Delegation state. |
| PRIORITY_ | INTEGER | Task priority. |
| CREATE_TIME_ | TIMESTAMP | Creation timestamp. |
| DUE_DATE_ | TIMESTAMP | Due date. |
| FOLLOW_UP_DATE_ | TIMESTAMP | Follow-up date. |
| SUSPENSION_STATE_ | INTEGER | Suspension state. |
| TENANT_ID_ | VARCHAR | Tenant id. |
| FORM_KEY_ | VARCHAR | Form key for task forms. |

---

### ACT_RU_VARIABLE

**Table Summary (Text):**  
Holds runtime variable instances (local and global) for executions, tasks, and case instances. Inserted/updated as variables are created/changed; deleted when scope ends. Primary key `ID_`. Large serialized values may reference `ACT_GE_BYTEARRAY`.

**Relationships (Text):**  
References `ACT_RU_EXECUTION`, `ACT_RU_TASK`; historic counterparts in `ACT_HI_VARINST`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Variable id (PK). |
| NAME_ | VARCHAR | Variable name. |
| REV_ | INTEGER | Revision for optimistic locking. |
| TYPE_ | VARCHAR | Variable type name. |
| EXECUTION_ID_ | VARCHAR | FK to execution if runtime variable. |
| TASK_ID_ | VARCHAR | FK to task if task-local variable. |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| BYTEARRAY_ID_ | VARCHAR | FK to `ACT_GE_BYTEARRAY` for serialized value. |
| DOUBLE_ | DOUBLE | Numeric double value (if applicable). |
| LONG_ | BIGINT | Numeric long value (if applicable). |
| TEXT_ | VARCHAR | Short text value. |
| TEXT2_ | VARCHAR | Additional text (e.g., large text). |
| CREATE_TIME_ | TIMESTAMP | Creation timestamp. |
| LAST_UPDATED_ | TIMESTAMP | Last update timestamp. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_RU_JOB

**Table Summary (Text):**  
Stores executable jobs (async continuations, timers moved to executable). Inserted when jobs are created; updated on retries; deleted on success or moved to history/log. Primary key `ID_`. Used by the job executor.

**Relationships (Text):**  
References `ACT_RU_EXECUTION` and `ACT_RE_PROCDEF`; related to `ACT_HI_JOB_LOG` and `ACT_RU_TIMER_JOB`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Job id (PK). |
| REV_ | INTEGER | Revision for optimistic locking. |
| TYPE_ | VARCHAR | Job type (e.g., async, timer). |
| EXCLUSIVE_ | INTEGER | Exclusive flag. |
| EXECUTION_ID_ | VARCHAR | FK to execution. |
| PROCESS_INSTANCE_ID_ | VARCHAR | Process instance id. |
| PROCESS_DEF_ID_ | VARCHAR | Process definition id. |
| RETRIES_ | INTEGER | Remaining retries. |
| EXCEPTION_MSG_ | VARCHAR | Short exception message. |
| EXCEPTION_STACK_ID_ | VARCHAR | FK to bytearray with stacktrace. |
| DUE_DATE_ | TIMESTAMP | Due date for job execution. |
| SUSPENSION_STATE_ | INTEGER | Suspension state. |
| TENANT_ID_ | VARCHAR | Tenant id. |
| HANDLER_TYPE_ | VARCHAR | Job handler type. |
| HANDLER_CFG_ | VARCHAR | Handler configuration. |

---

### ACT_RU_JOB_DEF (ACT_RU_JOB_DEF / ACT_RU_JOBDEF)

**Table Summary (Text):**  
Defines job definitions for timers and jobs created from process definitions. Inserted on deployment when job definitions are present. Primary key `ID_`. Used to create runtime jobs and manage job lifecycle.

**Relationships (Text):**  
References `ACT_RE_PROCDEF`; used to create `ACT_RU_JOB` and `ACT_RU_TIMER_JOB`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Job definition id (PK). |
| REV_ | INTEGER | Revision. |
| JOB_TYPE_ | VARCHAR | Job type. |
| PROCESS_DEF_ID_ | VARCHAR | Process definition id. |
| ACT_ID_ | VARCHAR | Activity id. |
| CONFIGURATION_ | VARCHAR | Job configuration. |
| TENANT_ID_ | VARCHAR | Tenant id. |
| SUSPENSION_STATE_ | INTEGER | Suspension state. |

---

### ACT_RU_EVENT_SUBSCR

**Table Summary (Text):**  
Holds runtime event subscriptions (message, signal, compensation). Inserted when event subscriptions are created; deleted when consumed or unsubscribed. Primary key `ID_`. Used by event correlation and message delivery.

**Relationships (Text):**  
References `ACT_RU_EXECUTION` and `ACT_RE_PROCDEF`; correlated with `ACT_RU_JOB` for message jobs.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Event subscription id (PK). |
| REV_ | INTEGER | Revision. |
| EVENT_TYPE_ | VARCHAR | Type (message, signal, compensation). |
| EVENT_NAME_ | VARCHAR | Event name. |
| EXECUTION_ID_ | VARCHAR | FK to execution. |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| ACT_ID_ | VARCHAR | Activity id where subscription exists. |
| CONFIGURATION_ | VARCHAR | Additional configuration. |
| CREATED_ | TIMESTAMP | Creation timestamp. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_RU_INCIDENT

**Table Summary (Text):**  
Records runtime incidents (failed jobs, failed external tasks). Inserted when incidents occur; updated on resolution; deleted when resolved and history cleaned. Primary key `ID_`. Used for monitoring and alerting.

**Relationships (Text):**  
References `ACT_RU_JOB`, `ACT_RU_EXECUTION`; historic counterpart `ACT_HI_INCIDENT`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Incident id (PK). |
| INCIDENT_TYPE_ | VARCHAR | Type of incident. |
| INCIDENT_MSG_ | VARCHAR | Short message. |
| EXECUTION_ID_ | VARCHAR | FK to execution. |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| ACT_ID_ | VARCHAR | Activity id. |
| CREATE_TIME_ | TIMESTAMP | Creation timestamp. |
| END_TIME_ | TIMESTAMP | Resolution timestamp. |
| JOB_ID_ | VARCHAR | Related job id. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_RU_IDENTITYLINK

**Table Summary (Text):**  
Stores runtime identity links (associations between tasks/processes and users/groups). Inserted when identity links are created; deleted when removed. Primary key `ID_`. Used for task assignment, candidate groups, and identity mapping.

**Relationships (Text):**  
References `ACT_RU_TASK`, `ACT_RU_EXECUTION`, `ACT_ID_USER`, and `ACT_ID_GROUP`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Identity link id (PK). |
| USER_ID_ | VARCHAR | User id. |
| GROUP_ID_ | VARCHAR | Group id. |
| TYPE_ | VARCHAR | Link type (candidate, assignee, owner). |
| TASK_ID_ | VARCHAR | FK to task id. |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_RU_EXT_TASK (ACT_RU_EXTERNAL_TASK)

**Table Summary (Text):**  
Stores external tasks for worker-based processing (topic-based). Inserted when external tasks are created; updated on lock/complete; deleted on completion. Primary key `ID_`. Used by external task workers.

**Relationships (Text):**  
References `ACT_RU_EXECUTION` and `ACT_RE_PROCDEF`; related to `ACT_RU_VARIABLE` for task variables.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | External task id (PK). |
| REV_ | INTEGER | Revision. |
| TOPIC_NAME_ | VARCHAR | Topic name for worker subscription. |
| WORKER_ID_ | VARCHAR | Current lock owner. |
| LOCK_EXP_TIME_ | TIMESTAMP | Lock expiration timestamp. |
| RETRIES_ | INTEGER | Remaining retries. |
| EXECUTION_ID_ | VARCHAR | FK to execution. |
| PROCESS_INSTANCE_ID_ | VARCHAR | Process instance id. |
| PROCESS_DEF_ID_ | VARCHAR | Process definition id. |
| TENANT_ID_ | VARCHAR | Tenant id. |
| PRIORITY_ | BIGINT | Priority for ordering. |
| ERROR_MSG_ | VARCHAR | Error message on failure. |

---

### ACT_RU_BATCH

**Table Summary (Text):**  
Tracks runtime batch operations (bulk jobs, migrations). Inserted when batch created; updated during lifecycle; deleted when completed. Primary key `ID_`. Used for long-running batch processes and monitoring.

**Relationships (Text):**  
Related to `ACT_RU_JOB` (batch jobs) and `ACT_HI_BATCH` for history.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Batch id (PK). |
| TYPE_ | VARCHAR | Batch type. |
| TOTAL_JOBS_ | INTEGER | Total number of jobs in batch. |
| JOBS_CREATED_ | INTEGER | Number of jobs created. |
| SEED_JOB_DEF_ID_ | VARCHAR | Seed job definition id. |
| MONITOR_JOB_DEF_ID_ | VARCHAR | Monitor job definition id. |
| TENANT_ID_ | VARCHAR | Tenant id. |
| CREATE_TIME_ | TIMESTAMP | Creation timestamp. |
| SUSPENSION_STATE_ | INTEGER | Suspension state. |

---

### ACT_RU_METER_LOG

**Table Summary (Text):**  
Optional runtime metrics log table (present when metrics/metering enabled). Stores meter events and counters for runtime metrics. Primary key `ID_`. Used by monitoring and metrics exporters.

**Relationships (Text):**  
Often independent; may include tags referencing deployments or process definitions.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Meter log id (PK). |
| NAME_ | VARCHAR | Meter name. |
| TIMESTAMP_ | TIMESTAMP | Event timestamp. |
| VALUE_ | NUMERIC | Metric value. |
| TAGS_ | VARCHAR | Tags or labels. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_RU_AUTHORIZATION

**Table Summary (Text):**  
Stores runtime authorization entries (permissions for resources). Inserted/updated when authorizations are created or changed. Primary key `ID_`. Used by engine to enforce access control.

**Relationships (Text):**  
May reference users/groups (`ACT_ID_USER`/`ACT_ID_GROUP`) via `USER_ID_`/`GROUP_ID_`; used by runtime permission checks.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Authorization id (PK). |
| REV_ | INTEGER | Revision for optimistic locking. |
| TYPE_ | INTEGER | Authorization type (grant/deny). |
| USER_ID_ | VARCHAR | User id this authorization applies to. |
| GROUP_ID_ | VARCHAR | Group id this authorization applies to. |
| RESOURCE_TYPE_ | INTEGER | Resource type code. |
| RESOURCE_ID_ | VARCHAR | Resource id (e.g., processDefId). |
| PERMISSIONS_ | INTEGER | Bitmask or encoded permissions. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_RU_FILTER

**Table Summary (Text):**  
Stores runtime filters (tasklist/operation filters) used by UI components. Inserted/updated by users. Primary key `ID_`. Contains JSON configuration and query definitions for Tasklist and Cockpit.

**Relationships (Text):**  
May reference users (`ACT_ID_USER`) via owner fields.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Filter id (PK). |
| NAME_ | VARCHAR | Filter name. |
| REV_ | INTEGER | Revision. |
| OWNER_ | VARCHAR | Owner user id. |
| QUERY_ | CLOB / VARCHAR | JSON query definition. |
| PROPERTIES_ | CLOB / VARCHAR | JSON properties. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

## Chapter 3 — History Tables (ACT_HI_*)

---

### ACT_HI_PROCINST

**Table Summary (Text):**  
Historic process instance records (start/end/duration and metadata). Inserted when process instances start and updated on completion. Primary key `ID_`. Used for audit, reporting, and history queries.

**Relationships (Text):**  
References `ACT_RE_PROCDEF` and links to `ACT_HI_ACTINST`, `ACT_HI_VARINST`, `ACT_HI_TASKINST`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Historic process instance id (PK). |
| PROC_INST_ID_ | VARCHAR | Process instance id (duplicate key). |
| PROC_DEF_ID_ | VARCHAR | Process definition id. |
| BUSINESS_KEY_ | VARCHAR | Business key. |
| START_TIME_ | TIMESTAMP | Start timestamp. |
| END_TIME_ | TIMESTAMP | End timestamp. |
| DURATION_ | BIGINT | Duration in ms. |
| START_USER_ID_ | VARCHAR | User who started the instance. |
| START_ACTIVITY_ID_ | VARCHAR | Start activity id. |
| DELETE_REASON_ | VARCHAR | Reason for deletion if ended. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_ACTINST

**Table Summary (Text):**  
Historic activity instances (enter/exit of activities). Inserted when activities are entered and updated on exit. Primary key `ID_`. Used for process tracing and audit.

**Relationships (Text):**  
References `ACT_HI_PROCINST` and `ACT_RE_PROCDEF`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Historic activity instance id (PK). |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| ACT_ID_ | VARCHAR | Activity id. |
| ACT_NAME_ | VARCHAR | Activity name. |
| ACT_TYPE_ | VARCHAR | Activity type (userTask, serviceTask). |
| START_TIME_ | TIMESTAMP | Start time. |
| END_TIME_ | TIMESTAMP | End time. |
| DURATION_ | BIGINT | Duration in ms. |
| TASK_ID_ | VARCHAR | Related task id if applicable. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_TASKINST

**Table Summary (Text):**  
Historic user task instances (completed tasks). Inserted when tasks are created and updated on completion. Primary key `ID_`. Used for audit, reporting, and task history.

**Relationships (Text):**  
References `ACT_HI_PROCINST` and `ACT_RE_PROCDEF`; original runtime task in `ACT_RU_TASK`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Historic task instance id (PK). |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| TASK_DEF_KEY_ | VARCHAR | Task definition key. |
| NAME_ | VARCHAR | Task name. |
| ASSIGNEE_ | VARCHAR | User assigned. |
| OWNER_ | VARCHAR | Owner user id. |
| START_TIME_ | TIMESTAMP | Task start time. |
| END_TIME_ | TIMESTAMP | Task end time. |
| DURATION_ | BIGINT | Duration in ms. |
| DELETE_REASON_ | VARCHAR | Deletion reason. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_VARINST

**Table Summary (Text):**  
Historic variable instances (values and metadata). Inserted when variables are created and updated on change; may store serialized values or reference `ACT_GE_BYTEARRAY`. Primary key `ID_`. Used for audit and historical queries.

**Relationships (Text):**  
References `ACT_HI_PROCINST`, `ACT_HI_TASKINST`, and `ACT_GE_BYTEARRAY`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Historic variable id (PK). |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| TASK_ID_ | VARCHAR | Task id if task-local. |
| NAME_ | VARCHAR | Variable name. |
| VAR_TYPE_ | VARCHAR | Variable type. |
| TEXT_ | VARCHAR | Short text value. |
| TEXT2_ | VARCHAR | Additional text. |
| DOUBLE_ | DOUBLE | Double value. |
| LONG_ | BIGINT | Long value. |
| BYTEARRAY_ID_ | VARCHAR | FK to `ACT_GE_BYTEARRAY` for serialized value. |
| CREATE_TIME_ | TIMESTAMP | Creation timestamp. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_DETAIL

**Table Summary (Text):**  
Stores detailed history entries (form properties, variable updates, identity link changes). Inserted for fine-grained history events. Primary key `ID_`. Used for detailed auditing and form/variable change history.

**Relationships (Text):**  
References `ACT_HI_PROCINST`, `ACT_HI_TASKINST`, and `ACT_HI_VARINST`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Historic detail id (PK). |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| TASK_ID_ | VARCHAR | Task id if applicable. |
| ACT_INST_ID_ | VARCHAR | Activity instance id. |
| NAME_ | VARCHAR | Detail name (e.g., variable name). |
| VAR_TYPE_ | VARCHAR | Variable type. |
| TEXT_ | VARCHAR | Text value. |
| LONG_ | BIGINT | Long value. |
| DOUBLE_ | DOUBLE | Double value. |
| BYTEARRAY_ID_ | VARCHAR | FK to `ACT_GE_BYTEARRAY`. |
| TIME_ | TIMESTAMP | Timestamp of detail. |

---

### ACT_HI_COMMENT

**Table Summary (Text):**  
Historic comments added to tasks/processes. Inserted when comments are created. Primary key `ID_`. Used for collaboration history and audit.

**Relationships (Text):**  
References `ACT_HI_TASKINST` and `ACT_HI_PROCINST`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Comment id (PK). |
| USER_ID_ | VARCHAR | Author user id. |
| TIME_ | TIMESTAMP | Timestamp. |
| TASK_ID_ | VARCHAR | Related task id. |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| MESSAGE_ | CLOB | Comment text. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_ATTACHMENT

**Table Summary (Text):**  
Historic attachments (files linked to tasks/processes). Inserted when attachments are created; may reference `ACT_GE_BYTEARRAY`. Primary key `ID_`. Used for audit and retrieval of attached content.

**Relationships (Text):**  
References `ACT_HI_TASKINST` and `ACT_HI_PROCINST`; may reference `ACT_GE_BYTEARRAY`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Attachment id (PK). |
| NAME_ | VARCHAR | Attachment name. |
| DESCRIPTION_ | VARCHAR | Description. |
| TYPE_ | VARCHAR | Attachment type. |
| TASK_ID_ | VARCHAR | Related task id. |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| CONTENT_ | VARCHAR | Content id or URL. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_OP_LOG

**Table Summary (Text):**  
Operation log for administrative actions (user operations). Inserted when operations occur (e.g., user changes, admin actions). Primary key `ID_`. Used for audit and compliance.

**Relationships (Text):**  
May reference users, tasks, and process instances.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Operation log id (PK). |
| TIMESTAMP_ | TIMESTAMP | Operation time. |
| USER_ID_ | VARCHAR | User who performed operation. |
| OPERATION_TYPE_ | VARCHAR | Type of operation. |
| ENTITY_TYPE_ | VARCHAR | Entity affected. |
| ENTITY_ID_ | VARCHAR | Entity id. |
| PROPERTY_ | VARCHAR | Property changed. |
| ORG_VALUE_ | VARCHAR | Original value. |
| NEW_VALUE_ | VARCHAR | New value. |

---

### ACT_HI_INCIDENT

**Table Summary (Text):**  
Historic incidents (resolved or unresolved). Inserted when incidents occur; updated on resolution. Primary key `ID_`. Used for incident history and reporting.

**Relationships (Text):**  
References `ACT_HI_PROCINST` and `ACT_HI_JOB_LOG`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Historic incident id (PK). |
| INCIDENT_TYPE_ | VARCHAR | Incident type. |
| INCIDENT_MSG_ | VARCHAR | Message. |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| ACT_ID_ | VARCHAR | Activity id. |
| CREATE_TIME_ | TIMESTAMP | Creation time. |
| END_TIME_ | TIMESTAMP | Resolution time. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_IDENTITYLINK

**Table Summary (Text):**  
Historic identity links (associations between tasks/processes and users/groups). Inserted when identity links are created; used for audit. Primary key `ID_`.

**Relationships (Text):**  
References `ACT_HI_TASKINST`, `ACT_HI_PROCINST`, `ACT_ID_USER`, `ACT_ID_GROUP`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Historic identity link id (PK). |
| USER_ID_ | VARCHAR | User id. |
| GROUP_ID_ | VARCHAR | Group id. |
| TYPE_ | VARCHAR | Link type. |
| TASK_ID_ | VARCHAR | Task id. |
| PROC_INST_ID_ | VARCHAR | Process instance id. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_DEC_INSTANCE (ACT_HI_DECINST)

**Table Summary (Text):**  
Historic decision instances (DMN evaluation results). Inserted when decisions are evaluated; stores result metadata. Primary key `ID_`. Used for decision audit and traceability.

**Relationships (Text):**  
References `ACT_RE_DECISION_DEF` and `ACT_HI_PROCINST` when decision invoked from a process.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Decision instance id (PK). |
| DECISION_DEF_ID_ | VARCHAR | Decision definition id. |
| DECISION_KEY_ | VARCHAR | Decision key. |
| EVALUATION_TIME_ | TIMESTAMP | Evaluation timestamp. |
| PROCESS_INSTANCE_ID_ | VARCHAR | Process instance id if invoked from process. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_DEC_IN

**Table Summary (Text):**  
Historic decision input entries (input values for decision evaluations). Inserted per input during decision evaluation. Primary key `ID_`. Used to reconstruct decision inputs.

**Relationships (Text):**  
References `ACT_HI_DEC_INSTANCE`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Decision input id (PK). |
| DECISION_INST_ID_ | VARCHAR | FK to decision instance. |
| CLAUSE_ID_ | VARCHAR | Clause id or input id. |
| VALUE_ | VARCHAR | Input value. |

---

### ACT_HI_DEC_OUT

**Table Summary (Text):**  
Historic decision output entries (output values from decision evaluations). Inserted per output during decision evaluation. Primary key `ID_`. Used to reconstruct decision outputs.

**Relationships (Text):**  
References `ACT_HI_DEC_INSTANCE`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Decision output id (PK). |
| DECISION_INST_ID_ | VARCHAR | FK to decision instance. |
| CLAUSE_ID_ | VARCHAR | Clause id or output id. |
| VALUE_ | VARCHAR | Output value. |

---

### ACT_HI_BATCH

**Table Summary (Text):**  
Historic records for batch operations. Inserted when batch operations complete or progress; used for auditing batch lifecycle. Primary key `ID_`. Stores metadata about batch execution.

**Relationships (Text):**  
References `ACT_RU_BATCH` and `ACT_HI_JOB_LOG` for batch job history.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Historic batch id (PK). |
| TYPE_ | VARCHAR | Batch type. |
| TOTAL_JOBS_ | INTEGER | Total jobs in batch. |
| JOBS_CREATED_ | INTEGER | Jobs created. |
| START_TIME_ | TIMESTAMP | Batch start time. |
| END_TIME_ | TIMESTAMP | Batch end time. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_JOB_LOG

**Table Summary (Text):**  
Historic log of job executions (success/failure). Inserted when jobs are executed or fail. Primary key `ID_`. Used for operational troubleshooting and audit.

**Relationships (Text):**  
References `ACT_RU_JOB` and `ACT_HI_PROCINST`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Job log id (PK). |
| JOB_ID_ | VARCHAR | Related job id. |
| JOB_DEF_ID_ | VARCHAR | Job definition id. |
| PROCESS_INSTANCE_ID_ | VARCHAR | Process instance id. |
| PROCESS_DEF_ID_ | VARCHAR | Process definition id. |
| JOB_RETRIES_ | INTEGER | Retries at time of log. |
| EXCEPTION_MSG_ | VARCHAR | Exception message. |
| CREATE_TIME_ | TIMESTAMP | Log timestamp. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_HI_EXT_TASK_LOG (ACT_HI_EXTERNAL_TASK_LOG)

**Table Summary (Text):**  
Historic log entries for external task lifecycle events (lock, failure, success). Inserted on external task events. Primary key `ID_`. Used for auditing external worker interactions.

**Relationships (Text):**  
References `ACT_RU_EXT_TASK` and `ACT_HI_PROCINST`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | External task log id (PK). |
| EXTERNAL_TASK_ID_ | VARCHAR | Related external task id. |
| WORKER_ID_ | VARCHAR | Worker id that processed the task. |
| TOPIC_NAME_ | VARCHAR | Topic name. |
| TIMESTAMP_ | TIMESTAMP | Event timestamp. |
| EVENT_TYPE_ | VARCHAR | Event type (lock, failure, success). |
| ERROR_MSG_ | VARCHAR | Error message if any. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

## Chapter 4 — General Tables (ACT_GE_*)

---

### ACT_GE_BYTEARRAY

**Table Summary (Text):**  
Stores binary large objects used across the engine (BPMN/DMN resources, serialized variables, stack traces, pictures). Inserted on deployment or when storing large variable content; deleted when resource removed. Primary key `ID_`. Central binary store referenced by many tables.

**Relationships (Text):**  
Referenced by `ACT_RE_DEPLOYMENT` (resource mapping), `ACT_RU_VARIABLE`, `ACT_HI_VARINST`, `ACT_RU_JOB` (exception stack), and identity picture fields.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Byte array id (PK). |
| REV_ | INTEGER | Revision for optimistic locking. |
| NAME_ | VARCHAR | Resource name. |
| DEPLOYMENT_ID_ | VARCHAR | FK to `ACT_RE_DEPLOYMENT.ID_` if part of a deployment. |
| BYTES_ | BLOB | Binary content. |
| GENERATED_ | INTEGER / BOOLEAN | Flag indicating system-generated content. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_GE_PROPERTY

**Table Summary (Text):**  
Stores global engine properties and configuration values. Inserted during engine bootstrap or when configuration changes; rarely deleted. Primary key `NAME_`. Used for engine flags, default settings, and lightweight metadata.

**Relationships (Text):**  
Independent table — no parent or child relationships.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| NAME_ | VARCHAR | Property name (PK). |
| VALUE_ | VARCHAR | Property value. |
| REV_ | INTEGER | Revision for optimistic locking. |

---

### ACT_GE_SCHEMA_LOG

**Table Summary (Text):**  
Tracks applied database schema migrations and versions. Each row records a schema change event; rows are appended, not updated. Useful for upgrade auditing and troubleshooting. Primary key `ID_`.

**Relationships (Text):**  
Independent audit table — no foreign keys.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Schema log id (PK). |
| TIMESTAMP_ | TIMESTAMP | When the schema change was applied. |
| VERSION_ | VARCHAR | Schema version or migration id. |
| DESCRIPTION_ | VARCHAR | Optional description of the change. |

---

## Chapter 5 — Identity Tables (ACT_ID_*)

---

### ACT_ID_USER

**Table Summary (Text):**  
Stores identity users for authentication and authorization. Inserted/updated by identity management. Primary key `ID_`. Used by task assignment, identity links, and authorization checks.

**Relationships (Text):**  
Referenced by `ACT_ID_MEMBERSHIP`, `ACT_RU_IDENTITYLINK`, `ACT_RU_AUTHORIZATION`, and history identity tables.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | User id (PK). |
| REV_ | INTEGER | Revision. |
| FIRST_ | VARCHAR | First name. |
| LAST_ | VARCHAR | Last name. |
| EMAIL_ | VARCHAR | Email address. |
| PWD_ | VARCHAR | Password hash. |
| PICTURE_ID_ | VARCHAR | FK to `ACT_GE_BYTEARRAY` for picture. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_ID_GROUP

**Table Summary (Text):**  
Stores identity groups. Inserted/updated by identity management. Primary key `ID_`. Used for group-based authorization and candidate groups.

**Relationships (Text):**  
Referenced by `ACT_ID_MEMBERSHIP`, `ACT_RU_IDENTITYLINK`, `ACT_RU_AUTHORIZATION`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Group id (PK). |
| NAME_ | VARCHAR | Group name. |
| TYPE_ | VARCHAR | Group type. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_ID_MEMBERSHIP

**Table Summary (Text):**  
Maps users to groups (membership). Inserted when membership created. Primary key is composite of `USER_ID_` and `GROUP_ID_`. Used for group-based permissions and candidate group resolution.

**Relationships (Text):**  
References `ACT_ID_USER` and `ACT_ID_GROUP`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| USER_ID_ | VARCHAR | User id (FK). |
| GROUP_ID_ | VARCHAR | Group id (FK). |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_ID_INFO

**Table Summary (Text):**  
Stores additional identity information (key/value) for users or groups. Inserted/updated by identity management. Primary key `ID_`. Used to store custom identity attributes.

**Relationships (Text):**  
References `ACT_ID_USER` or `ACT_ID_GROUP` via owner fields.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Info id (PK). |
| USER_ID_ | VARCHAR | User id if applicable. |
| KEY_ | VARCHAR | Info key. |
| VALUE_ | VARCHAR | Info value. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### ACT_ID_TENANT

**Table Summary (Text):**  
Stores tenant definitions for multi-tenancy. Inserted/updated by tenant management. Primary key `ID_`. Used to scope resources and enforce tenant isolation.

**Relationships (Text):**  
Referenced by many tables via `TENANT_ID_`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Tenant id (PK). |
| NAME_ | VARCHAR | Tenant name. |

---

### ACT_ID_TENANT_MEMBER

**Table Summary (Text):**  
Maps users to tenants. Inserted when tenant membership is created. Primary key composite of `TENANT_ID_` and `USER_ID_`. Used for tenant-scoped identity and access.

**Relationships (Text):**  
References `ACT_ID_TENANT` and `ACT_ID_USER`.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| TENANT_ID_ | VARCHAR | Tenant id (FK). |
| USER_ID_ | VARCHAR | User id (FK). |

---

## Chapter 6 — Authorization Tables

---

### ACT_RU_AUTHORIZATION (see Runtime section)

**Table Summary (Text):**  
Runtime authorizations for resources and permissions. Inserted/updated by admin operations. Primary key `ID_`. Used by engine to enforce access control.

**Relationships (Text):**  
References identity tables and resource ids; used by runtime permission checks.

#### Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Authorization id (PK). |
| REV_ | INTEGER | Revision. |
| TYPE_ | INTEGER | Authorization type. |
| USER_ID_ | VARCHAR | User id. |
| GROUP_ID_ | VARCHAR | Group id. |
| RESOURCE_TYPE_ | INTEGER | Resource type code. |
| RESOURCE_ID_ | VARCHAR | Resource id. |
| PERMISSIONS_ | INTEGER | Permissions bitmask. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

## Chapter 7 — Metrics & Other Tables (Optional / Plugin)

---

### ACT_RU_METER_LOG / ACT_METER_* (optional)

**Table Summary (Text):**  
Optional metrics tables used by monitoring plugins or distributions. Store engine metrics, counters, and time-series data. Presence depends on distribution and configuration.

**Relationships (Text):**  
Often independent; may reference deployments or process definitions for tagging.

#### Typical Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Metric id (PK). |
| NAME_ | VARCHAR | Metric name. |
| TIMESTAMP_ | TIMESTAMP | Metric timestamp. |
| VALUE_ | NUMERIC | Metric value. |
| TAGS_ | VARCHAR | Tags or labels. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

### Plugin / Extension Tables (ACT_PLUGIN_* optional)

**Table Summary (Text):**  
Custom tables created by plugins (audit, reporting, connectors). Not part of core Camunda schema; structure varies by plugin. Inserted/updated by plugin logic.

**Relationships (Text):**  
Plugin-specific; may reference core tables.

#### Typical Columns

| Column | Data Type | Description |
| ------ | --------- | ----------- |
| ID_ | VARCHAR | Plugin record id. |
| PAYLOAD_ | CLOB/BLOB | Plugin data. |
| CREATED_ | TIMESTAMP | Creation time. |
| TENANT_ID_ | VARCHAR | Tenant id. |

---

