# Cheap, not a full observability stack - just enough to get paged
# instead of finding out about an outage by noticing it yourself. See
# AWS migration plan.md's Decisions section.

resource "aws_sns_topic" "alerts" {
  name = "pyxie-tarot-alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
  # AWS emails a confirmation link to alert_email after apply - alarms
  # won't actually notify until that link is clicked.
}

resource "aws_cloudwatch_metric_alarm" "ec2_status_check" {
  alarm_name          = "pyxie-tarot-ec2-status-check-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.backend.id
  }
}

resource "aws_cloudwatch_metric_alarm" "ec2_cpu" {
  alarm_name          = "pyxie-tarot-ec2-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.backend.id
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "pyxie-tarot-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "pyxie-tarot-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2000000000 # 2GB, out of 20GB allocated
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "pyxie-tarot-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80 # db.t4g.micro's default max_connections is well above this
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

# Everything below closes a gap the alarms above can't: the box can be up,
# CPU/connections/storage all fine, and the app itself still be silently
# broken (e.g. the Resend/R2 wiring gaps found after the AWS migration,
# or an unhandled exception that returns 500s to real users). Ships the
# backend container's logs to CloudWatch Logs and alarms on ERROR-level
# lines - uvicorn logs unhandled exceptions to stderr at ERROR by default,
# so this needs no application-level logging setup to start working. See
# issue #181.
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/pyxie-tarot/backend"
  retention_in_days = 14 # bounds storage cost - see backend_logs IAM comment in compute.tf
}

resource "aws_cloudwatch_log_metric_filter" "backend_errors" {
  name           = "pyxie-tarot-backend-errors"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "?ERROR ?CRITICAL ?Traceback"

  metric_transformation {
    name      = "BackendErrorCount"
    namespace = "PyxieTarot"
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "backend_errors" {
  alarm_name          = "pyxie-tarot-backend-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = aws_cloudwatch_log_metric_filter.backend_errors.metric_transformation[0].name
  namespace           = aws_cloudwatch_log_metric_filter.backend_errors.metric_transformation[0].namespace
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching" # no log lines matching the filter in a period is the good/expected case
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}
