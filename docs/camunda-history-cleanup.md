# 1. What is History Cleanup?

History Cleanup **only deletes historical (ACT_HI_*) data**. It **never deletes runtime (ACT_RU_*) data**.

When a process instance finishes:

```
Runtime Tables (ACT_RU_*)
        │
        │ Process Completed
        ▼
History Tables (ACT_HI_*)
        │
        │ TTL expires
        ▼
History Cleanup Job
        │
        ▼
Delete Historical Data
```

Example:

```
Process finished : 15-Jan-2026
TTL = 30 days

Removal Date = 14-Feb-2026

History Cleanup Job
        ↓
Delete process history
```

---

# 2. How is History Cleanup triggered?

There are **2 ways**.

## Option 1 (Automatic)

The Process Engine automatically creates a **History Cleanup Job**.

This job is executed by the **Job Executor**.

No BPMN workflow is involved.

```
Process Engine

        │
        ▼

History Cleanup Scheduler

        │

creates Job

        ▼

ACT_RU_JOB

        │

Job Executor

        ▼

HistoryCleanupCmd

        ▼

DELETE SQL
```

The cleanup runs only inside the configured cleanup window (for example 2 AM–5 AM). ([Cibseven Docs][1])

---

## Option 2 (Manual REST API)

```
POST

/history/cleanup
```

Example

```
POST
http://localhost:8080/engine-rest/history/cleanup
```

or

```
POST
/engine/default/history/cleanup
```

Parameter

```
immediatelyDue=true
```

means execute as soon as possible.

```
immediatelyDue=false
```

means wait until next cleanup window. ([Cibseven Docs][2])

---

# 3. Does workflow call this API?

**No.**

Your BPMN process **never calls** history cleanup.

Typical flow:

```
Workflow Finish

↓

History Written

↓

Wait TTL

↓

History Cleanup Job

↓

Delete History
```

There is **no Service Task**, **Execution Listener**, or **Task Listener** that invokes cleanup automatically.

---

# 4. Which Java classes perform cleanup?

Internally, the Process Engine executes cleanup commands.

Main components include:

```
HistoryService

↓

HistoryCleanupCmd

↓

HistoryCleanupJobHandler

↓

Job Executor

↓

DbEntityManager

↓

DELETE SQL
```

The documentation specifically mentions:

```
HistoryService.findHistoryCleanupJobs()
```

to retrieve cleanup jobs, and the cleanup itself is executed as a background job by the Job Executor. ([Cibseven Docs][1])

---

# 5. What tables are deleted?

The cleanup starts with a top-level historic instance (such as a completed process instance) and removes all related history records.

Typical history tables affected include:

| Table               | Deleted? | Description                                           |
| ------------------- | -------- | ----------------------------------------------------- |
| ACT_HI_PROCINST     | ✅        | Historic process instance                             |
| ACT_HI_ACTINST      | ✅        | Historic activity instances                           |
| ACT_HI_TASKINST     | ✅        | Historic task instances                               |
| ACT_HI_VARINST      | ✅        | Historic variables                                    |
| ACT_HI_DETAIL       | ✅        | Variable update history                               |
| ACT_HI_COMMENT      | ✅        | Comments                                              |
| ACT_HI_ATTACHMENT   | ✅        | Attachments                                           |
| ACT_HI_INCIDENT     | ✅        | Historic incidents                                    |
| ACT_HI_JOB_LOG      | ✅        | Historic job logs (depending on cleanup strategy/TTL) |
| ACT_HI_OP_LOG       | ✅        | User operation log (when eligible)                    |
| ACT_HI_IDENTITYLINK | ✅        | Historic identity links                               |
| ACT_HI_EXT_TASK_LOG | ✅        | External task logs                                    |
| ACT_HI_DECINST      | ✅        | Decision history                                      |
| ACT_HI_DEC_IN       | ✅        | Decision input                                        |
| ACT_HI_DEC_OUT      | ✅        | Decision output                                       |
| ACT_HI_BATCH        | ✅        | Historic batch information                            |

The documentation summarizes this as deleting the historic process instance **plus all related historic data**, including variables, tasks, comments, attachments, decision history, case history, and batch history. ([Cibseven Docs][1])

---

# 6. Does it delete Runtime tables?

**No.**

These remain unaffected:

```
ACT_RU_EXECUTION
ACT_RU_TASK
ACT_RU_VARIABLE
ACT_RU_JOB
ACT_RU_EVENT_SUBSCR
```

Only historical tables are cleaned.

---

# 7. What SQL does it execute?

The documentation explains two strategies.

### Removal-Time strategy (Recommended)

Every history table stores a `REMOVAL_TIME_`.

Cleanup is essentially:

```sql
DELETE
FROM ACT_HI_VARINST
WHERE REMOVAL_TIME_ < NOW();
```

Similar deletes occur for the other history tables.

This is fast because it filters directly by `REMOVAL_TIME_`. ([Cibseven Docs][1])

---

### End-Time strategy

The engine first identifies expired process instances and then deletes related records from multiple tables using additional queries and joins.

This is slower but works for older data and reacts to TTL changes. ([Cibseven Docs][1])

---

# 8. Can we restore data into another database?

Yes, but **not by calling History Cleanup**.

History Cleanup only performs **DELETE** operations.

Typical migration flow:

```
Production DB

↓

Export ACT_HI_* tables

↓

Backup

↓

Restore into another DB
```

This is a database backup/restore task, not a cleanup feature.

---

# 9. Can History Cleanup restore deleted history?

**No.**

Once cleanup deletes history:

```
History Cleanup

↓

DELETE

↓

Data Gone
```

The only recovery option is restoring from a database backup.

---

# 10. If I migrate history to another database, should I call History Cleanup?

Yes, but only after verifying the archive.

Recommended sequence:

```
Production DB

↓

Export History

↓

Restore to Archive DB

↓

Verify Archive

↓

Call History Cleanup

↓

Production History Deleted
```

This is a common archival approach because Camunda/CIB seven has no built-in "move history" feature.

---

# 11. Can I call History Cleanup after every workflow?

Technically yes, by invoking:

```
POST /history/cleanup
```

after each process completes, but it is **not recommended** because:

* Cleanup runs asynchronously as a background job.
* Frequent scheduling increases Job Executor load.
* Cleanup is designed to work in batches and within cleanup windows.

The intended design is scheduled background cleanup, not per-workflow cleanup. ([Cibseven Docs][1])

---

# 12. Overall internal architecture

```text
                Process Instance Completed
                          │
                          ▼
               History Written (ACT_HI_*)
                          │
                          ▼
              Calculate REMOVAL_TIME_ (TTL)
                          │
                          ▼
               History Cleanup Scheduler
                          │
                 creates cleanup job
                          │
                          ▼
                    ACT_RU_JOB
                          │
                    Job Executor
                          │
                          ▼
               HistoryCleanupJobHandler
                          │
                          ▼
                 HistoryCleanupCmd
                          │
                          ▼
                  DELETE SQL Statements
                          │
                          ▼
          ACT_HI_PROCINST
          ACT_HI_ACTINST
          ACT_HI_VARINST
          ACT_HI_TASKINST
          ACT_HI_DETAIL
          ACT_HI_COMMENT
          ACT_HI_ATTACHMENT
          ACT_HI_DECINST
          ACT_HI_BATCH
          ...
```



### How it decides what to delete

When you call:

```http
POST /engine-rest/history/cleanup
```

Camunda does **not** accept parameters like:

```http
processInstanceId=...
processDefinitionId=...
businessKey=...
```

These parameters are **not supported**.

Instead, the cleanup job executes logic similar to:

```sql
SELECT *
FROM ACT_HI_PROCINST
WHERE REMOVAL_TIME_ <= CURRENT_TIMESTAMP;
```

For every expired historic process instance it finds, it deletes:

* Historic process instance (`ACT_HI_PROCINST`)
* Historic activities (`ACT_HI_ACTINST`)
* Historic tasks (`ACT_HI_TASKINST`)
* Historic variables (`ACT_HI_VARINST`)
* Historic details (`ACT_HI_DETAIL`)
* Historic identity links
* Historic comments
* Historic attachments
* Historic incidents
* Historic decision history
* Other related historic records

---

## Example

Suppose your database contains:

| Process Instance | Process Definition | Finished | TTL     | Removal Date | Deleted? |
| ---------------- | ------------------ | -------- | ------- | ------------ | -------- |
| PI-101           | OrderProcess       | 1 Jan    | 30 days | 31 Jan       | ✅ Yes    |
| PI-102           | OrderProcess       | 15 Jan   | 30 days | 14 Feb       | ❌ No     |
| PI-103           | PaymentProcess     | 20 Dec   | 15 days | 4 Jan        | ✅ Yes    |
| PI-104           | InvoiceProcess     | Running  | -       | -            | ❌ No     |

If today's date is **15 Feb**, History Cleanup deletes:

* PI-101
* PI-103

It **doesn't matter** that they belong to different process definitions. The only criterion is that their history has reached its removal date.

---

## Can I delete history for one specific process instance?

**Not with the History Cleanup API.**

If you want to delete a single historic process instance, use the History Service or REST API for deleting historic process instances, for example:

```http
DELETE /history/process-instance/{processInstanceId}
```

This removes history only for that process instance.

---

## Can I delete history for one process definition?

Yes, but **not through History Cleanup**.

You would first query the historic process instances for that process definition and then delete them individually or in batches using the appropriate history deletion APIs.

---

## Summary

| Operation                           | Supported by History Cleanup? |
| ----------------------------------- | ----------------------------- |
| Delete all expired history          | ✅ Yes                         |
| Delete one process instance history | ❌ No                          |
| Delete by Process Definition ID     | ❌ No                          |
| Delete by Business Key              | ❌ No                          |
| Delete only one workflow's history  | ❌ No                          |
| Delete based on TTL/Removal Time    | ✅ Yes                         |




## REST API

### Schedule cleanup immediately

```http
POST /engine-rest/history/cleanup?immediatelyDue=true
Content-Type: application/json
```

Body:

```json
{}
```

or simply **no request body**.

Example using curl:

```bash
curl -X POST \
http://localhost:8080/engine-rest/history/cleanup?immediatelyDue=true
```

---

### Schedule cleanup during the configured batch window

```http
POST /engine-rest/history/cleanup?immediatelyDue=false
```

Example:

```bash
curl -X POST \
http://localhost:8080/engine-rest/history/cleanup?immediatelyDue=false
```

If your cleanup window is configured as:

```
02:00 AM - 05:00 AM
```

then:

* `immediatelyDue=true` → Job is created with the nearest possible due date and the Job Executor can pick it up immediately.
* `immediatelyDue=false` → Job is scheduled for the next configured cleanup window. ([Camunda Documentation][1])

---

# Response

The API returns the cleanup **job**, not the deletion result.

Example:

```json
{
  "id": "074bd92a-1a95-11e7-8ceb-34f39ab71d4e",
  "retries": 3,
  "dueDate": "2026-07-15T02:00:00.000+0530",
  "priority": 0,
  "suspended": false,
  "processInstanceId": null,
  "processDefinitionId": null,
  "executionId": null
}
```

This means:

* Cleanup job has been scheduled.
* No data has been deleted yet.
* The Job Executor will execute it asynchronously. ([Camunda Documentation][1])

---

# Java API equivalent

Internally, the REST API invokes the `HistoryService`.

```java
HistoryService historyService = processEngine.getHistoryService();

// Execute immediately
historyService.cleanUpHistoryAsync(true);

// Execute in batch window
historyService.cleanUpHistoryAsync(false);
```

The REST endpoint is essentially a wrapper around this Java API. ([Camunda Documentation][2])

---

# Check cleanup jobs

To see scheduled cleanup jobs:

```http
GET /engine-rest/history/cleanup/jobs
```

Example response:

```json
[
  {
    "id": "job123",
    "dueDate": "2026-07-15T02:00:00.000+0530",
    "retries": 3,
    "priority": 0
  }
]
```

---

# Check cleanup configuration

```http
GET /engine-rest/history/cleanup/configuration
```

Example response:

```json
{
  "batchWindowStartTime": "02:00",
  "batchWindowEndTime": "05:00",
  "enabled": true
}
```

This tells you when the cleanup jobs are allowed to run. ([Camunda Documentation][1])

---

## End-to-end flow

```text
POST /history/cleanup?immediatelyDue=true
              │
              ▼
HistoryService.cleanUpHistoryAsync(true)
              │
              ▼
HistoryCleanupCmd
              │
              ▼
Create History Cleanup Job
      (ACT_RU_JOB)
              │
              ▼
Job Executor picks the job
              │
              ▼
HistoryCleanupJobHandler
              │
              ▼
Delete expired records from ACT_HI_* tables
              │
              ▼
Cleanup Job Completed
```

# Camunda History cleanup with archive model

Yes, **your solution is possible**, but there is one important limitation:

> **There is no Camunda REST API that says "I have archived this process, now update its removal time and clean up only these instances."**

You have to combine Camunda APIs with your own logic.

---

# Your proposed flow

```text
Workflow Completed
        │
        ▼
History Created (ACT_HI_*)
        │
        ▼
Copy History to Archive DB
        │
        ▼
Verify Archive Success
        │
        ▼
Update Removal Time (optional)
        │
        ▼
Call History Cleanup API
        │
        ▼
Camunda deletes eligible history
        │
        ▼
Job Finished
```

This architecture is valid.

---

# Can I update REMOVAL_TIME_ via API?

## Option 1 - Direct Database Update

Yes.

For example:

```sql
UPDATE ACT_HI_PROCINST
SET REMOVAL_TIME_ = NOW()
WHERE PROC_INST_ID_='123';
```

Then call

```http
POST /engine-rest/history/cleanup?immediatelyDue=true
```

Camunda will see that the removal time has expired and delete it.

This works.

---

## Option 2 - Camunda API

Camunda provides APIs to **set History Time To Live (TTL)** on a **process definition**, not to directly set the `REMOVAL_TIME_` for an individual historic process instance.

Typical flow:

```
Process Definition
        │
History TTL = 30 days
        │
Engine calculates
        ▼
REMOVAL_TIME_
```

It does **not** provide an API like:

```http
POST /history/process-instance/{id}/setRemovalTime
```

for arbitrary archived instances.

---

# Can I change TTL via API?

Yes.

Camunda has APIs to update the **History Time To Live** of a process definition.

Example:

```
PUT /process-definition/{id}/history-time-to-live
```

However:

Changing the TTL **does not automatically change existing historic instances**.

Existing `REMOVAL_TIME_` values remain unchanged unless you explicitly recalculate them.

---

# Can I recalculate removal time via API?

**Yes.**

Camunda provides a **Set Removal Time** operation for historic process instances that can recalculate removal times based on the current TTL (or clear/set them, depending on the options supported by your Camunda version).

Typical flow:

```
Update TTL
        │
        ▼
Recalculate Removal Time
        │
        ▼
Call History Cleanup
```

So your workflow can be entirely API-driven if your Camunda/CIBseven version exposes these endpoints.

---

# Best architecture

Instead of copying **all history** and then cleaning everything, I would build this pipeline:

```text
Workflow Completed
        │
        ▼
Find Historic Process Instance
        │
        ▼
Archive History
        │
        ▼
Archive Successful?
      /      \
    No        Yes
    │          │
Retry     Set Removal Time
              │
              ▼
Trigger History Cleanup
              │
              ▼
Verify Deleted
              │
              ▼
End
```

---

# Can History Cleanup delete only my archived workflows?

**Not directly.**

History Cleanup deletes **every** historic instance whose removal time has expired.

For example:

| Process | Archived | Removal Time | Deleted |
| ------- | -------- | ------------ | ------- |
| P1      | ✅        | Today        | ✅       |
| P2      | ❌        | Next Year    | ❌       |
| P3      | ✅        | Today        | ✅       |
| P4      | ❌        | Tomorrow     | ❌       |

History Cleanup doesn't know which ones you archived. It only checks `REMOVAL_TIME_`.

---

# My recommendation

Since you're building an archive service, I would **not** rely on changing the process definition TTL. Instead:

1. Detect completed historic process instances.
2. Copy all related `ACT_HI_*` records to the archive database.
3. Verify the archive.
4. Update the archived instances' `REMOVAL_TIME_` (or use the Set Removal Time API if available in your version).
5. Call the History Cleanup API.
6. Camunda deletes only the instances whose removal time has expired.

This gives you complete control over which histories are removed while leaving the rest untouched.



Yes. **Camunda stores logs for History Cleanup**, but **it does not create a dedicated "history cleanup log" table**. The information is spread across several places.

## 1. Engine Logs (Application Logs) ✅

The most detailed cleanup information is written to the application logs (e.g., Logback, Log4j).

Typical messages include:

* History cleanup started
* Cleanup finished
* Number of deleted entries
* Cleanup duration
* Batch size
* Errors, if any

Example:

```text
ENGINE-14014 History cleanup started.
ENGINE-14015 Removed 1250 historic process instances.
ENGINE-14016 History cleanup finished.
```

---

## 2. ACT_HI_JOB_LOG ✅

History Cleanup runs as a **background job**. Execution of that job is recorded in `ACT_HI_JOB_LOG`.

Typical information includes:

* Job execution time
* Job success/failure
* Exception message (if failed)
* Retries
* Job ID

**It does not contain:**

* Number of rows deleted
* Table names cleaned
* Process instance IDs deleted

---

## 3. ACT_RU_JOB

While the cleanup job is waiting to execute, it exists in runtime job tables such as:

* `ACT_RU_JOB`
* `ACT_RU_TIMER_JOB` (depending on configuration)

Once executed successfully, it is removed from runtime and its execution is reflected in `ACT_HI_JOB_LOG`.

---

## 4. User Operation Log (`ACT_HI_OP_LOG`) ❌

History Cleanup itself **is not recorded** as a user operation.

This table records actions like:

* Delete Process Instance
* Suspend Process Definition
* Set Retries
* Change Job Priority

It does **not** log automatic TTL cleanup executions.

---

## 5. History Tables

Camunda does **not** keep an audit trail of deleted history rows. After cleanup:

* The records are deleted.
* There is no built-in table listing which history records were removed.

---

## 6. TTL Information

The configured TTL is **not stored per cleanup execution**.

TTL values are defined on BPMN/DMN/CMMN definitions (or via API) and used to calculate the `REMOVAL_TIME_` for history records. Cleanup simply deletes records whose `REMOVAL_TIME_` has passed.

---

## Summary

| Information                  | Stored?    | Location                                                |
| ---------------------------- | ---------- | ------------------------------------------------------- |
| Cleanup job execution        | ✅          | `ACT_HI_JOB_LOG`                                        |
| Cleanup start/end messages   | ✅          | Application logs                                        |
| Cleanup failures             | ✅          | `ACT_HI_JOB_LOG`, application logs                      |
| Deleted record count         | ✅          | Application logs (not database tables)                  |
| Deleted process instance IDs | ❌          | Not stored                                              |
| Deleted history table names  | ❌          | Not stored                                              |
| TTL value used for cleanup   | Indirectly | Process definition / `REMOVAL_TIME_` on history records |
| Audit of deleted history     | ❌          | Not available                                           |

### If you need a complete audit

Camunda does not provide one out of the box. A common approach is:

1. Archive the `ACT_HI_*` records (and referenced `ACT_GE_BYTEARRAY` rows) before cleanup.
2. Record your own audit entry (e.g., cleanup start time, end time, process definition, number of archived rows).
3. Trigger History Cleanup.
4. Verify the cleanup completed successfully using `ACT_HI_JOB_LOG` and/or application logs.

This provides a reliable audit trail even though Camunda itself does not retain details of the deleted history records.
