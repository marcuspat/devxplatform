# Lambda Execution Role
resource "aws_iam_role" "lambda" {
  name_prefix = "${local.function_name}-"
  path        = var.role_path

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"  # For Lambda@Edge
          ]
        }
      }
    ]
  })

  permissions_boundary = var.role_permissions_boundary
  force_detach_policies = var.role_force_detach_policies
  max_session_duration  = var.role_max_session_duration

  tags = merge(var.tags, {
    Name = "${local.function_name}-execution-role"
  })
}

# Basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC execution policy (if VPC is configured)
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  count = var.vpc_subnet_ids != null ? 1 : 0

  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# X-Ray tracing policy
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  count = var.tracing_mode == "Active" || var.tracing_mode == "PassThrough" ? 1 : 0

  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# Additional managed policies
resource "aws_iam_role_policy_attachment" "additional" {
  for_each = toset(var.attach_policy_arns)

  role       = aws_iam_role.lambda.name
  policy_arn = each.value
}

# Inline policy for Lambda
resource "aws_iam_role_policy" "lambda" {
  count = var.attach_policy_json ? 1 : 0

  name   = "${local.function_name}-policy"
  role   = aws_iam_role.lambda.id
  policy = var.policy_json
}

# DynamoDB access policy
resource "aws_iam_role_policy" "dynamodb" {
  count = var.attach_dynamodb_policy ? 1 : 0

  name = "${local.function_name}-dynamodb"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = var.dynamodb_actions
        Resource = var.dynamodb_table_arns
      }
    ]
  })
}

# S3 access policy
resource "aws_iam_role_policy" "s3" {
  count = var.attach_s3_policy ? 1 : 0

  name = "${local.function_name}-s3"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Effect = "Allow"
          Action = var.s3_actions
          Resource = [
            for bucket in var.s3_bucket_names : "arn:aws:s3:::${bucket}/*"
          ]
        }
      ],
      var.s3_bucket_actions != [] ? [
        {
          Effect = "Allow"
          Action = var.s3_bucket_actions
          Resource = [
            for bucket in var.s3_bucket_names : "arn:aws:s3:::${bucket}"
          ]
        }
      ] : []
    )
  })
}

# SQS access policy
resource "aws_iam_role_policy" "sqs" {
  count = var.attach_sqs_policy ? 1 : 0

  name = "${local.function_name}-sqs"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = var.sqs_actions
        Resource = var.sqs_queue_arns
      }
    ]
  })
}

# SNS access policy
resource "aws_iam_role_policy" "sns" {
  count = var.attach_sns_policy ? 1 : 0

  name = "${local.function_name}-sns"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = var.sns_actions
        Resource = var.sns_topic_arns
      }
    ]
  })
}

# Secrets Manager access policy
resource "aws_iam_role_policy" "secrets" {
  count = var.attach_secrets_policy ? 1 : 0

  name = "${local.function_name}-secrets"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.secrets_arns
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })
}

# SSM Parameter Store access policy
resource "aws_iam_role_policy" "ssm" {
  count = var.attach_ssm_policy ? 1 : 0

  name = "${local.function_name}-ssm"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = var.ssm_parameter_arns
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Kinesis access policy
resource "aws_iam_role_policy" "kinesis" {
  count = var.attach_kinesis_policy ? 1 : 0

  name = "${local.function_name}-kinesis"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = var.kinesis_actions
        Resource = var.kinesis_stream_arns
      }
    ]
  })
}

# CloudWatch Logs policy for cross-account access
resource "aws_iam_role_policy" "logs" {
  count = var.attach_cloudwatch_logs_policy ? 1 : 0

  name = "${local.function_name}-logs"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = var.cloudwatch_logs_arns
      }
    ]
  })
}