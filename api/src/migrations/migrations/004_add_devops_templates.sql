-- Migration: Add DevOps and Infrastructure Templates
-- Description: Adds Kubernetes, Terraform, Helm, and other DevOps templates

-- Insert DevOps and Infrastructure Templates
INSERT INTO devx.templates (slug, name, description, category, technology, framework, language, features, tags, config, readme_template, is_featured, is_popular, rating, downloads) VALUES

-- Kubernetes Templates
('k8s-microservices-stack', 'Kubernetes Microservices Stack', 'Complete microservices architecture with service mesh, ingress, and monitoring', 'infrastructure', 'Kubernetes', 'Microservices', 'YAML', 
 ARRAY['Service Mesh (Istio)', 'Ingress Controller', 'Prometheus Monitoring', 'Grafana Dashboards', 'Distributed Tracing', 'Auto-scaling', 'GitOps Ready'],
 ARRAY['kubernetes', 'microservices', 'istio', 'monitoring', 'production'],
 '{"resources": {"cpu": 4, "memory": 8, "storage": 100}, "scaling": {"min_replicas": 3, "max_replicas": 10}, "requirements": ["kubectl", "helm", "istioctl"]}',
 '# Kubernetes Microservices Stack

Complete production-ready microservices architecture on Kubernetes.

## Features
- Istio service mesh for traffic management
- NGINX Ingress controller
- Prometheus & Grafana monitoring
- Jaeger distributed tracing
- Horizontal Pod Autoscaling
- Network policies
- RBAC configuration

## Quick Start
```bash
kubectl apply -k ./base
kubectl apply -k ./overlays/production
```',
 true, true, 4.9, 15420),

('k8s-stateful-app', 'Kubernetes StatefulSet Application', 'Production-ready stateful application with persistent storage', 'infrastructure', 'Kubernetes', 'StatefulSet', 'YAML',
 ARRAY['StatefulSet Configuration', 'Persistent Volumes', 'Ordered Deployment', 'Stable Network IDs', 'Backup Strategy', 'Rolling Updates'],
 ARRAY['kubernetes', 'statefulset', 'database', 'storage'],
 '{"resources": {"cpu": 2, "memory": 4, "storage": 50}, "replicas": 3}',
 '# Kubernetes StatefulSet Application

Deploy stateful applications with persistent storage on Kubernetes.

## Includes
- StatefulSet with ordered deployment
- PersistentVolumeClaims
- Headless Service
- Init containers
- Backup CronJobs',
 false, true, 4.7, 8234),

('k8s-cicd-gitops', 'Kubernetes CI/CD with GitOps', 'Complete GitOps workflow with ArgoCD and GitHub Actions', 'devops', 'Kubernetes', 'GitOps', 'YAML',
 ARRAY['ArgoCD Integration', 'GitHub Actions', 'Automated Rollbacks', 'Multi-Environment', 'Secret Management', 'Policy Enforcement'],
 ARRAY['kubernetes', 'gitops', 'argocd', 'cicd', 'automation'],
 '{"environments": ["dev", "staging", "production"], "tools": ["argocd", "github-actions", "sealed-secrets"]}',
 '# Kubernetes GitOps Pipeline

Automated deployment pipeline using GitOps principles.

## Workflow
1. Push code to GitHub
2. GitHub Actions builds and tests
3. ArgoCD syncs to Kubernetes
4. Automated health checks
5. Rollback on failure',
 true, true, 4.8, 12567),

-- Terraform Templates
('terraform-aws-vpc', 'Terraform AWS VPC Module', 'Production-ready AWS VPC with public/private subnets', 'infrastructure', 'Terraform', 'AWS', 'HCL',
 ARRAY['Multi-AZ Setup', 'NAT Gateways', 'VPN Gateway', 'Flow Logs', 'Network ACLs', 'Security Groups', 'Tagging Strategy'],
 ARRAY['terraform', 'aws', 'vpc', 'networking', 'infrastructure'],
 '{"provider": "aws", "version": "~> 5.0", "regions": ["us-east-1", "us-west-2"]}',
 '# Terraform AWS VPC Module

Create a production-ready VPC on AWS.

## Usage
```hcl
module "vpc" {
  source = "./modules/vpc"
  
  cidr_block = "10.0.0.0/16"
  environment = "production"
  enable_nat_gateway = true
  enable_vpn_gateway = true
}
```',
 true, true, 4.8, 23456),

('terraform-gcp-gke', 'Terraform GCP GKE Cluster', 'Production GKE cluster with best practices', 'infrastructure', 'Terraform', 'GCP', 'HCL',
 ARRAY['Private GKE Cluster', 'Workload Identity', 'Network Policies', 'Pod Security', 'Auto-scaling', 'Monitoring', 'Binary Authorization'],
 ARRAY['terraform', 'gcp', 'gke', 'kubernetes', 'production'],
 '{"provider": "google", "version": "~> 5.0", "min_nodes": 3, "max_nodes": 10}',
 '# Terraform GCP GKE Cluster

Deploy a secure, production-ready GKE cluster.

## Features
- Private cluster with authorized networks
- Workload Identity for pod authentication
- Integrated monitoring and logging
- Auto-scaling and auto-repair',
 true, true, 4.9, 18934),

('terraform-multi-cloud', 'Terraform Multi-Cloud Infrastructure', 'Deploy across AWS, GCP, and Azure', 'infrastructure', 'Terraform', 'Multi-Cloud', 'HCL',
 ARRAY['AWS Support', 'GCP Support', 'Azure Support', 'Cross-Cloud Networking', 'Unified Monitoring', 'Cost Management', 'Disaster Recovery'],
 ARRAY['terraform', 'multi-cloud', 'aws', 'gcp', 'azure', 'enterprise'],
 '{"providers": ["aws", "google", "azurerm"], "complexity": "high"}',
 '# Terraform Multi-Cloud Infrastructure

Deploy and manage infrastructure across multiple cloud providers.

## Supported Clouds
- AWS: VPC, EKS, RDS, S3
- GCP: VPC, GKE, Cloud SQL, GCS
- Azure: VNet, AKS, SQL Database, Blob Storage',
 true, false, 4.7, 7892),

-- Helm Charts
('helm-microservice', 'Helm Chart for Microservices', 'Production-ready Helm chart with all best practices', 'infrastructure', 'Helm', 'Kubernetes', 'YAML',
 ARRAY['ConfigMaps', 'Secrets', 'Ingress', 'HPA', 'PDB', 'Network Policies', 'RBAC'],
 ARRAY['helm', 'kubernetes', 'microservices', 'chart'],
 '{"helm_version": "3.x", "kubernetes_version": "1.28+"}',
 '# Microservice Helm Chart

Deploy microservices with a single Helm command.

## Install
```bash
helm install my-service ./chart \
  --values ./values/production.yaml \
  --namespace production
```',
 false, true, 4.6, 14567),

('helm-kafka-stack', 'Helm Kafka Stack', 'Complete Kafka ecosystem on Kubernetes', 'infrastructure', 'Helm', 'Kafka', 'YAML',
 ARRAY['Kafka Cluster', 'Zookeeper', 'Schema Registry', 'Kafka Connect', 'KSQL', 'Monitoring', 'Auto-scaling'],
 ARRAY['helm', 'kafka', 'streaming', 'kubernetes'],
 '{"components": ["kafka", "zookeeper", "schema-registry", "connect", "ksql"]}',
 '# Kafka Stack Helm Chart

Deploy a complete Kafka ecosystem on Kubernetes.',
 true, true, 4.8, 9234),

-- Ansible Playbooks
('ansible-k8s-setup', 'Ansible Kubernetes Setup', 'Automated Kubernetes cluster setup with Ansible', 'devops', 'Ansible', 'Kubernetes', 'YAML',
 ARRAY['Cluster Provisioning', 'Node Configuration', 'Security Hardening', 'Monitoring Setup', 'Backup Configuration', 'Load Balancer Setup'],
 ARRAY['ansible', 'kubernetes', 'automation', 'infrastructure'],
 '{"ansible_version": "2.9+", "supported_os": ["ubuntu", "centos", "rhel"]}',
 '# Ansible Kubernetes Setup

Automate Kubernetes cluster deployment and configuration.

## Run Playbook
```bash
ansible-playbook -i inventory/production site.yml
```',
 false, true, 4.5, 6789),

('ansible-security-hardening', 'Ansible Security Hardening', 'Comprehensive security hardening playbooks', 'devops', 'Ansible', 'Security', 'YAML',
 ARRAY['OS Hardening', 'SSH Hardening', 'Firewall Rules', 'SELinux/AppArmor', 'Audit Logging', 'CIS Benchmarks', 'Compliance Reports'],
 ARRAY['ansible', 'security', 'hardening', 'compliance'],
 '{"standards": ["cis", "stig", "pci-dss"], "scan_tools": ["lynis", "oscap"]}',
 '# Security Hardening Playbooks

Automated security hardening based on industry standards.',
 true, false, 4.7, 8901),

-- Docker Compose Stacks
('docker-elk-stack', 'Docker ELK Stack', 'Elasticsearch, Logstash, and Kibana stack', 'infrastructure', 'Docker', 'ELK', 'YAML',
 ARRAY['Elasticsearch Cluster', 'Logstash Pipelines', 'Kibana Dashboards', 'Beats Integration', 'Security', 'Monitoring', 'Alerting'],
 ARRAY['docker', 'elk', 'logging', 'monitoring'],
 '{"version": "8.x", "cluster_size": 3}',
 '# ELK Stack Docker Compose

Complete logging solution with ELK stack.

## Start Stack
```bash
docker-compose up -d
docker-compose ps
```',
 true, true, 4.8, 19234),

('docker-monitoring-stack', 'Docker Monitoring Stack', 'Prometheus, Grafana, and Alertmanager', 'infrastructure', 'Docker', 'Monitoring', 'YAML',
 ARRAY['Prometheus', 'Grafana', 'Alertmanager', 'Node Exporter', 'cAdvisor', 'Pushgateway', 'Pre-built Dashboards'],
 ARRAY['docker', 'prometheus', 'grafana', 'monitoring'],
 '{"components": ["prometheus", "grafana", "alertmanager", "node-exporter"]}',
 '# Monitoring Stack

Complete monitoring solution for containers and hosts.',
 true, true, 4.9, 21567),

-- GitHub Actions
('github-actions-k8s', 'GitHub Actions Kubernetes Deploy', 'Complete CI/CD pipeline for Kubernetes', 'devops', 'GitHub Actions', 'Kubernetes', 'YAML',
 ARRAY['Docker Build', 'Security Scanning', 'Helm Deploy', 'Smoke Tests', 'Rollback', 'Multi-Environment', 'Secrets Management'],
 ARRAY['github-actions', 'kubernetes', 'cicd', 'helm'],
 '{"environments": ["dev", "staging", "prod"], "deploy_tool": "helm"}',
 '# GitHub Actions K8s Pipeline

Automated Kubernetes deployment with GitHub Actions.',
 true, true, 4.8, 16789),

('github-actions-terraform', 'GitHub Actions Terraform', 'Infrastructure as Code pipeline', 'devops', 'GitHub Actions', 'Terraform', 'YAML',
 ARRAY['Terraform Plan', 'Cost Estimation', 'Policy Checks', 'Apply on Merge', 'State Management', 'Drift Detection', 'Notifications'],
 ARRAY['github-actions', 'terraform', 'iac', 'automation'],
 '{"terraform_version": "1.5+", "backend": "s3"}',
 '# Terraform GitHub Actions

Automated infrastructure deployment with Terraform.',
 false, true, 4.7, 13456),

-- Jenkins Pipelines
('jenkins-k8s-pipeline', 'Jenkins Kubernetes Pipeline', 'Advanced Jenkins pipeline for K8s', 'devops', 'Jenkins', 'Kubernetes', 'Groovy',
 ARRAY['Declarative Pipeline', 'Kubernetes Agents', 'Parallel Stages', 'Quality Gates', 'Approval Steps', 'Notifications', 'Artifacts'],
 ARRAY['jenkins', 'kubernetes', 'cicd', 'groovy'],
 '{"jenkins_version": "2.400+", "plugins": ["kubernetes", "docker", "sonarqube"]}',
 '# Jenkins Kubernetes Pipeline

Advanced CI/CD pipeline with dynamic Kubernetes agents.',
 false, true, 4.6, 11234),

-- Packer Templates
('packer-golden-ami', 'Packer Golden AMI', 'Build secure, hardened AMIs', 'infrastructure', 'Packer', 'AWS', 'HCL',
 ARRAY['Security Hardening', 'Package Updates', 'Monitoring Agents', 'Log Agents', 'Compliance Scanning', 'Multi-Region', 'Automated Testing'],
 ARRAY['packer', 'aws', 'ami', 'security'],
 '{"packer_version": "1.9+", "base_ami": "ubuntu-22.04"}',
 '# Packer Golden AMI

Build secure, compliant AMIs for production use.',
 false, false, 4.5, 7654),

-- CloudFormation
('cloudformation-vpc-stack', 'CloudFormation VPC Stack', 'AWS VPC with CloudFormation', 'infrastructure', 'CloudFormation', 'AWS', 'YAML',
 ARRAY['Nested Stacks', 'Cross-Stack References', 'Custom Resources', 'Stack Sets', 'Drift Detection', 'Change Sets', 'Stack Policies'],
 ARRAY['cloudformation', 'aws', 'vpc', 'iac'],
 '{"format": "yaml", "aws_regions": ["us-east-1", "us-west-2"]}',
 '# CloudFormation VPC Stack

Deploy AWS VPC using CloudFormation.',
 false, false, 4.4, 5432),

-- Pulumi
('pulumi-k8s-typescript', 'Pulumi Kubernetes TypeScript', 'Infrastructure as Code with TypeScript', 'infrastructure', 'Pulumi', 'Kubernetes', 'TypeScript',
 ARRAY['Type Safety', 'IDE Support', 'Testing', 'Policy as Code', 'Multi-Cloud', 'State Management', 'Secrets Encryption'],
 ARRAY['pulumi', 'kubernetes', 'typescript', 'iac'],
 '{"pulumi_version": "3.x", "runtime": "nodejs"}',
 '# Pulumi Kubernetes with TypeScript

Type-safe infrastructure as code.

## Deploy
```bash
pulumi up --stack production
```',
 true, false, 4.7, 8765);

-- Update template counts
UPDATE devx.template_stats 
SET 
  total_count = (SELECT COUNT(*) FROM devx.templates),
  last_updated = CURRENT_TIMESTAMP;