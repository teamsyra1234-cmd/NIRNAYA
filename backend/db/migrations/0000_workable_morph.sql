CREATE TABLE `connectors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner` text NOT NULL,
	`status` text NOT NULL,
	`governance_status` text NOT NULL,
	`purpose` text NOT NULL,
	`endpoint` text NOT NULL,
	`refresh` text NOT NULL,
	`auth_type` text NOT NULL,
	`documentation_url` text,
	`contract_details` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dashboard_metrics` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`delta` text NOT NULL,
	`label` text NOT NULL,
	`tone` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `districts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`state` text NOT NULL,
	`area_sq_km` integer NOT NULL,
	`composite_risk` integer NOT NULL,
	`risk_level` text NOT NULL,
	`groundwater_stress` integer NOT NULL,
	`built_up_expansion` integer NOT NULL,
	`livelihood_sensitivity` integer NOT NULL,
	`data_completeness` integer NOT NULL,
	`land_dispute_intensity` integer NOT NULL,
	`datasets_combined` integer DEFAULT 5 NOT NULL,
	`key_sources` text NOT NULL,
	`notes` text,
	`svg_region_class` text
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`authority` text NOT NULL,
	`year` integer NOT NULL,
	`geography` text NOT NULL,
	`state` text,
	`district` text,
	`score` integer NOT NULL,
	`summary` text NOT NULL,
	`tags` text NOT NULL,
	`source_url` text NOT NULL,
	`checksum` text NOT NULL,
	`provenance_date` text NOT NULL,
	`verified` integer DEFAULT 1 NOT NULL,
	`citation` text,
	`methodology_note` text
);
--> statement-breakpoint
CREATE TABLE `policy_studies` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`state` text NOT NULL,
	`district` text,
	`stage` text NOT NULL,
	`stage_key` text NOT NULL,
	`readiness_score` integer NOT NULL,
	`owner` text NOT NULL,
	`summary` text NOT NULL,
	`priority` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scenario_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`study_id` text,
	`geography_id` text,
	`conservation` integer NOT NULL,
	`livelihood` integer NOT NULL,
	`feasibility` integer NOT NULL,
	`water` integer NOT NULL,
	`score` integer NOT NULL,
	`method` text NOT NULL,
	`recommendation` text NOT NULL,
	`impacts` text NOT NULL,
	`assumptions` text NOT NULL,
	`evidence_snapshot` text NOT NULL,
	`created_at` text NOT NULL
);
