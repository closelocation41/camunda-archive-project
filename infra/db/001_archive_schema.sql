CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS arc_archive_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type varchar(64) NOT NULL,
  status varchar(32) NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  selected_count bigint NOT NULL DEFAULT 0,
  archived_count bigint NOT NULL DEFAULT 0,
  skipped_count bigint NOT NULL DEFAULT 0,
  failed_count bigint NOT NULL DEFAULT 0,
  error_message text,
  created_by varchar(128) NOT NULL DEFAULT 'scheduler'
);

CREATE TABLE IF NOT EXISTS archive_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type varchar(64) NOT NULL,
  workflow_type varchar(64) NOT NULL DEFAULT 'COMPLETED_TO_ARCHIVE',
  job_rule varchar(64) NOT NULL DEFAULT 'CURRENT',
  job_name varchar(255) NOT NULL,
  scheduled_start_time timestamptz NOT NULL,
  date_range_start timestamptz,
  date_range_end timestamptz,
  selected_workflow_count integer NOT NULL DEFAULT 0,
  eligible_workflow_count integer NOT NULL DEFAULT 0,
  processing_mode varchar(32) NOT NULL DEFAULT 'SEQUENTIAL',
  status varchar(32) NOT NULL DEFAULT 'SCHEDULED',
  created_by varchar(128) NOT NULL DEFAULT 'operator',
  completed_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  in_progress_count integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  retry_count integer NOT NULL DEFAULT 0,
  last_error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS archive_job_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_job_id uuid NOT NULL REFERENCES archive_job(id) ON DELETE CASCADE,
  process_instance_id varchar(64) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  retry_count integer NOT NULL DEFAULT 0,
  last_error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS archive_job_retry_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_job_id uuid NOT NULL REFERENCES archive_job(id) ON DELETE CASCADE,
  archive_job_item_id uuid REFERENCES archive_job_item(id) ON DELETE SET NULL,
  attempt_number integer NOT NULL,
  status varchar(32) NOT NULL,
  error_message text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arc_restore_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_proc_inst_id varchar(64) NOT NULL,
  restored_proc_inst_id varchar(64),
  root_proc_inst_id varchar(64),
  super_proc_inst_id varchar(64),
  status varchar(32) NOT NULL,
  reason text NOT NULL,
  requested_by varchar(128) NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS arc_proc_inst_mapping (
  original_proc_inst_id varchar(64) PRIMARY KEY,
  restored_proc_inst_id varchar(64) NOT NULL,
  restore_log_id uuid NOT NULL REFERENCES arc_restore_log(id),
  restored_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor varchar(128) NOT NULL,
  action varchar(128) NOT NULL,
  resource_type varchar(128) NOT NULL,
  resource_id varchar(128),
  ip_address inet,
  user_agent text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arc_workflow_note (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proc_inst_id varchar(64) NOT NULL,
  note text NOT NULL,
  created_by varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_procinst (
  id_ varchar(64) NOT NULL,
  proc_inst_id_ varchar(64) NOT NULL,
  business_key_ varchar(255),
  proc_def_key_ varchar(255),
  proc_def_id_ varchar(64),
  start_time_ timestamp NOT NULL,
  end_time_ timestamp,
  removal_time_ timestamp,
  duration_ bigint,
  start_user_id_ varchar(255),
  start_act_id_ varchar(255),
  end_act_id_ varchar(255),
  super_process_instance_id_ varchar(64),
  root_proc_inst_id_ varchar(64),
  super_case_instance_id_ varchar(64),
  case_inst_id_ varchar(64),
  delete_reason_ varchar(4000),
  tenant_id_ varchar(64),
  state_ varchar(255),
  restarted_proc_inst_id_ varchar(64),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz,
  PRIMARY KEY (id_)
) PARTITION BY RANGE (start_time_);

CREATE TABLE IF NOT EXISTS act_hi_procinst_default
  PARTITION OF act_hi_procinst DEFAULT;

CREATE TABLE IF NOT EXISTS act_hi_actinst (
  id_ varchar(64) PRIMARY KEY,
  parent_act_inst_id_ varchar(64),
  proc_def_key_ varchar(255),
  proc_def_id_ varchar(64),
  proc_inst_id_ varchar(64) NOT NULL,
  execution_id_ varchar(64),
  act_id_ varchar(255) NOT NULL,
  task_id_ varchar(64),
  call_proc_inst_id_ varchar(64),
  call_case_inst_id_ varchar(64),
  act_name_ varchar(255),
  act_type_ varchar(255),
  assignee_ varchar(255),
  start_time_ timestamp NOT NULL,
  end_time_ timestamp,
  duration_ bigint,
  act_inst_state_ integer,
  sequence_counter_ bigint,
  tenant_id_ varchar(64),
  removal_time_ timestamp,
  root_proc_inst_id_ varchar(64),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_taskinst (
  id_ varchar(64) PRIMARY KEY,
  task_def_key_ varchar(255),
  proc_def_key_ varchar(255),
  proc_def_id_ varchar(64),
  proc_inst_id_ varchar(64),
  execution_id_ varchar(64),
  case_def_key_ varchar(255),
  case_def_id_ varchar(64),
  case_inst_id_ varchar(64),
  case_execution_id_ varchar(64),
  act_inst_id_ varchar(64),
  name_ varchar(255),
  parent_task_id_ varchar(64),
  description_ varchar(4000),
  owner_ varchar(255),
  assignee_ varchar(255),
  start_time_ timestamp NOT NULL,
  end_time_ timestamp,
  duration_ bigint,
  delete_reason_ varchar(4000),
  priority_ integer,
  due_date_ timestamp,
  follow_up_date_ timestamp,
  tenant_id_ varchar(64),
  removal_time_ timestamp,
  task_state_ varchar(64),
  root_proc_inst_id_ varchar(64),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_varinst (
  id_ varchar(64) PRIMARY KEY,
  proc_def_key_ varchar(255),
  proc_def_id_ varchar(64),
  root_proc_inst_id_ varchar(64),
  proc_inst_id_ varchar(64),
  execution_id_ varchar(64),
  act_inst_id_ varchar(64),
  case_def_key_ varchar(255),
  case_def_id_ varchar(64),
  case_inst_id_ varchar(64),
  case_execution_id_ varchar(64),
  task_id_ varchar(64),
  name_ varchar(255) NOT NULL,
  var_type_ varchar(100),
  rev_ integer,
  bytearray_id_ varchar(64),
  double_ double precision,
  long_ bigint,
  text_ text,
  text2_ text,
  state_ varchar(64),
  create_time_ timestamptz,
  removal_time_ timestamptz,
  tenant_id_ varchar(64),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_detail (
  id_ varchar(64) PRIMARY KEY,
  type_ varchar(255) NOT NULL,
  proc_def_key_ varchar(255),
  proc_def_id_ varchar(64),
  root_proc_inst_id_ varchar(64),
  proc_inst_id_ varchar(64),
  execution_id_ varchar(64),
  case_def_key_ varchar(255),
  case_def_id_ varchar(64),
  case_inst_id_ varchar(64),
  case_execution_id_ varchar(64),
  task_id_ varchar(64),
  act_inst_id_ varchar(64),
  var_inst_id_ varchar(64),
  name_ varchar(255),
  var_type_ varchar(255),
  rev_ integer,
  time_ timestamp NOT NULL,
  bytearray_id_ varchar(64),
  double_ double precision,
  long_ bigint,
  text_ varchar(4000),
  text2_ varchar(4000),
  sequence_counter_ bigint,
  tenant_id_ varchar(64),
  operation_id_ varchar(64),
  removal_time_ timestamp,
  initial_ boolean,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_incident (
  id_ varchar(64) PRIMARY KEY,
  proc_def_key_ varchar(255),
  proc_def_id_ varchar(64),
  root_proc_inst_id_ varchar(64),
  proc_inst_id_ varchar(64),
  execution_id_ varchar(64),
  create_time_ timestamp NOT NULL,
  end_time_ timestamp,
  incident_msg_ varchar(4000),
  incident_type_ varchar(255),
  activity_id_ varchar(255),
  cause_incident_id_ varchar(64),
  root_cause_incident_id_ varchar(64),
  configuration_ varchar(255),
  incident_state_ integer,
  tenant_id_ varchar(64),
  job_def_id_ varchar(64),
  annotation_ varchar(4000),
  removal_time_ timestamp,
  history_configuration_ varchar(255),
  failed_activity_id_ varchar(255),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_job_log (
  id_ varchar(64) PRIMARY KEY,
  timestamp_ timestamp NOT NULL,
  job_id_ varchar(64),
  job_duedate_ timestamp,
  job_retries_ integer,
  job_priority_ bigint,
  job_exception_msg_ varchar(4000),
  job_exception_stack_id_ varchar(64),
  job_state_ integer,
  job_def_id_ varchar(64),
  job_def_type_ varchar(255),
  job_def_configuration_ varchar(255),
  act_id_ varchar(255),
  failed_act_id_ varchar(255),
  execution_id_ varchar(64),
  root_proc_inst_id_ varchar(64),
  process_instance_id_ varchar(64),
  process_def_id_ varchar(64),
  process_def_key_ varchar(255),
  deployment_id_ varchar(64),
  sequence_counter_ bigint,
  tenant_id_ varchar(64),
  hostname_ varchar(255),
  removal_time_ timestamp,
  batch_id_ varchar(64),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_ge_bytearray (
  id_ varchar(64) PRIMARY KEY,
  rev_ integer,
  name_ varchar(255),
  deployment_id_ varchar(64),
  bytes_ bytea,
  generated_ boolean,
  tenant_id_ varchar(64),
  type_ integer,
  create_time_ timestamptz,
  root_proc_inst_id_ varchar(64),
  removal_time_ timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_op_log (
  id_ varchar(64) PRIMARY KEY,
  deployment_id_ varchar(64),
  proc_def_id_ varchar(64),
  proc_def_key_ varchar(255),
  root_proc_inst_id_ varchar(64),
  proc_inst_id_ varchar(64),
  execution_id_ varchar(64),
  case_def_id_ varchar(64),
  case_inst_id_ varchar(64),
  case_execution_id_ varchar(64),
  task_id_ varchar(64),
  job_id_ varchar(64),
  job_def_id_ varchar(64),
  batch_id_ varchar(64),
  user_id_ varchar(255),
  timestamp_ timestamp NOT NULL,
  operation_type_ varchar(64),
  operation_id_ varchar(64),
  entity_type_ varchar(30),
  property_ varchar(64),
  org_value_ varchar(4000),
  new_value_ varchar(4000),
  tenant_id_ varchar(64),
  removal_time_ timestamp,
  category_ varchar(64),
  external_task_id_ varchar(64),
  annotation_ varchar(4000),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_attachment (
  id_ varchar(64) PRIMARY KEY,
  rev_ integer,
  user_id_ varchar(255),
  name_ varchar(255),
  description_ text,
  type_ varchar(255),
  task_id_ varchar(64),
  root_proc_inst_id_ varchar(64),
  proc_inst_id_ varchar(64),
  url_ text,
  content_id_ varchar(64),
  tenant_id_ varchar(64),
  create_time_ timestamptz,
  removal_time_ timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_comment (
  id_ varchar(64) PRIMARY KEY,
  type_ varchar(255),
  time_ timestamptz NOT NULL,
  user_id_ varchar(255),
  task_id_ varchar(64),
  root_proc_inst_id_ varchar(64),
  proc_inst_id_ varchar(64),
  action_ varchar(255),
  message_ text,
  full_msg_ bytea,
  tenant_id_ varchar(64),
  removal_time_ timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_identitylink (
  id_ varchar(64) PRIMARY KEY,
  timestamp_ timestamptz NOT NULL,
  type_ varchar(255),
  user_id_ varchar(255),
  group_id_ varchar(255),
  task_id_ varchar(64),
  root_proc_inst_id_ varchar(64),
  proc_def_id_ varchar(64),
  operation_type_ varchar(255),
  assigner_id_ varchar(255),
  proc_def_key_ varchar(255),
  tenant_id_ varchar(64),
  removal_time_ timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_caseinst (
  id_ varchar(64) PRIMARY KEY,
  case_inst_id_ varchar(64) NOT NULL,
  business_key_ varchar(255),
  case_def_id_ varchar(64) NOT NULL,
  create_time_ timestamptz NOT NULL,
  close_time_ timestamptz,
  duration_ bigint,
  state_ integer,
  create_user_id_ varchar(255),
  super_case_instance_id_ varchar(64),
  super_process_instance_id_ varchar(64),
  tenant_id_ varchar(64),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_caseactinst (
  id_ varchar(64) PRIMARY KEY,
  parent_act_inst_id_ varchar(64),
  case_def_id_ varchar(64) NOT NULL,
  case_inst_id_ varchar(64) NOT NULL,
  case_act_id_ varchar(255) NOT NULL,
  task_id_ varchar(64),
  call_proc_inst_id_ varchar(64),
  call_case_inst_id_ varchar(64),
  case_act_name_ varchar(255),
  case_act_type_ varchar(255),
  create_time_ timestamptz NOT NULL,
  end_time_ timestamptz,
  duration_ bigint,
  state_ integer,
  required_ boolean,
  tenant_id_ varchar(64),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_decinst (
  id_ varchar(64) PRIMARY KEY,
  dec_def_id_ varchar(64) NOT NULL,
  dec_def_key_ varchar(255) NOT NULL,
  dec_def_name_ varchar(255),
  proc_def_key_ varchar(255),
  proc_def_id_ varchar(64),
  proc_inst_id_ varchar(64),
  case_def_key_ varchar(255),
  case_def_id_ varchar(64),
  case_inst_id_ varchar(64),
  act_inst_id_ varchar(64),
  act_id_ varchar(255),
  eval_time_ timestamptz NOT NULL,
  removal_time_ timestamptz,
  collect_value_ double precision,
  user_id_ varchar(255),
  root_dec_inst_id_ varchar(64),
  root_proc_inst_id_ varchar(64),
  dec_req_id_ varchar(64),
  dec_req_key_ varchar(255),
  tenant_id_ varchar(64),
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_dec_in (
  id_ varchar(64) PRIMARY KEY,
  dec_inst_id_ varchar(64) NOT NULL,
  clause_id_ varchar(64),
  clause_name_ varchar(255),
  var_type_ varchar(100),
  bytearray_id_ varchar(64),
  double_ double precision,
  long_ bigint,
  text_ varchar(4000),
  text2_ varchar(4000),
  tenant_id_ varchar(64),
  create_time_ timestamptz,
  root_proc_inst_id_ varchar(64),
  removal_time_ timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_dec_out (
  id_ varchar(64) PRIMARY KEY,
  dec_inst_id_ varchar(64) NOT NULL,
  clause_id_ varchar(64),
  clause_name_ varchar(255),
  rule_id_ varchar(64),
  rule_order_ integer,
  var_name_ varchar(255),
  var_type_ varchar(100),
  bytearray_id_ varchar(64),
  double_ double precision,
  long_ bigint,
  text_ varchar(4000),
  text2_ varchar(4000),
  tenant_id_ varchar(64),
  create_time_ timestamptz,
  root_proc_inst_id_ varchar(64),
  removal_time_ timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_ext_task_log (
  id_ varchar(64) PRIMARY KEY,
  timestamp_ timestamptz NOT NULL,
  ext_task_id_ varchar(64) NOT NULL,
  retries_ integer,
  topic_name_ varchar(255),
  worker_id_ varchar(255),
  priority_ bigint NOT NULL DEFAULT 0,
  error_msg_ varchar(4000),
  error_details_id_ varchar(64),
  act_id_ varchar(255),
  act_inst_id_ varchar(64),
  execution_id_ varchar(64),
  proc_inst_id_ varchar(64),
  root_proc_inst_id_ varchar(64),
  proc_def_id_ varchar(64),
  proc_def_key_ varchar(255),
  tenant_id_ varchar(64),
  state_ integer,
  removal_time_ timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS act_hi_batch (
  id_ varchar(64) PRIMARY KEY,
  type_ varchar(255),
  total_jobs_ integer,
  jobs_per_seed_ integer,
  invocations_per_job_ integer,
  seed_job_def_id_ varchar(64),
  monitor_job_def_id_ varchar(64),
  batch_job_def_id_ varchar(64),
  tenant_id_ varchar(64),
  create_user_id_ varchar(255),
  start_time_ timestamptz NOT NULL,
  end_time_ timestamptz,
  removal_time_ timestamptz,
  exec_start_time_ timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_run_id uuid REFERENCES arc_archive_run(id),
  soft_deleted_at timestamptz
);

DO $$
BEGIN
  ALTER TABLE act_hi_procinst ADD COLUMN IF NOT EXISTS restarted_proc_inst_id_ varchar(64);
  ALTER TABLE act_hi_taskinst ADD COLUMN IF NOT EXISTS task_state_ varchar(64);
  ALTER TABLE act_hi_detail ADD COLUMN IF NOT EXISTS var_inst_id_ varchar(64);
  ALTER TABLE act_hi_detail ADD COLUMN IF NOT EXISTS sequence_counter_ bigint;
  ALTER TABLE act_hi_incident ADD COLUMN IF NOT EXISTS annotation_ varchar(4000);
  ALTER TABLE act_hi_job_log ADD COLUMN IF NOT EXISTS act_id_ varchar(255);
  ALTER TABLE act_hi_job_log ADD COLUMN IF NOT EXISTS batch_id_ varchar(64);
  ALTER TABLE act_hi_op_log ADD COLUMN IF NOT EXISTS annotation_ varchar(4000);
END $$;

DO $$
BEGIN
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS workflow_type varchar(64) NOT NULL DEFAULT 'COMPLETED_TO_ARCHIVE';
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS job_rule varchar(64) NOT NULL DEFAULT 'CURRENT';
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS eligible_workflow_count integer NOT NULL DEFAULT 0;
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS processing_mode varchar(32) NOT NULL DEFAULT 'SEQUENTIAL';
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS status varchar(32) NOT NULL DEFAULT 'SCHEDULED';
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS created_by varchar(128) NOT NULL DEFAULT 'operator';
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS completed_count integer NOT NULL DEFAULT 0;
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS failed_count integer NOT NULL DEFAULT 0;
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS in_progress_count integer NOT NULL DEFAULT 0;
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS pending_count integer NOT NULL DEFAULT 0;
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS last_error_message text;
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS started_at timestamptz;
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS finished_at timestamptz;
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
  ALTER TABLE archive_job ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_arc_procinst_proc_def_key ON act_hi_procinst (proc_def_key_);
CREATE INDEX IF NOT EXISTS idx_arc_procinst_business_key ON act_hi_procinst (business_key_);
CREATE INDEX IF NOT EXISTS idx_arc_procinst_end_time ON act_hi_procinst (end_time_);
CREATE INDEX IF NOT EXISTS idx_arc_procinst_state ON act_hi_procinst (state_);
CREATE INDEX IF NOT EXISTS idx_arc_procinst_root ON act_hi_procinst (root_proc_inst_id_);
CREATE INDEX IF NOT EXISTS idx_arc_procinst_super ON act_hi_procinst (super_process_instance_id_);
CREATE INDEX IF NOT EXISTS idx_arc_actinst_proc ON act_hi_actinst (proc_inst_id_, start_time_);
CREATE INDEX IF NOT EXISTS idx_arc_task_proc ON act_hi_taskinst (proc_inst_id_, start_time_);
CREATE INDEX IF NOT EXISTS idx_arc_var_proc_name ON act_hi_varinst (proc_inst_id_, name_);
CREATE INDEX IF NOT EXISTS idx_arc_detail_proc_time ON act_hi_detail (proc_inst_id_, time_);
CREATE INDEX IF NOT EXISTS idx_arc_incident_proc ON act_hi_incident (proc_inst_id_, create_time_);
CREATE INDEX IF NOT EXISTS idx_arc_job_log_proc ON act_hi_job_log (process_instance_id_, timestamp_);
CREATE INDEX IF NOT EXISTS idx_arc_op_log_proc ON act_hi_op_log (proc_inst_id_, timestamp_);
CREATE INDEX IF NOT EXISTS idx_arc_restore_original ON arc_restore_log (original_proc_inst_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_arc_audit_created ON arc_audit_log (created_at DESC);
