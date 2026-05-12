-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "password" TEXT,
    "name" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "auth_provider" TEXT NOT NULL DEFAULT 'email',
    "organization_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "annual_revenue_tier" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "logo_url" TEXT,
    "subscription_tier" TEXT NOT NULL DEFAULT 'starter',
    "subscription_status" TEXT NOT NULL DEFAULT 'trial',
    "customer_stage" TEXT NOT NULL DEFAULT 'lead',
    "stage_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage_completed_at" TIMESTAMP(3),
    "next_stage_prompted_at" TIMESTAMP(3),
    "source_lead_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "from_stage" TEXT,
    "to_stage" TEXT NOT NULL,
    "triggered_by" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journey_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "industry_category" TEXT,
    "industry_subtype" TEXT,
    "region" TEXT,
    "business_size" TEXT,
    "years_in_business" INTEGER,
    "notification_email" BOOLEAN NOT NULL DEFAULT true,
    "weekly_digest" BOOLEAN NOT NULL DEFAULT true,
    "proactive_insights" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "has_website" BOOLEAN NOT NULL DEFAULT false,
    "website_url" TEXT,
    "industry" TEXT,
    "challenges" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "analysis_score" INTEGER,
    "analysis_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "nurture_status" TEXT NOT NULL DEFAULT 'new',
    "nurture_step" INTEGER NOT NULL DEFAULT 0,
    "last_nurture_at" TIMESTAMP(3),
    "next_nurture_at" TIMESTAMP(3),
    "converted_to_org_id" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "processor" TEXT NOT NULL DEFAULT 'stripe',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "square_customer_id" TEXT,
    "square_subscription_id" TEXT,
    "square_card_id" TEXT,
    "square_plan_variation_id" TEXT,
    "square_payment_link_id" TEXT,
    "square_payment_link_url" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "price_monthly" INTEGER NOT NULL DEFAULT 0,
    "trial_start_date" TIMESTAMP(3),
    "trial_end_date" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_off_charges" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "square_payment_link_id" TEXT,
    "square_payment_link_url" TEXT,
    "square_order_id" TEXT,
    "square_payment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "metadata" TEXT,
    "change_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_off_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "success_fee_billings" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "recovered_amount" INTEGER NOT NULL,
    "fee_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "fee_amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripe_invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "success_fee_billings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_projects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "project_type" TEXT NOT NULL,
    "existing_url" TEXT,
    "desired_features" TEXT,
    "design_preferences" TEXT,
    "target_audience" TEXT,
    "competitors" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_free_build" BOOLEAN NOT NULL DEFAULT false,
    "template_id" TEXT,
    "source_lead_id" TEXT,
    "demo_scheduled_at" TIMESTAMP(3),
    "demo_completed_at" TIMESTAMP(3),
    "demo_outcome" TEXT,
    "deployment_platform" TEXT,
    "deployed_url" TEXT,
    "repository_url" TEXT,
    "estimated_completion" TIMESTAMP(3),
    "actual_completion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'feature',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "is_rush" BOOLEAN NOT NULL DEFAULT false,
    "sla_due_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_notes" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT true,
    "author_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_files" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "industry" TEXT,
    "external_id" TEXT,
    "quickbooks_id" TEXT,
    "xero_id" TEXT,
    "payment_score" INTEGER,
    "payment_behavior_tier" TEXT,
    "avg_days_to_payment" DECIMAL(5,1),
    "total_outstanding" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_invoiced" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "industry_benchmark_delta" INTEGER,
    "preferred_payment_method" TEXT,
    "best_contact_day" TEXT,
    "best_contact_hour" INTEGER,
    "seasonal_payment_pattern" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "due_date" DATE NOT NULL,
    "issue_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "days_overdue" INTEGER NOT NULL DEFAULT 0,
    "external_id" TEXT,
    "quickbooks_id" TEXT,
    "xero_id" TEXT,
    "predicted_payment_date" DATE,
    "recovery_likelihood" DECIMAL(5,4),
    "risk_level" TEXT,
    "recommended_action" TEXT,
    "recommended_action_date" DATE,
    "line_items" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "quickbooks_id" TEXT,
    "xero_id" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_payments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" TEXT,
    "external_id" TEXT,
    "day_of_week" INTEGER,
    "hour_of_day" INTEGER,
    "days_from_due" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "client_id" TEXT,
    "event_type" TEXT NOT NULL,
    "invoice_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recovered_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "days_overdue" INTEGER,
    "days_accelerated" INTEGER,
    "fee_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.08,
    "platform_fee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "attributed_to" TEXT,
    "recommendation_id" TEXT,
    "follow_up_action_id" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmed_at" TIMESTAMP(3),
    "billing_cycle_id" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "total_receivables" DECIMAL(15,2),
    "total_payables" DECIMAL(15,2),
    "overdue_receivables" DECIMAL(15,2),
    "total_overdue" DECIMAL(15,2),
    "overdue_30_days" DECIMAL(15,2),
    "overdue_60_days" DECIMAL(15,2),
    "overdue_90_plus_days" DECIMAL(15,2),
    "projected_inflow_30d" DECIMAL(15,2),
    "projected_outflow_30d" DECIMAL(15,2),
    "projected_inflow_60d" DECIMAL(15,2),
    "projected_outflow_60d" DECIMAL(15,2),
    "projected_inflow_90d" DECIMAL(15,2),
    "projected_outflow_90d" DECIMAL(15,2),
    "forecast_7_day" DECIMAL(15,2),
    "forecast_14_day" DECIMAL(15,2),
    "forecast_30_day" DECIMAL(15,2),
    "predicted_gap_date" DATE,
    "predicted_gap_amount" DECIMAL(15,2),
    "cash_flow_health_score" INTEGER,
    "runway_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_flow_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "client_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation_text" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "confidence" DECIMAL(5,4),
    "confidence_score" DECIMAL(3,2),
    "reasoning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "action_taken_by" TEXT,
    "action_taken_by_id" TEXT,
    "action_taken_at" TIMESTAMP(3),
    "actioned_at" TIMESTAMP(3),
    "actioned_by" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_actions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "client_id" TEXT,
    "assigned_to_id" TEXT,
    "type" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3),
    "action_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "completed_at" TIMESTAMP(3),
    "outcome" TEXT,
    "notes" TEXT,
    "day_of_week" INTEGER,
    "hour_of_day" INTEGER,
    "response_time_ms" INTEGER,
    "led_to_payment" BOOLEAN NOT NULL DEFAULT false,
    "days_to_payment" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT,
    "email_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_predictions" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "predicted_date" TIMESTAMP(3) NOT NULL,
    "predicted_amount" DECIMAL(15,2) NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "model_version" TEXT,
    "factors" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_benchmarks" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "avg_days_to_pay" DECIMAL(5,1) NOT NULL,
    "median_days_to_pay" DECIMAL(5,1) NOT NULL,
    "std_dev_days_to_pay" DECIMAL(5,1) NOT NULL,
    "pct_pay_on_time" DECIMAL(5,2) NOT NULL,
    "pct_pay_30_days" DECIMAL(5,2) NOT NULL,
    "pct_pay_60_days" DECIMAL(5,2) NOT NULL,
    "pct_pay_90_plus" DECIMAL(5,2) NOT NULL,
    "seasonal_multipliers" TEXT,
    "economic_sensitivity" DECIMAL(3,2) NOT NULL,
    "sample_size" INTEGER NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "industry_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_seasonal_patterns" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "january_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "february_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "march_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "april_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "may_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "june_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "july_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "august_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "september_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "october_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "november_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "december_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "q1_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "q2_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "q3_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "q4_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "data_points" INTEGER NOT NULL DEFAULT 0,
    "confidence_score" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_seasonal_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "economic_indicators" (
    "id" TEXT NOT NULL,
    "indicator_date" DATE NOT NULL,
    "fed_funds_rate" DECIMAL(5,2),
    "unemployment_rate" DECIMAL(5,2),
    "inflation_rate" DECIMAL(5,2),
    "gdp_growth_rate" DECIMAL(5,2),
    "consumer_confidence" DECIMAL(6,2),
    "business_confidence" DECIMAL(6,2),
    "credit_availability" DECIMAL(5,2),
    "supply_chain_stress" DECIMAL(5,2),
    "payment_impact_score" DECIMAL(4,3) NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "economic_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_effectiveness" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_tier" TEXT,
    "industry" TEXT,
    "action_type" TEXT NOT NULL,
    "sunday_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "monday_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "tuesday_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "wednesday_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "thursday_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "friday_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "saturday_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "hourly_rates" TEXT,
    "best_day" TEXT,
    "best_hour" INTEGER,
    "best_day_hour_rate" DECIMAL(5,4),
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "successful_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_effectiveness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method_stats" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "avg_days_to_pay" DECIMAL(5,1) NOT NULL,
    "median_days_to_pay" DECIMAL(5,1) NOT NULL,
    "on_time_rate" DECIMAL(5,4) NOT NULL,
    "failure_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "avg_retry_days" DECIMAL(5,1),
    "total_payments" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "avg_payment_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reliability_score" INTEGER NOT NULL DEFAULT 50,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_method_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_cycles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_recovered" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_fees" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "overdue_recovery_90_plus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "overdue_recovery_30_to_90" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "accelerated_payments" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gaps_avoided" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "fee_90_plus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "fee_30_to_90" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "fee_accelerated" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "fee_gaps_avoided" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "invoiced_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "stripe_invoice_id" TEXT,
    "stripe_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_training_logs" (
    "id" TEXT NOT NULL,
    "model_type" TEXT NOT NULL,
    "training_data_size" INTEGER NOT NULL,
    "validation_score" DECIMAL(5,4) NOT NULL,
    "feature_importance" TEXT,
    "hyperparameters" TEXT,
    "production_accuracy" DECIMAL(5,4),
    "prediction_count" INTEGER NOT NULL DEFAULT 0,
    "trained_at" TIMESTAMP(3) NOT NULL,
    "deployed_at" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_training_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "access_token" TEXT,
    "access_token_encrypted" TEXT,
    "refresh_token" TEXT,
    "refresh_token_encrypted" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "external_account_id" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "last_sync_status" TEXT,
    "sync_error" TEXT,
    "sync_cursor" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_metrics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "metric_date" DATE NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'daily',
    "source" TEXT NOT NULL,
    "revenue" DECIMAL(15,2),
    "transactions" INTEGER,
    "avg_ticket" DECIMAL(15,2),
    "labor_cost" DECIMAL(15,2),
    "inventory_cost" DECIMAL(15,2),
    "overhead_cost" DECIMAL(15,2),
    "review_count" INTEGER,
    "avg_rating" DECIMAL(3,2),
    "custom_metrics" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_analyses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "competitor_name" TEXT NOT NULL,
    "competitor_url" TEXT,
    "review_count" INTEGER,
    "avg_rating" DECIMAL(3,2),
    "price_level" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "opportunities" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_insights" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DECIMAL(5,4),
    "data_points" TEXT,
    "action_required" BOOLEAN NOT NULL DEFAULT false,
    "action_taken" BOOLEAN NOT NULL DEFAULT false,
    "action_details" TEXT,
    "relevant_from" TIMESTAMP(3),
    "relevant_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_scans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "scan_type" TEXT NOT NULL DEFAULT 'full',
    "overall_score" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "critical_count" INTEGER NOT NULL DEFAULT 0,
    "high_count" INTEGER NOT NULL DEFAULT 0,
    "medium_count" INTEGER NOT NULL DEFAULT 0,
    "low_count" INTEGER NOT NULL DEFAULT 0,
    "ssl_details" TEXT,
    "header_details" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerabilities" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "remediation" TEXT,
    "references" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "fixed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "employee_type" TEXT NOT NULL DEFAULT 'full_time',
    "hire_date" DATE NOT NULL,
    "termination_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "salary" DECIMAL(15,2),
    "hourly_rate" DECIMAL(10,2),
    "pay_frequency" TEXT NOT NULL DEFAULT 'biweekly',
    "performance_score" INTEGER,
    "last_review_date" DATE,
    "gusto_id" TEXT,
    "adp_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "pay_date" DATE NOT NULL,
    "total_gross_pay" DECIMAL(15,2) NOT NULL,
    "total_net_pay" DECIMAL(15,2) NOT NULL,
    "total_tax_withholdings" DECIMAL(15,2) NOT NULL,
    "total_benefits_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_overtime_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "employer_taxes" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "employee_count" INTEGER NOT NULL,
    "full_time_count" INTEGER NOT NULL DEFAULT 0,
    "part_time_count" INTEGER NOT NULL DEFAULT 0,
    "contractor_count" INTEGER NOT NULL DEFAULT 0,
    "department_breakdown" TEXT,
    "gusto_payroll_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_entries" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "regular_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "pto_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "gross_pay" DECIMAL(15,2) NOT NULL,
    "net_pay" DECIMAL(15,2) NOT NULL,
    "tax_withholdings" DECIMAL(15,2) NOT NULL,
    "benefits_deduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "department" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_recommendations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "reasoning" TEXT NOT NULL,
    "projected_roi" DECIMAL(5,2),
    "industry_salary_low" DECIMAL(15,2),
    "industry_salary_high" DECIMAL(15,2),
    "suggested_salary" DECIMAL(15,2),
    "suggested_timeframe" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'informational',
    "confidence" DECIMAL(5,4),
    "data_factors" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "actioned_at" TIMESTAMP(3),
    "action_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hiring_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plaid_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "institution_id" TEXT,
    "institution_name" TEXT,
    "institution_logo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "error_code" TEXT,
    "error_message" TEXT,
    "last_synced" TIMESTAMP(3),
    "consent_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plaid_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plaid_item_id" TEXT,
    "plaid_account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "official_name" TEXT,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "mask" TEXT,
    "available_balance" INTEGER,
    "current_balance" INTEGER NOT NULL,
    "limit_amount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "last_synced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "plaid_transaction_id" TEXT NOT NULL,
    "plaid_account_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "merchant_name" TEXT,
    "category" TEXT[],
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "payment_channel" TEXT,
    "custom_category" TEXT,
    "notes" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "is_excluded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "platform" TEXT,
    "context_used" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "organizations_customer_stage_idx" ON "organizations"("customer_stage");

-- CreateIndex
CREATE INDEX "journey_events_organization_id_idx" ON "journey_events"("organization_id");

-- CreateIndex
CREATE INDEX "journey_events_to_stage_created_at_idx" ON "journey_events"("to_stage", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "organization_settings_organization_id_key" ON "organization_settings"("organization_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "leads_nurture_status_next_nurture_at_idx" ON "leads"("nurture_status", "next_nurture_at");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "subscriptions_square_customer_id_idx" ON "subscriptions"("square_customer_id");

-- CreateIndex
CREATE INDEX "subscriptions_square_subscription_id_idx" ON "subscriptions"("square_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "one_off_charges_change_request_id_key" ON "one_off_charges"("change_request_id");

-- CreateIndex
CREATE INDEX "one_off_charges_organization_id_idx" ON "one_off_charges"("organization_id");

-- CreateIndex
CREATE INDEX "one_off_charges_project_id_idx" ON "one_off_charges"("project_id");

-- CreateIndex
CREATE INDEX "one_off_charges_status_idx" ON "one_off_charges"("status");

-- CreateIndex
CREATE INDEX "success_fee_billings_subscription_id_idx" ON "success_fee_billings"("subscription_id");

-- CreateIndex
CREATE INDEX "website_projects_organization_id_idx" ON "website_projects"("organization_id");

-- CreateIndex
CREATE INDEX "website_projects_status_idx" ON "website_projects"("status");

-- CreateIndex
CREATE INDEX "change_requests_project_id_idx" ON "change_requests"("project_id");

-- CreateIndex
CREATE INDEX "change_requests_status_idx" ON "change_requests"("status");

-- CreateIndex
CREATE INDEX "project_notes_project_id_idx" ON "project_notes"("project_id");

-- CreateIndex
CREATE INDEX "project_files_project_id_idx" ON "project_files"("project_id");

-- CreateIndex
CREATE INDEX "clients_organization_id_idx" ON "clients"("organization_id");

-- CreateIndex
CREATE INDEX "clients_organization_id_payment_score_idx" ON "clients"("organization_id", "payment_score");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organization_id_external_id_key" ON "clients"("organization_id", "external_id");

-- CreateIndex
CREATE INDEX "invoices_organization_id_idx" ON "invoices"("organization_id");

-- CreateIndex
CREATE INDEX "invoices_organization_id_status_idx" ON "invoices"("organization_id", "status");

-- CreateIndex
CREATE INDEX "invoices_organization_id_due_date_idx" ON "invoices"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organization_id_external_id_key" ON "invoices"("organization_id", "external_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_client_id_idx" ON "payments"("client_id");

-- CreateIndex
CREATE INDEX "invoice_payments_invoice_id_idx" ON "invoice_payments"("invoice_id");

-- CreateIndex
CREATE INDEX "recovery_events_organization_id_event_date_idx" ON "recovery_events"("organization_id", "event_date");

-- CreateIndex
CREATE INDEX "recovery_events_organization_id_status_idx" ON "recovery_events"("organization_id", "status");

-- CreateIndex
CREATE INDEX "recovery_events_invoice_id_idx" ON "recovery_events"("invoice_id");

-- CreateIndex
CREATE INDEX "recovery_events_billing_cycle_id_idx" ON "recovery_events"("billing_cycle_id");

-- CreateIndex
CREATE INDEX "cash_flow_snapshots_organization_id_snapshot_date_idx" ON "cash_flow_snapshots"("organization_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "cash_flow_snapshots_organization_id_snapshot_date_key" ON "cash_flow_snapshots"("organization_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "ai_recommendations_organization_id_idx" ON "ai_recommendations"("organization_id");

-- CreateIndex
CREATE INDEX "ai_recommendations_organization_id_status_idx" ON "ai_recommendations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "follow_up_actions_organization_id_idx" ON "follow_up_actions"("organization_id");

-- CreateIndex
CREATE INDEX "follow_up_actions_organization_id_type_outcome_idx" ON "follow_up_actions"("organization_id", "type", "outcome");

-- CreateIndex
CREATE INDEX "follow_up_actions_organization_id_action_date_idx" ON "follow_up_actions"("organization_id", "action_date");

-- CreateIndex
CREATE INDEX "follow_up_actions_invoice_id_idx" ON "follow_up_actions"("invoice_id");

-- CreateIndex
CREATE INDEX "follow_up_actions_client_id_led_to_payment_idx" ON "follow_up_actions"("client_id", "led_to_payment");

-- CreateIndex
CREATE INDEX "communication_logs_client_id_idx" ON "communication_logs"("client_id");

-- CreateIndex
CREATE INDEX "payment_predictions_invoice_id_idx" ON "payment_predictions"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "industry_benchmarks_industry_key" ON "industry_benchmarks"("industry");

-- CreateIndex
CREATE UNIQUE INDEX "client_seasonal_patterns_client_id_key" ON "client_seasonal_patterns"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "economic_indicators_indicator_date_key" ON "economic_indicators"("indicator_date");

-- CreateIndex
CREATE INDEX "economic_indicators_indicator_date_idx" ON "economic_indicators"("indicator_date");

-- CreateIndex
CREATE INDEX "communication_effectiveness_organization_id_idx" ON "communication_effectiveness"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "communication_effectiveness_organization_id_client_tier_ind_key" ON "communication_effectiveness"("organization_id", "client_tier", "industry", "action_type");

-- CreateIndex
CREATE INDEX "payment_method_stats_organization_id_idx" ON "payment_method_stats"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_stats_organization_id_payment_method_key" ON "payment_method_stats"("organization_id", "payment_method");

-- CreateIndex
CREATE INDEX "billing_cycles_organization_id_status_idx" ON "billing_cycles"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_cycles_organization_id_period_start_key" ON "billing_cycles"("organization_id", "period_start");

-- CreateIndex
CREATE INDEX "model_training_logs_model_type_trained_at_idx" ON "model_training_logs"("model_type", "trained_at");

-- CreateIndex
CREATE INDEX "integrations_organization_id_idx" ON "integrations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_organization_id_provider_key" ON "integrations"("organization_id", "provider");

-- CreateIndex
CREATE INDEX "business_metrics_organization_id_metric_date_idx" ON "business_metrics"("organization_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "business_metrics_organization_id_metric_date_period_source_key" ON "business_metrics"("organization_id", "metric_date", "period", "source");

-- CreateIndex
CREATE INDEX "competitor_analyses_organization_id_idx" ON "competitor_analyses"("organization_id");

-- CreateIndex
CREATE INDEX "business_insights_organization_id_idx" ON "business_insights"("organization_id");

-- CreateIndex
CREATE INDEX "business_insights_organization_id_category_idx" ON "business_insights"("organization_id", "category");

-- CreateIndex
CREATE INDEX "security_scans_organization_id_idx" ON "security_scans"("organization_id");

-- CreateIndex
CREATE INDEX "security_scans_organization_id_status_idx" ON "security_scans"("organization_id", "status");

-- CreateIndex
CREATE INDEX "vulnerabilities_scan_id_idx" ON "vulnerabilities"("scan_id");

-- CreateIndex
CREATE INDEX "vulnerabilities_severity_idx" ON "vulnerabilities"("severity");

-- CreateIndex
CREATE INDEX "employees_organization_id_idx" ON "employees"("organization_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_department_idx" ON "employees"("organization_id", "department");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_gusto_id_key" ON "employees"("organization_id", "gusto_id");

-- CreateIndex
CREATE INDEX "payroll_snapshots_organization_id_pay_date_idx" ON "payroll_snapshots"("organization_id", "pay_date");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_snapshots_organization_id_period_start_period_end_key" ON "payroll_snapshots"("organization_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "payroll_entries_snapshot_id_idx" ON "payroll_entries"("snapshot_id");

-- CreateIndex
CREATE INDEX "payroll_entries_employee_id_idx" ON "payroll_entries"("employee_id");

-- CreateIndex
CREATE INDEX "hiring_recommendations_organization_id_idx" ON "hiring_recommendations"("organization_id");

-- CreateIndex
CREATE INDEX "hiring_recommendations_organization_id_status_idx" ON "hiring_recommendations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "plaid_items_organization_id_idx" ON "plaid_items"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "plaid_items_organization_id_item_id_key" ON "plaid_items"("organization_id", "item_id");

-- CreateIndex
CREATE INDEX "bank_accounts_organization_id_idx" ON "bank_accounts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_organization_id_plaid_account_id_key" ON "bank_accounts"("organization_id", "plaid_account_id");

-- CreateIndex
CREATE INDEX "bank_transactions_organization_id_date_idx" ON "bank_transactions"("organization_id", "date");

-- CreateIndex
CREATE INDEX "bank_transactions_bank_account_id_date_idx" ON "bank_transactions"("bank_account_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_organization_id_plaid_transaction_id_key" ON "bank_transactions"("organization_id", "plaid_transaction_id");

-- CreateIndex
CREATE INDEX "chat_messages_organization_id_created_at_idx" ON "chat_messages"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_user_id_created_at_idx" ON "chat_messages"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_events" ADD CONSTRAINT "journey_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_off_charges" ADD CONSTRAINT "one_off_charges_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_off_charges" ADD CONSTRAINT "one_off_charges_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "website_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_off_charges" ADD CONSTRAINT "one_off_charges_change_request_id_fkey" FOREIGN KEY ("change_request_id") REFERENCES "change_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "success_fee_billings" ADD CONSTRAINT "success_fee_billings_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "success_fee_billings" ADD CONSTRAINT "success_fee_billings_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "website_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_events" ADD CONSTRAINT "recovery_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_events" ADD CONSTRAINT "recovery_events_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_events" ADD CONSTRAINT "recovery_events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_events" ADD CONSTRAINT "recovery_events_billing_cycle_id_fkey" FOREIGN KEY ("billing_cycle_id") REFERENCES "billing_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_snapshots" ADD CONSTRAINT "cash_flow_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_action_taken_by_id_fkey" FOREIGN KEY ("action_taken_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_actions" ADD CONSTRAINT "follow_up_actions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_actions" ADD CONSTRAINT "follow_up_actions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_actions" ADD CONSTRAINT "follow_up_actions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_actions" ADD CONSTRAINT "follow_up_actions_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_predictions" ADD CONSTRAINT "payment_predictions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_seasonal_patterns" ADD CONSTRAINT "client_seasonal_patterns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_effectiveness" ADD CONSTRAINT "communication_effectiveness_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_stats" ADD CONSTRAINT "payment_method_stats_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_analyses" ADD CONSTRAINT "competitor_analyses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_insights" ADD CONSTRAINT "business_insights_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_scans" ADD CONSTRAINT "security_scans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "security_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_snapshots" ADD CONSTRAINT "payroll_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "payroll_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_recommendations" ADD CONSTRAINT "hiring_recommendations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_plaid_item_id_fkey" FOREIGN KEY ("plaid_item_id") REFERENCES "plaid_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
