import { NextRequest, NextResponse } from 'next/server'

// Helper to determine template type from ID
function getTemplateType(generationId: string): string {
  // In a real app, you'd look this up from the generation record
  // For now, we'll use a simple mapping based on template ID
  const id = parseInt(generationId.split('-')[0]) || 1
  
  if (id <= 6) return 'backend'
  if (id <= 12) return 'devops-infra'
  if (id <= 18) return 'ai-ml'
  if (id <= 24) return 'devops-security'
  if (id === 43) return 'terraform-azure' // Azure template
  return 'platform-engineering'
}

// Generate appropriate code based on template type
function generateServiceCode(generationId: string, templateType: string): { [key: string]: string } {
  const files: { [key: string]: string } = {}
  
  switch (templateType) {
    case 'backend':
      files['index.js'] = generateNodeServiceCode(generationId)
      files['package.json'] = generatePackageJson(generationId)
      files['Dockerfile'] = generateDockerfile('node')
      files['README.md'] = generateReadme('backend', generationId)
      break
      
    case 'devops-infra':
      files['main.tf'] = generateTerraformCode(generationId)
      files['variables.tf'] = generateTerraformVariables()
      files['outputs.tf'] = generateTerraformOutputs()
      files['README.md'] = generateReadme('terraform', generationId)
      break
      
    case 'terraform-azure':
      files['main.tf'] = generateAzureTerraformCode(generationId)
      files['variables.tf'] = generateAzureTerraformVariables()
      files['outputs.tf'] = generateAzureTerraformOutputs()
      files['terraform.tfvars.example'] = generateAzureTerraformVars()
      files['README.md'] = generateReadme('azure', generationId)
      break
      
    case 'ai-ml':
      files['train.py'] = generateMLTrainingCode(generationId)
      files['serve.py'] = generateMLServingCode(generationId)
      files['requirements.txt'] = generatePythonRequirements()
      files['Dockerfile'] = generateDockerfile('python-ml')
      files['README.md'] = generateReadme('ml', generationId)
      break
      
    case 'platform-engineering':
      files['platform.yaml'] = generatePlatformManifest(generationId)
      files['values.yaml'] = generateHelmValues()
      files['Chart.yaml'] = generateHelmChart()
      files['backstage-app.yaml'] = generateBackstageApp()
      files['README.md'] = generateReadme('platform', generationId)
      break
      
    default:
      files['deployment.yaml'] = generateK8sDeployment(generationId)
      files['service.yaml'] = generateK8sService()
      files['ingress.yaml'] = generateK8sIngress()
      files['README.md'] = generateReadme('k8s', generationId)
  }
  
  return files
}

function generateNodeServiceCode(generationId: string): string {
  return `// Generated Service ${generationId}
// Created with DevX Platform

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const CircuitBreaker = require('opossum');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Circuit breaker configuration
const circuitBreakerOptions = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

// Health check with circuit breaker
const healthCheck = new CircuitBreaker(async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'generated-service-${generationId}',
    uptime: process.uptime()
  };
}, circuitBreakerOptions);

app.get('/health', async (req, res) => {
  try {
    const health = await healthCheck.fire();
    res.json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// API routes
app.get('/api/v1/status', (req, res) => {
  res.json({
    service: 'Generated Service',
    version: '1.0.0',
    generatedAt: '${new Date().toISOString()}',
    features: [
      'Circuit Breaker Pattern',
      'Health Checks',
      'Rate Limiting',
      'JWT Authentication',
      'Error Handling',
      'Logging',
      'Metrics'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(error.status || 500).json({
    error: {
      message: error.message,
      status: error.status || 500
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

const server = app.listen(PORT, () => {
  console.log(\`Service running on port \${PORT}\`);
});

module.exports = app;
`
}

function generateAzureTerraformCode(generationId: string): string {
  return `# Generated Azure Infrastructure ${generationId}
# Created with DevX Platform

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
  }
}

# Configure the Azure Provider
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
}

# Data sources
data "azurerm_client_config" "current" {}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-devx-${generationId}"
  location = var.location

  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
    GeneratedAt = "${new Date().toISOString()}"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "vnet-devx-${generationId}"
  address_space       = [var.vnet_cidr]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
  }
}

# Subnets
resource "azurerm_subnet" "aks" {
  name                 = "subnet-aks"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.aks_subnet_cidr]
}

resource "azurerm_subnet" "database" {
  name                 = "subnet-database"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.db_subnet_cidr]

  delegation {
    name = "fs"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_subnet" "gateway" {
  name                 = "subnet-gateway"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.gateway_subnet_cidr]
}

# Network Security Groups
resource "azurerm_network_security_group" "aks" {
  name                = "nsg-aks-${generationId}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
  }
}

# Associate NSG to AKS subnet
resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-devx-${generationId}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days

  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
  }
}

# Azure Kubernetes Service
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-devx-${generationId}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "aks-devx-${generationId}"
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = var.node_count
    vm_size             = var.vm_size
    vnet_subnet_id      = azurerm_subnet.aks.id
    type                = "VirtualMachineScaleSets"
    enable_auto_scaling = true
    min_count           = var.min_node_count
    max_count           = var.max_node_count

    upgrade_settings {
      max_surge = "10%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }

  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
  }
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                        = "kv-devx-${generationId.slice(0, 8)}"
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false
  sku_name                    = "standard"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Get", "List", "Update", "Create", "Import", "Delete", "Recover", "Backup", "Restore",
    ]

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore",
    ]

    storage_permissions = [
      "Get", "List", "Update", "Delete",
    ]
  }

  # Access policy for AKS
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id

    secret_permissions = [
      "Get", "List",
    ]
  }

  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
  }
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "psql-devx-${generationId}"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = var.postgresql_version
  delegated_subnet_id    = azurerm_subnet.database.id
  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password
  zone                   = "1"

  storage_mb = var.db_storage_mb

  sku_name   = var.db_sku_name
  backup_retention_days = 7

  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
  }
}

# Application Gateway
resource "azurerm_public_ip" "gateway" {
  name                = "pip-gateway-${generationId}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
  }
}

resource "azurerm_application_gateway" "main" {
  name                = "agw-devx-${generationId}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "gateway-ip-configuration"
    subnet_id = azurerm_subnet.gateway.id
  }

  frontend_port {
    name = "frontend-port-80"
    port = 80
  }

  frontend_port {
    name = "frontend-port-443"
    port = 443
  }

  frontend_ip_configuration {
    name                 = "frontend-ip-configuration"
    public_ip_address_id = azurerm_public_ip.gateway.id
  }

  backend_address_pool {
    name = "backend-pool"
  }

  backend_http_settings {
    name                  = "backend-http-settings"
    cookie_based_affinity = "Disabled"
    path                  = "/path1/"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 60
  }

  http_listener {
    name                           = "http-listener"
    frontend_ip_configuration_name = "frontend-ip-configuration"
    frontend_port_name             = "frontend-port-80"
    protocol                       = "Http"
  }

  request_routing_rule {
    name                       = "routing-rule"
    rule_type                  = "Basic"
    http_listener_name         = "http-listener"
    backend_address_pool_name  = "backend-pool"
    backend_http_settings_name = "backend-http-settings"
    priority                   = 9
  }

  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
  }
}
`
}

function generateAzureTerraformVariables(): string {
  return `variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}

variable "vnet_cidr" {
  description = "CIDR block for VNet"
  type        = string
  default     = "10.0.0.0/16"
}

variable "aks_subnet_cidr" {
  description = "CIDR block for AKS subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "db_subnet_cidr" {
  description = "CIDR block for database subnet"
  type        = string
  default     = "10.0.2.0/24"
}

variable "gateway_subnet_cidr" {
  description = "CIDR block for application gateway subnet"
  type        = string
  default     = "10.0.3.0/24"
}

variable "kubernetes_version" {
  description = "Kubernetes version for AKS"
  type        = string
  default     = "1.28.3"
}

variable "vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "node_count" {
  description = "Initial number of nodes"
  type        = number
  default     = 3
}

variable "min_node_count" {
  description = "Minimum number of nodes"
  type        = number
  default     = 1
}

variable "max_node_count" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "postgresql_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "13"
}

variable "db_storage_mb" {
  description = "Database storage in MB"
  type        = number
  default     = 32768
}

variable "db_sku_name" {
  description = "Database SKU name"
  type        = string
  default     = "GP_Standard_D2s_v3"
}

variable "db_admin_username" {
  description = "Database administrator username"
  type        = string
  default     = "azureuser"
}

variable "db_admin_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}

variable "log_retention_days" {
  description = "Log Analytics retention in days"
  type        = number
  default     = 30
}
`
}

function generateAzureTerraformOutputs(): string {
  return `output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_fqdn" {
  description = "FQDN of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.fqdn
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "postgresql_server_name" {
  description = "Name of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.name
}

output "postgresql_server_fqdn" {
  description = "FQDN of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "application_gateway_public_ip" {
  description = "Public IP of the Application Gateway"
  value       = azurerm_public_ip.gateway.ip_address
}

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "vnet_name" {
  description = "Name of the virtual network"
  value       = azurerm_virtual_network.main.name
}
`
}

function generateAzureTerraformVars(): string {
  return `# Example Terraform variables file for Azure infrastructure
# Copy this file to terraform.tfvars and update with your values

environment = "production"
location    = "East US"

# Network Configuration
vnet_cidr           = "10.0.0.0/16"
aks_subnet_cidr     = "10.0.1.0/24"
db_subnet_cidr      = "10.0.2.0/24"
gateway_subnet_cidr = "10.0.3.0/24"

# AKS Configuration
kubernetes_version = "1.28.3"
vm_size           = "Standard_D2s_v3"
node_count        = 3
min_node_count    = 1
max_node_count    = 10

# Database Configuration
postgresql_version  = "13"
db_storage_mb      = 32768
db_sku_name        = "GP_Standard_D2s_v3"
db_admin_username  = "azureuser"
db_admin_password  = "${DB_ADMIN_PASSWORD}"

# Monitoring
log_retention_days = 30
`
}

function generateTerraformCode(generationId: string): string {
  return `# Generated Infrastructure ${generationId}
# Created with DevX Platform

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

# VPC Module
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "devx-vpc-${generationId}"
  cidr = var.vpc_cidr

  azs             = data.aws_availability_zones.available.names
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway = true
  enable_vpn_gateway = true
  enable_dns_hostnames = true
  enable_dns_support = true

  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
    GeneratedAt = "${new Date().toISOString()}"
  }
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.15.3"

  cluster_name    = "devx-cluster-${generationId}"
  cluster_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      min_size     = var.min_nodes
      max_size     = var.max_nodes
      desired_size = var.desired_nodes

      instance_types = [var.instance_type]
      
      tags = {
        Environment = var.environment
        GeneratedBy = "DevX Platform"
      }
    }
  }
}

# RDS Database
resource "aws_db_instance" "database" {
  identifier = "devx-db-${generationId}"
  
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = var.db_instance_class
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.database.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  deletion_protection = true
  skip_final_snapshot = false
  
  tags = {
    Environment = var.environment
    GeneratedBy = "DevX Platform"
  }
}
`
}

function generateMLTrainingCode(generationId: string): string {
  return `# Generated ML Training Pipeline ${generationId}
# Created with DevX Platform

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Tuple

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import mlflow
import mlflow.tensorflow

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelTrainer:
    """ML Model Training Pipeline with MLflow tracking"""
    
    def __init__(self, experiment_name: str = "devx-ml-${generationId}"):
        self.experiment_name = experiment_name
        self.scaler = StandardScaler()
        
        # Initialize MLflow
        mlflow.set_experiment(experiment_name)
        
    def load_data(self, data_path: str) -> pd.DataFrame:
        """Load and validate training data"""
        logger.info(f"Loading data from {data_path}")
        
        # Load data with error handling
        try:
            df = pd.read_csv(data_path)
            logger.info(f"Loaded {len(df)} samples with {len(df.columns)} features")
            return df
        except Exception as e:
            logger.error(f"Failed to load data: {e}")
            raise
            
    def preprocess_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Preprocess and split data"""
        logger.info("Preprocessing data")
        
        # Separate features and target
        X = df.drop('target', axis=1).values
        y = df['target'].values
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        return X_scaled, y
        
    def build_model(self, input_shape: int) -> tf.keras.Model:
        """Build neural network model"""
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(128, activation='relu', input_shape=(input_shape,)),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', 'AUC']
        )
        
        return model
        
    def train(self, data_path: str, epochs: int = 50, batch_size: int = 32):
        """Train model with MLflow tracking"""
        with mlflow.start_run():
            # Log parameters
            mlflow.log_param("epochs", epochs)
            mlflow.log_param("batch_size", batch_size)
            mlflow.log_param("generated_id", "${generationId}")
            mlflow.log_param("generated_at", "${new Date().toISOString()}")
            
            # Load and preprocess data
            df = self.load_data(data_path)
            X, y = self.preprocess_data(df)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Build and train model
            model = self.build_model(X_train.shape[1])
            
            # Callbacks
            callbacks = [
                tf.keras.callbacks.EarlyStopping(
                    patience=10,
                    restore_best_weights=True
                ),
                tf.keras.callbacks.ReduceLROnPlateau(
                    patience=5,
                    factor=0.5
                )
            ]
            
            # Train model
            history = model.fit(
                X_train, y_train,
                validation_data=(X_test, y_test),
                epochs=epochs,
                batch_size=batch_size,
                callbacks=callbacks,
                verbose=1
            )
            
            # Evaluate model
            test_loss, test_accuracy, test_auc = model.evaluate(X_test, y_test)
            
            # Log metrics
            mlflow.log_metric("test_loss", test_loss)
            mlflow.log_metric("test_accuracy", test_accuracy)
            mlflow.log_metric("test_auc", test_auc)
            
            # Log model
            mlflow.tensorflow.log_model(
                model,
                "model",
                registered_model_name=f"devx-model-${generationId}"
            )
            
            # Save scaler
            import joblib
            joblib.dump(self.scaler, "scaler.pkl")
            mlflow.log_artifact("scaler.pkl")
            
            logger.info(f"Model training complete. Test accuracy: {test_accuracy:.4f}")
            
            return model, history

if __name__ == "__main__":
    trainer = ModelTrainer()
    model, history = trainer.train("data/train.csv")
    
    # Save model for serving
    model.save("model/saved_model")
    logger.info("Model saved for serving")
`
}

function generateMLServingCode(generationId: string): string {
  return `# Generated ML Serving API ${generationId}
# Created with DevX Platform

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import tensorflow as tf
import joblib
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ML Model Serving API",
    description="Generated with DevX Platform",
    version="1.0.0"
)

# Load model and scaler
MODEL_PATH = "model/saved_model"
SCALER_PATH = "model/scaler.pkl"

try:
    model = tf.keras.models.load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    logger.info("Model and scaler loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    raise

# Request/Response models
class PredictionRequest(BaseModel):
    features: List[float]
    
class PredictionResponse(BaseModel):
    prediction: float
    probability: float
    confidence: float

class BatchPredictionRequest(BaseModel):
    instances: List[List[float]]
    
class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    service_id: str = "ml-service-${generationId}"

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "service_id": "ml-service-${generationId}"
    }

# Single prediction endpoint
@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    try:
        # Preprocess input
        features = np.array(request.features).reshape(1, -1)
        features_scaled = scaler.transform(features)
        
        # Make prediction
        probability = model.predict(features_scaled)[0][0]
        prediction = float(probability > 0.5)
        confidence = abs(probability - 0.5) * 2
        
        return {
            "prediction": prediction,
            "probability": float(probability),
            "confidence": float(confidence)
        }
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Batch prediction endpoint
@app.post("/predict/batch")
async def predict_batch(request: BatchPredictionRequest):
    try:
        # Preprocess inputs
        features = np.array(request.instances)
        features_scaled = scaler.transform(features)
        
        # Make predictions
        probabilities = model.predict(features_scaled)
        
        results = []
        for prob in probabilities:
            prediction = float(prob[0] > 0.5)
            confidence = abs(prob[0] - 0.5) * 2
            results.append({
                "prediction": prediction,
                "probability": float(prob[0]),
                "confidence": float(confidence)
            })
            
        return {"predictions": results}
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Model info endpoint
@app.get("/model/info")
async def model_info():
    return {
        "model_type": "tensorflow",
        "input_shape": model.input_shape,
        "output_shape": model.output_shape,
        "total_params": model.count_params(),
        "service_id": "ml-service-${generationId}",
        "generated_at": "${new Date().toISOString()}"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
`
}

function generatePlatformManifest(generationId: string): string {
  return `# Generated Platform Manifest ${generationId}
# Created with DevX Platform

apiVersion: platform.devx.io/v1alpha1
kind: Platform
metadata:
  name: devx-platform-${generationId}
  namespace: platform-system
  labels:
    generated-by: devx-platform
    generated-at: "${new Date().toISOString()}"
spec:
  # Platform Components
  components:
    # Developer Portal
    - name: backstage
      type: developer-portal
      version: v1.18.0
      config:
        baseUrl: https://portal.devx.internal
        database:
          client: pg
          connection:
            host: postgres-backstage
            port: 5432
        auth:
          providers:
            github:
              enabled: true
            gitlab:
              enabled: true
        catalog:
          locations:
            - type: url
              target: https://github.com/org/*/catalog-info.yaml
        plugins:
          - kubernetes
          - github-actions
          - jenkins
          - sonarqube
          - grafana
          
    # GitOps Engine
    - name: argocd
      type: gitops
      version: v2.9.0
      config:
        server:
          url: https://argocd.devx.internal
        repositories:
          - url: https://github.com/org/platform-config
            type: git
        applications:
          - name: platform-apps
            namespace: argocd
            source:
              repoURL: https://github.com/org/platform-config
              path: apps
              targetRevision: main
            destination:
              server: https://kubernetes.default.svc
            syncPolicy:
              automated:
                prune: true
                selfHeal: true
                
    # Service Mesh
    - name: istio
      type: service-mesh
      version: v1.20.0
      config:
        profile: production
        meshConfig:
          defaultConfig:
            holdApplicationUntilProxyStarts: true
          accessLogFile: /dev/stdout
          defaultProviders:
            metrics:
              - prometheus
        values:
          pilot:
            autoscaleEnabled: true
            autoscaleMin: 2
            autoscaleMax: 5
            
    # Observability Stack
    - name: prometheus-stack
      type: observability
      version: v0.69.0
      config:
        prometheus:
          retention: 30d
          storageSize: 100Gi
          serviceMonitorSelector:
            matchLabels:
              monitoring: enabled
        grafana:
          adminPassword: \${GRAFANA_ADMIN_PASSWORD}
          dashboardProviders:
            - name: platform-dashboards
              folder: Platform
              type: file
              options:
                path: /var/lib/grafana/dashboards/platform
        alertmanager:
          config:
            route:
              group_by: ['alertname', 'cluster', 'service']
              group_wait: 10s
              group_interval: 10s
              repeat_interval: 12h
              
    # CI/CD Platform
    - name: tekton
      type: ci-cd
      version: v0.43.0
      config:
        dashboard:
          enabled: true
          readOnly: false
        webhook:
          enabled: true
        featureFlags:
          enableAPIFields: stable
          
  # Platform Capabilities
  capabilities:
    # Self-Service
    selfService:
      enabled: true
      templates:
        - name: microservice-template
          description: Create a new microservice
          url: https://github.com/org/microservice-template
        - name: frontend-template
          description: Create a new frontend application
          url: https://github.com/org/frontend-template
          
    # Security Policies
    security:
      policies:
        - name: require-non-root
          enforcement: enforce
        - name: disallow-privileged
          enforcement: enforce
        - name: require-security-context
          enforcement: dryrun
          
    # Cost Management
    costManagement:
      enabled: true
      provider: kubecost
      budgets:
        - name: default
          amount: 1000
          currency: USD
          period: monthly
          
    # Multi-Tenancy
    multiTenancy:
      enabled: true
      isolation: namespace
      resourceQuotas:
        default:
          requests.cpu: "10"
          requests.memory: "20Gi"
          limits.cpu: "20"
          limits.memory: "40Gi"
          
  # Platform Integrations
  integrations:
    - name: github
      type: vcs
      config:
        url: https://github.com
        organization: your-org
    - name: slack
      type: notification
      config:
        webhook: \${SLACK_WEBHOOK_URL}
        channel: platform-alerts
    - name: jira
      type: issue-tracking
      config:
        url: https://your-org.atlassian.net
        project: PLATFORM
`
}

function generateK8sDeployment(generationId: string): string {
  return `# Generated Kubernetes Deployment ${generationId}
# Created with DevX Platform

apiVersion: apps/v1
kind: Deployment
metadata:
  name: devx-service-${generationId}
  namespace: default
  labels:
    app: devx-service-${generationId}
    version: v1
    generated-by: devx-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: devx-service-${generationId}
  template:
    metadata:
      labels:
        app: devx-service-${generationId}
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: devx-service-${generationId}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: app
        image: devx-service-${generationId}:latest
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP
        env:
        - name: SERVICE_NAME
          value: devx-service-${generationId}
        - name: LOG_LEVEL
          value: info
        - name: PORT
          value: "8080"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - devx-service-${generationId}
              topologyKey: kubernetes.io/hostname
`
}

function generateK8sService(): string {
  return `apiVersion: v1
kind: Service
metadata:
  name: devx-service
  labels:
    app: devx-service
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: metrics
    protocol: TCP
  selector:
    app: devx-service
`
}

function generateK8sIngress(): string {
  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: devx-service
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: devx-service-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: devx-service
            port:
              number: 80
`
}

function generateHelmChart(): string {
  return `apiVersion: v2
name: devx-platform
description: A Helm chart for DevX Platform
type: application
version: 0.1.0
appVersion: "1.0.0"
keywords:
  - platform-engineering
  - devx
  - kubernetes
home: https://github.com/devx/platform
sources:
  - https://github.com/devx/platform
maintainers:
  - name: DevX Team
    email: team@devx.io
dependencies:
  - name: postgresql
    version: 12.1.9
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
  - name: redis
    version: 17.3.18
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
  - name: prometheus
    version: 19.3.3
    repository: https://prometheus-community.github.io/helm-charts
    condition: monitoring.enabled
`
}

function generateHelmValues(): string {
  return `# Default values for devx-platform
replicaCount: 3

image:
  repository: devx/platform
  pullPolicy: IfNotPresent
  tag: "latest"

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"

podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL

service:
  type: ClusterIP
  port: 80
  metricsPort: 9090

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: platform.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: platform-tls
      hosts:
        - platform.example.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80

postgresql:
  enabled: true
  auth:
    database: platform
    username: platform
    existingSecret: platform-db-secret

redis:
  enabled: true
  auth:
    enabled: true
    existingSecret: platform-redis-secret

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
`
}

function generateBackstageApp(): string {
  return `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: devx-platform
  description: DevX Platform Engineering Solution
  tags:
    - platform
    - kubernetes
    - devtools
  links:
    - url: https://platform.example.com
      title: Platform Dashboard
    - url: https://docs.platform.example.com
      title: Documentation
  annotations:
    github.com/project-slug: devx/platform
    backstage.io/kubernetes-id: devx-platform
    backstage.io/kubernetes-namespace: platform-system
spec:
  type: service
  lifecycle: production
  owner: platform-team
  system: devx-platform
  providesApis:
    - platform-api
  consumesApis:
    - kubernetes-api
    - github-api
  dependsOn:
    - component:postgresql
    - component:redis
    - component:prometheus
`
}

function generateTerraformVariables(): string {
  return `variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.28"
}

variable "instance_type" {
  description = "EC2 instance type for nodes"
  type        = string
  default     = "t3.medium"
}

variable "min_nodes" {
  description = "Minimum number of nodes"
  type        = number
  default     = 3
}

variable "max_nodes" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "desired_nodes" {
  description = "Desired number of nodes"
  type        = number
  default     = 3
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "platform"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
`
}

function generateTerraformOutputs(): string {
  return `output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.database.endpoint
}

output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = module.eks.cluster_primary_security_group_id
}
`
}

function generatePackageJson(generationId: string): string {
  return JSON.stringify({
    name: `devx-service-${generationId}`,
    version: '1.0.0',
    description: 'Service generated with DevX Platform',
    main: 'index.js',
    scripts: {
      start: 'node index.js',
      dev: 'nodemon index.js',
      test: 'jest',
      'test:coverage': 'jest --coverage',
      lint: 'eslint .',
      'docker:build': 'docker build -t devx-service .',
      'docker:run': 'docker run -p 3000:3000 devx-service'
    },
    dependencies: {
      express: '^4.18.2',
      cors: '^2.8.5',
      helmet: '^7.1.0',
      dotenv: '^16.3.1',
      opossum: '^8.1.3',
      winston: '^3.11.0',
      'express-rate-limit': '^7.1.5',
      'jsonwebtoken': '^9.0.2'
    },
    devDependencies: {
      nodemon: '^3.0.2',
      jest: '^29.7.0',
      supertest: '^6.3.3',
      eslint: '^8.56.0'
    },
    engines: {
      node: '>=18.0.0'
    }
  }, null, 2)
}

function generatePythonRequirements(): string {
  return `# Core ML libraries
tensorflow==2.15.0
scikit-learn==1.3.2
pandas==2.1.4
numpy==1.24.3
joblib==1.3.2

# ML tracking and serving
mlflow==2.9.2
fastapi==0.108.0
uvicorn==0.25.0
pydantic==2.5.3

# Monitoring and logging
prometheus-client==0.19.0
python-json-logger==2.0.7

# Testing
pytest==7.4.3
pytest-cov==4.1.0
pytest-asyncio==0.21.1

# Development
black==23.12.1
flake8==7.0.0
mypy==1.7.1
`
}

function generateDockerfile(type: string): string {
  switch (type) {
    case 'node':
      return `FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
RUN addgroup -g 1000 -S nodejs && adduser -S nodejs -u 1000
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
USER nodejs
EXPOSE 3000
CMD ["node", "index.js"]
`
    case 'python-ml':
      return `FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
RUN useradd -m -u 1000 mluser
COPY --from=builder /root/.local /home/mluser/.local
COPY --chown=mluser:mluser . .
USER mluser
ENV PATH=/home/mluser/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "serve:app", "--host", "0.0.0.0", "--port", "8000"]
`
    default:
      return `FROM alpine:latest
RUN addgroup -g 1000 -S appuser && adduser -S appuser -u 1000
USER appuser
WORKDIR /app
COPY --chown=appuser:appuser . .
CMD ["./app"]
`
  }
}

function generateReadme(type: string, generationId: string): string {
  const baseReadme = `# Generated ${type.toUpperCase()} Service ${generationId}

Generated with DevX Platform on ${new Date().toLocaleDateString()}

## Overview

This is a production-ready ${type} service/infrastructure generated by DevX Platform.

`

  const typeSpecific = {
    backend: `## Features

- ✅ Circuit Breaker Pattern for resilience
- ✅ Health check endpoints with monitoring
- ✅ Graceful shutdown handling
- ✅ Comprehensive error handling middleware
- ✅ Security headers with Helmet
- ✅ CORS configuration
- ✅ Environment variable support
- ✅ Structured logging
- ✅ Prometheus metrics
- ✅ Rate limiting

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Create a .env file:
   \`\`\`
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-secret-key
   \`\`\`

3. Start the service:
   \`\`\`bash
   npm start
   \`\`\`

## API Endpoints

- \`GET /health\` - Health check endpoint
- \`GET /api/v1/status\` - Service status and information
- \`GET /metrics\` - Prometheus metrics

## Testing

Run tests with coverage:
\`\`\`bash
npm run test:coverage
\`\`\``,

    terraform: `## Infrastructure Components

- ✅ VPC with public/private subnets across multiple AZs
- ✅ EKS cluster with managed node groups
- ✅ RDS PostgreSQL with Multi-AZ deployment
- ✅ Application Load Balancer
- ✅ Security groups with least privilege
- ✅ IAM roles and policies
- ✅ CloudWatch monitoring
- ✅ S3 buckets for storage
- ✅ Secrets Manager for credentials

## Deployment

1. Initialize Terraform:
   \`\`\`bash
   terraform init
   \`\`\`

2. Create terraform.tfvars:
   \`\`\`hcl
   environment = "production"
   db_password = "secure-password"
   \`\`\`

3. Plan deployment:
   \`\`\`bash
   terraform plan
   \`\`\`

4. Apply configuration:
   \`\`\`bash
   terraform apply
   \`\`\`

## Architecture

- **Region**: us-east-1 (configurable)
- **Availability Zones**: 3
- **Node Groups**: Auto-scaling 3-10 nodes
- **Instance Type**: t3.medium (configurable)`,

    azure: `## Azure Infrastructure Components

- ✅ Virtual Network with subnets for AKS, database, and gateway
- ✅ AKS cluster with auto-scaling node pools
- ✅ PostgreSQL Flexible Server with private networking
- ✅ Application Gateway with public IP
- ✅ Key Vault for secrets management
- ✅ Log Analytics workspace for monitoring
- ✅ Network Security Groups with HTTPS rules
- ✅ Azure Monitor integration

## Deployment

1. Login to Azure:
   \`\`\`bash
   az login
   \`\`\`

2. Initialize Terraform:
   \`\`\`bash
   terraform init
   \`\`\`

3. Create terraform.tfvars:
   \`\`\`hcl
   environment = "production"
   location = "East US"
   db_admin_password = "${DB_ADMIN_PASSWORD}"
   \`\`\`

4. Plan deployment:
   \`\`\`bash
   terraform plan
   \`\`\`

5. Apply configuration:
   \`\`\`bash
   terraform apply
   \`\`\`

## Architecture

- **Region**: East US (configurable)
- **VNet CIDR**: 10.0.0.0/16
- **AKS Nodes**: Auto-scaling 1-10 nodes
- **VM Size**: Standard_D2s_v3 (configurable)
- **Database**: PostgreSQL 13 Flexible Server`,

    ml: `## ML Pipeline Features

- ✅ Automated data preprocessing
- ✅ Hyperparameter tuning
- ✅ Model versioning with MLflow
- ✅ A/B testing support
- ✅ Real-time and batch inference
- ✅ Model monitoring and drift detection
- ✅ GPU support for training
- ✅ Distributed training capability
- ✅ Feature store integration
- ✅ Experiment tracking

## Model Training

1. Prepare your data:
   \`\`\`bash
   python preprocess.py --input data/raw --output data/processed
   \`\`\`

2. Train the model:
   \`\`\`bash
   python train.py --data data/processed --epochs 50
   \`\`\`

3. Evaluate performance:
   \`\`\`bash
   python evaluate.py --model model/saved_model
   \`\`\`

## Model Serving

1. Start the serving API:
   \`\`\`bash
   uvicorn serve:app --host 0.0.0.0 --port 8000
   \`\`\`

2. Make predictions:
   \`\`\`bash
   curl -X POST http://localhost:8000/predict \\
     -H "Content-Type: application/json" \\
     -d '{"features": [0.5, 1.2, 3.4, ...]}'
   \`\`\``,

    platform: `## Platform Components

- ✅ Developer Portal (Backstage)
- ✅ GitOps Engine (ArgoCD/Flux)
- ✅ Service Mesh (Istio)
- ✅ Observability Stack (Prometheus/Grafana)
- ✅ CI/CD Platform (Tekton/GitHub Actions)
- ✅ Security Policies (OPA/Kyverno)
- ✅ Cost Management (Kubecost)
- ✅ Multi-tenancy support
- ✅ Self-service templates
- ✅ Platform APIs

## Installation

1. Install the platform:
   \`\`\`bash
   kubectl apply -f platform.yaml
   \`\`\`

2. Configure integrations:
   \`\`\`bash
   kubectl create secret generic platform-secrets \\
     --from-literal=github-token=$GITHUB_TOKEN \\
     --from-literal=slack-webhook=$SLACK_WEBHOOK
   \`\`\`

3. Access the portal:
   \`\`\`bash
   kubectl port-forward svc/backstage 7007:80
   \`\`\`

## Platform Usage

### Creating a new service:
1. Visit the developer portal
2. Choose a template from the software catalog
3. Fill in the service parameters
4. Submit and watch GitOps deploy your service

### Monitoring:
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Backstage: http://localhost:7007`,

    k8s: `## Kubernetes Resources

- ✅ Deployment with rolling updates
- ✅ Service for load balancing
- ✅ Ingress with TLS termination
- ✅ HorizontalPodAutoscaler
- ✅ PodDisruptionBudget
- ✅ NetworkPolicies
- ✅ ServiceMonitor for Prometheus
- ✅ ConfigMaps and Secrets
- ✅ RBAC policies
- ✅ Resource quotas

## Deployment

1. Create namespace:
   \`\`\`bash
   kubectl create namespace devx-apps
   \`\`\`

2. Apply manifests:
   \`\`\`bash
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   kubectl apply -f ingress.yaml
   \`\`\`

3. Check status:
   \`\`\`bash
   kubectl get pods -n devx-apps
   kubectl get svc -n devx-apps
   \`\`\``
  }

  return baseReadme + (typeSpecific[type as keyof typeof typeSpecific] || typeSpecific.k8s) + `

## Security Considerations

- Non-root user execution
- Read-only root filesystem
- Security contexts enforced
- Network policies applied
- Secrets management via external providers
- Regular security scanning
- RBAC with least privilege

## Monitoring & Observability

- Prometheus metrics exposed
- Structured JSON logging
- Distributed tracing ready
- Custom dashboards available
- Alert rules configured
- SLO/SLI tracking

## Support

For issues or questions:
- Documentation: https://docs.devx.platform
- Issues: https://github.com/devx/platform/issues
- Slack: #devx-platform

---

Generated by DevX Platform - Enterprise Service Generator
`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const generationId = params.id
  const templateType = getTemplateType(generationId)
  
  // Generate all files for the template type
  const files = generateServiceCode(generationId, templateType)
  
  // Create a comprehensive archive
  let archiveContent = `=== GENERATED SERVICE ARCHIVE ===
Generated: ${new Date().toISOString()}
Service ID: ${generationId}
Template Type: ${templateType}

Instructions:
1. Extract each file by copying content between === FILE: markers
2. Save each file with the indicated filename
3. Follow the README.md for setup instructions

`

  // Add each file to the archive
  for (const [filename, content] of Object.entries(files)) {
    archiveContent += `\n=== FILE: ${filename} ===\n${content}\n`
  }

  archiveContent += `\n=== END OF ARCHIVE ===\n\nThank you for using DevX Platform!`

  // Return as downloadable file
  return new NextResponse(archiveContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="devx-${templateType}-${generationId}.txt"`,
    },
  })
}