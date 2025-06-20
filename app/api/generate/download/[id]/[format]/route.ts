import { NextRequest, NextResponse } from 'next/server'

// Helper to determine template type from ID
function getTemplateType(generationId: string): string {
  const id = parseInt(generationId.split('-')[0]) || 1
  
  if (id <= 6) return 'backend'
  if (id <= 12) return 'devops-infra'
  if (id <= 18) return 'ai-ml'
  if (id <= 24) return 'devops-security'
  if (id >= 44 && id <= 55) return 'agentics'
  if (id === 43) return 'terraform-azure'
  return 'platform-engineering'
}

// Supported formats for different template types
const FORMAT_SUPPORT = {
  'backend': ['text', 'json', 'zip'],
  'devops-infra': ['text', 'hcl', 'json'],
  'terraform-azure': ['text', 'hcl', 'json'],
  'ai-ml': ['text', 'json', 'py'],
  'agentics': ['text', 'json', 'py'],
  'platform-engineering': ['text', 'yaml', 'json'],
  'devops-security': ['text', 'yaml', 'json']
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
      
    case 'agentics':
      files['agent.py'] = generateAgentCode(generationId)
      files['tools.py'] = generateAgentTools(generationId)
      files['config.yaml'] = generateAgentConfig()
      files['requirements.txt'] = generateAgentRequirements()
      files['main.py'] = generateAgentMainScript(generationId)
      files['README.md'] = generateReadme('agentics', generationId)
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

// Format converters
function formatAsText(files: { [key: string]: string }, generationId: string, templateType: string): string {
  let content = `=== GENERATED SERVICE ARCHIVE ===
Generated: ${new Date().toISOString()}
Service ID: ${generationId}
Template Type: ${templateType}

Instructions:
1. Extract each file by copying content between === FILE: markers
2. Save each file with the indicated filename
3. Follow the README.md for setup instructions

`

  for (const [filename, fileContent] of Object.entries(files)) {
    content += `\n=== FILE: ${filename} ===\n${fileContent}\n`
  }

  content += `\n=== END OF ARCHIVE ===\n\nThank you for using DevX Platform!`
  return content
}

function formatAsJSON(files: { [key: string]: string }, generationId: string, templateType: string) {
  return JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      serviceId: generationId,
      templateType: templateType,
      generatedBy: 'DevX Platform'
    },
    files: files,
    instructions: [
      'Extract files from the files object',
      'Save each file with the indicated filename',
      'Follow README.md for setup instructions'
    ]
  }, null, 2)
}

function formatAsHCL(files: { [key: string]: string }, generationId: string, templateType: string): string {
  // For HCL format, we'll extract just the .tf files and combine them
  const tfFiles = Object.entries(files).filter(([filename]) => filename.endsWith('.tf'))
  
  let content = `# Generated ${templateType.toUpperCase()} Infrastructure
# Service ID: ${generationId}
# Generated: ${new Date().toISOString()}
# Template Type: ${templateType}

`

  for (const [filename, fileContent] of tfFiles) {
    content += `# ==========================================\n`
    content += `# File: ${filename}\n`
    content += `# ==========================================\n\n`
    content += fileContent + '\n\n'
  }

  // Add variables as comments for reference
  const varsFile = files['variables.tf']
  if (varsFile) {
    content += `# ==========================================\n`
    content += `# Variables (save as variables.tf)\n`
    content += `# ==========================================\n\n`
    content += varsFile + '\n\n'
  }

  return content
}

function formatAsYAML(files: { [key: string]: string }, generationId: string, templateType: string): string {
  // For YAML format, we'll extract just the .yaml files and combine them
  const yamlFiles = Object.entries(files).filter(([filename]) => 
    filename.endsWith('.yaml') || filename.endsWith('.yml')
  )
  
  let content = `# Generated ${templateType.toUpperCase()} Configuration
# Service ID: ${generationId}
# Generated: ${new Date().toISOString()}
# Template Type: ${templateType}

---
`

  for (const [filename, fileContent] of yamlFiles) {
    content += `# ==========================================\n`
    content += `# File: ${filename}\n`
    content += `# ==========================================\n\n`
    content += fileContent + '\n\n---\n'
  }

  return content
}

function formatAsPython(files: { [key: string]: string }, generationId: string, templateType: string): string {
  // For Python format, we'll extract just the .py files and combine them
  const pyFiles = Object.entries(files).filter(([filename]) => filename.endsWith('.py'))
  
  let content = `# Generated ${templateType.toUpperCase()} Python Code
# Service ID: ${generationId}
# Generated: ${new Date().toISOString()}
# Template Type: ${templateType}

"""
Multi-file Python project generated by DevX Platform

Files included:
${pyFiles.map(([filename]) => `- ${filename}`).join('\n')}

Instructions:
1. Split this file into separate .py files
2. Install requirements: pip install -r requirements.txt
3. Follow README.md for setup instructions
"""

`

  for (const [filename, fileContent] of pyFiles) {
    content += `# ==========================================\n`
    content += `# File: ${filename}\n`
    content += `# ==========================================\n\n`
    content += fileContent + '\n\n'
  }

  // Add requirements.txt content as comment
  const reqFile = files['requirements.txt']
  if (reqFile) {
    content += `# ==========================================\n`
    content += `# Requirements (save as requirements.txt)\n`
    content += `# ==========================================\n\n`
    content += '"""\n' + reqFile + '\n"""\n\n'
  }

  return content
}

// Placeholder functions (we'll use simplified versions for brevity)
function generateNodeServiceCode(generationId: string): string {
  return `// Generated Service ${generationId}
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'generated-service-${generationId}' });
});

app.listen(PORT, () => {
  console.log(\`Service running on port \${PORT}\`);
});
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
      test: 'jest'
    },
    dependencies: {
      express: '^4.18.2',
      cors: '^2.8.5',
      helmet: '^7.1.0'
    }
  }, null, 2)
}

function generateDockerfile(_type: string): string {
  return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`
}

function generateReadme(type: string, generationId: string): string {
  return `# Generated ${type.toUpperCase()} Service ${generationId}

Generated with DevX Platform on ${new Date().toLocaleDateString()}

## Getting Started

1. Install dependencies
2. Configure environment
3. Run the service

Generated by DevX Platform - Enterprise Service Generator
`
}

// Simplified Terraform functions
function generateTerraformCode(generationId: string): string {
  return `# Generated AWS Infrastructure ${generationId}
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  
  tags = {
    Name = "devx-vpc-${generationId}"
  }
}
`
}

function generateAzureTerraformCode(generationId: string): string {
  return `# Generated Azure Infrastructure ${generationId}
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-devx-${generationId}"
  location = var.location
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-devx-${generationId}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "aks-devx-${generationId}"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D2_v2"
  }

  identity {
    type = "SystemAssigned"
  }
}
`
}

function generateTerraformVariables(): string {
  return `variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}
`
}

function generateAzureTerraformVariables(): string {
  return `variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}
`
}

function generateTerraformOutputs(): string {
  return `output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}
`
}

function generateAzureTerraformOutputs(): string {
  return `output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.name
}
`
}

function generateAzureTerraformVars(): string {
  return `environment = "production"
location    = "East US"
`
}

function generateMLTrainingCode(generationId: string): string {
  return `# Generated ML Training Pipeline ${generationId}
import tensorflow as tf
import mlflow

def train_model():
    # Training logic here
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dense(1)
    ])
    
    model.compile(optimizer='adam', loss='mse')
    return model

if __name__ == "__main__":
    model = train_model()
    mlflow.tensorflow.log_model(model, "model")
`
}

function generateMLServingCode(generationId: string): string {
  return `# Generated ML Serving API ${generationId}
from fastapi import FastAPI
import tensorflow as tf

app = FastAPI()
model = tf.keras.models.load_model("model")

@app.post("/predict")
async def predict(data: dict):
    # Prediction logic here
    return {"prediction": "result"}
`
}

function generatePythonRequirements(): string {
  return `tensorflow==2.15.0
fastapi==0.108.0
uvicorn==0.25.0
mlflow==2.9.2
`
}

function generatePlatformManifest(generationId: string): string {
  return `apiVersion: platform.devx.io/v1alpha1
kind: Platform
metadata:
  name: devx-platform-${generationId}
spec:
  components:
    - name: backstage
      type: developer-portal
      version: v1.18.0
`
}

function generateHelmValues(): string {
  return `replicaCount: 3

image:
  repository: devx/platform
  tag: latest

service:
  type: ClusterIP
  port: 80
`
}

function generateHelmChart(): string {
  return `apiVersion: v2
name: devx-platform
description: A Helm chart for DevX Platform
version: 0.1.0
appVersion: "1.0.0"
`
}

function generateBackstageApp(): string {
  return `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: devx-platform
spec:
  type: service
  lifecycle: production
  owner: platform-team
`
}

function generateK8sDeployment(generationId: string): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: devx-service-${generationId}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: devx-service-${generationId}
  template:
    metadata:
      labels:
        app: devx-service-${generationId}
    spec:
      containers:
      - name: app
        image: devx-service:latest
        ports:
        - containerPort: 8080
`
}

function generateK8sService(): string {
  return `apiVersion: v1
kind: Service
metadata:
  name: devx-service
spec:
  selector:
    app: devx-service
  ports:
  - port: 80
    targetPort: 8080
`
}

function generateK8sIngress(): string {
  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: devx-service
spec:
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

// Agent generation functions
function generateAgentCode(generationId: string): string {
  return `# Generated AI Agent ${generationId}
# Created with DevX Platform

import os
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio

from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.schema import BaseMessage

from tools import get_agent_tools
from config import AgentConfig

class DevXAgent:
    """
    Advanced AI agent with tool integration, memory, and reasoning capabilities.
    Generated for service: ${generationId}
    """
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.llm = ChatOpenAI(
            model=config.model_name,
            temperature=config.temperature,
            max_tokens=config.max_tokens
        )
        
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        self.tools = get_agent_tools()
        self.agent = self._create_agent()
        self.executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            memory=self.memory,
            verbose=config.verbose,
            max_iterations=config.max_iterations,
            early_stopping_method="generate"
        )
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def _create_agent(self):
        """Create the agent with custom prompt template"""
        prompt = PromptTemplate(
            template=self.config.system_prompt,
            input_variables=["input", "chat_history", "agent_scratchpad"]
        )
        
        return create_openai_tools_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt
        )
    
    async def process_message(self, message: str, context: Optional[Dict] = None) -> str:
        """
        Process a user message and return agent response
        """
        try:
            self.logger.info(f"Processing message: {message[:100]}...")
            
            # Add context if provided
            if context:
                message = f"Context: {context}\\n\\nUser: {message}"
            
            # Execute the agent
            result = await self.executor.ainvoke({
                "input": message,
                "chat_history": self.memory.chat_memory.messages
            })
            
            response = result.get("output", "I apologize, but I couldn't generate a response.")
            self.logger.info("Message processed successfully")
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}")
            return f"An error occurred: {str(e)}"
    
    def reset_memory(self):
        """Reset the agent's conversation memory"""
        self.memory.clear()
        self.logger.info("Agent memory reset")
    
    def get_conversation_history(self) -> List[BaseMessage]:
        """Get the current conversation history"""
        return self.memory.chat_memory.messages
    
    def add_tool(self, tool):
        """Dynamically add a tool to the agent"""
        self.tools.append(tool)
        self.agent = self._create_agent()
        self.executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            memory=self.memory,
            verbose=self.config.verbose
        )
    
    async def batch_process(self, messages: List[str]) -> List[str]:
        """Process multiple messages in batch"""
        results = []
        for message in messages:
            result = await self.process_message(message)
            results.append(result)
        return results

if __name__ == "__main__":
    from config import load_config
    
    # Load configuration
    config = load_config()
    
    # Create agent
    agent = DevXAgent(config)
    
    # Example usage
    async def main():
        response = await agent.process_message(
            "Hello! I'm a new AI agent. What can I help you with?"
        )
        print(f"Agent: {response}")
    
    asyncio.run(main())
`
}

function generateAgentTools(generationId: string): string {
  return `# Agent Tools for ${generationId}
# Tool definitions and implementations

import os
import json
import requests
from typing import Dict, Any, List
from datetime import datetime

from langchain.tools import BaseTool, StructuredTool, tool
from langchain.pydantic_v1 import BaseModel, Field
from langchain.callbacks.manager import CallbackManagerForToolUse

# Web Search Tool
@tool
def web_search(query: str) -> str:
    """
    Search the web for current information.
    Args:
        query: The search query string
    Returns:
        Search results as formatted text
    """
    # Example implementation - replace with your preferred search API
    try:
        # This is a placeholder - implement with your search provider
        return f"Search results for '{query}': [Implement with your search API]"
    except Exception as e:
        return f"Search failed: {str(e)}"

# File Operations Tool
@tool  
def read_file(file_path: str) -> str:
    """
    Read contents of a file.
    Args:
        file_path: Path to the file to read
    Returns:
        File contents as string
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

@tool
def write_file(file_path: str, content: str) -> str:
    """
    Write content to a file.
    Args:
        file_path: Path where to write the file
        content: Content to write
    Returns:
        Success message
    """
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"File written successfully to {file_path}"
    except Exception as e:
        return f"Error writing file: {str(e)}"

# API Call Tool
class APICallInput(BaseModel):
    url: str = Field(description="The API endpoint URL")
    method: str = Field(default="GET", description="HTTP method (GET, POST, PUT, DELETE)")
    headers: Dict[str, str] = Field(default={}, description="HTTP headers")
    data: Dict[str, Any] = Field(default={}, description="Request payload for POST/PUT")

@tool
def api_call(url: str, method: str = "GET", headers: Dict = None, data: Dict = None) -> str:
    """
    Make HTTP API calls.
    Args:
        url: The API endpoint URL
        method: HTTP method (GET, POST, PUT, DELETE)
        headers: HTTP headers as dictionary
        data: Request payload for POST/PUT requests
    Returns:
        API response as formatted string
    """
    try:
        headers = headers or {}
        response = requests.request(
            method=method.upper(),
            url=url,
            headers=headers,
            json=data if data else None,
            timeout=30
        )
        
        return f"Status: {response.status_code}\\nResponse: {response.text[:1000]}"
    except Exception as e:
        return f"API call failed: {str(e)}"

# Code Execution Tool (use with caution)
@tool
def execute_python_code(code: str) -> str:
    """
    Execute Python code in a safe environment.
    Args:
        code: Python code to execute
    Returns:
        Execution result or error message
    """
    try:
        # Basic safety check
        forbidden = ['import os', 'import sys', 'open(', 'eval(', 'exec(']
        if any(f in code for f in forbidden):
            return "Code execution blocked: potentially unsafe operations detected"
        
        # Execute in restricted environment
        exec_globals = {
            '__builtins__': {
                'print': print,
                'len': len,
                'range': range,
                'str': str,
                'int': int,
                'float': float,
                'list': list,
                'dict': dict,
                'sum': sum,
                'max': max,
                'min': min,
            }
        }
        
        exec(code, exec_globals)
        return "Code executed successfully"
    except Exception as e:
        return f"Code execution error: {str(e)}"

# Date/Time Tool
@tool
def get_current_datetime() -> str:
    """
    Get the current date and time.
    Returns:
        Current datetime as formatted string
    """
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Calculator Tool
@tool
def calculate(expression: str) -> str:
    """
    Perform mathematical calculations.
    Args:
        expression: Mathematical expression to evaluate
    Returns:
        Calculation result
    """
    try:
        # Basic safety check for eval
        allowed_chars = set('0123456789+-*/()%. ')
        if not all(c in allowed_chars for c in expression):
            return "Invalid characters in expression"
        
        result = eval(expression)
        return f"Result: {result}"
    except Exception as e:
        return f"Calculation error: {str(e)}"

def get_agent_tools() -> List[BaseTool]:
    """
    Return list of available tools for the agent.
    """
    return [
        web_search,
        read_file,
        write_file,
        api_call,
        execute_python_code,
        get_current_datetime,
        calculate
    ]
`
}

function generateAgentConfig(): string {
  return `# Agent Configuration
# Configuration settings for the AI agent

agent:
  name: "DevX AI Agent"
  version: "1.0.0"
  description: "Advanced AI agent with tool integration and reasoning capabilities"

# LLM Configuration
llm:
  model_name: "gpt-4-turbo-preview"
  temperature: 0.7
  max_tokens: 2048
  timeout: 60

# Agent Behavior
behavior:
  max_iterations: 10
  verbose: true
  early_stopping: true
  memory_type: "conversation_buffer"
  max_memory_size: 10000

# System Prompt
system_prompt: |
  You are an advanced AI agent created by DevX Platform. You have access to various tools 
  that allow you to help users with a wide range of tasks including:
  
  - Web searches for current information
  - File operations (reading and writing)
  - API calls to external services
  - Code execution (in a safe environment)
  - Mathematical calculations
  - Date/time operations
  
  Instructions:
  1. Always be helpful, accurate, and honest
  2. Use tools when necessary to provide the best assistance
  3. If you're unsure about something, say so
  4. Be concise but thorough in your responses
  5. Follow safety guidelines when executing code or making API calls
  
  Current conversation history: {chat_history}
  
  User input: {input}
  
  Available tools: {tools}
  
  Tool usage thoughts: {agent_scratchpad}

# Tool Configuration
tools:
  web_search:
    enabled: true
    api_key: "\\$\{WEB_SEARCH_API_KEY\}"
  
  file_operations:
    enabled: true
    allowed_paths: ["./workspace/", "./data/", "./output/"]
    max_file_size: 10485760  # 10MB
  
  api_calls:
    enabled: true
    timeout: 30
    max_redirects: 5
  
  code_execution:
    enabled: true
    timeout: 10
    max_output_size: 1000

# Security Settings
security:
  sandbox_mode: true
  restricted_imports: ["os", "sys", "subprocess", "socket"]
  max_execution_time: 10
  
# Logging
logging:
  level: "INFO"
  file: "agent.log"
  max_size: 50000000  # 50MB
  backup_count: 3

# Performance
performance:
  enable_caching: true
  cache_ttl: 3600  # 1 hour
  max_concurrent_requests: 5
`
}

function generateAgentRequirements(): string {
  return `# AI Agent Requirements
# Generated by DevX Platform

# Core dependencies
langchain>=0.1.0
langchain-openai>=0.0.5
langchain-community>=0.0.15
openai>=1.10.0

# Agent framework
langchain-experimental>=0.0.50

# Memory and storage
redis>=4.5.0
faiss-cpu>=1.7.4

# Web tools
requests>=2.31.0
beautifulsoup4>=4.12.0
selenium>=4.15.0

# File processing
PyPDF2>=3.0.1
python-docx>=0.8.11
openpyxl>=3.1.2

# Data processing
pandas>=2.0.0
numpy>=1.24.0

# Configuration
pyyaml>=6.0
python-dotenv>=1.0.0

# Async support
asyncio
aiohttp>=3.8.0

# Monitoring and logging
structlog>=23.1.0
prometheus-client>=0.16.0

# Optional: Advanced features
sentence-transformers>=2.2.2
chromadb>=0.4.0
tiktoken>=0.5.0

# Development dependencies
pytest>=7.4.0
pytest-asyncio>=0.21.0
black>=23.0.0
flake8>=6.0.0
mypy>=1.5.0

# Security
cryptography>=41.0.0
`
}

function generateAgentMainScript(generationId: string): string {
  return `#!/usr/bin/env python3
# Main script for AI Agent ${generationId}
# Generated by DevX Platform

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from agent import DevXAgent
from config import AgentConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class AgentConfig:
    """Configuration class for the agent"""
    
    def __init__(self):
        self.model_name = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
        self.temperature = float(os.getenv("AGENT_TEMPERATURE", "0.7"))
        self.max_tokens = int(os.getenv("AGENT_MAX_TOKENS", "2048"))
        self.max_iterations = int(os.getenv("AGENT_MAX_ITERATIONS", "10"))
        self.verbose = os.getenv("AGENT_VERBOSE", "true").lower() == "true"
        
        self.system_prompt = """
        You are an advanced AI agent created by DevX Platform. You have access to various tools 
        that allow you to help users with a wide range of tasks.
        
        Current conversation: {chat_history}
        User input: {input}
        Available tools: {tools}
        Thoughts: {agent_scratchpad}
        """

def load_config() -> AgentConfig:
    """Load agent configuration"""
    return AgentConfig()

async def interactive_mode(agent: DevXAgent):
    """Run the agent in interactive mode"""
    print("🤖 DevX AI Agent is ready!")
    print("Type 'quit', 'exit', or 'bye' to stop the agent.")
    print("Type 'reset' to clear conversation history.")
    print("Type 'help' for available commands.")
    print("-" * 50)
    
    while True:
        try:
            user_input = input("\\n👤 You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("\\n🤖 Goodbye! Thanks for using DevX AI Agent.")
                break
            
            if user_input.lower() == 'reset':
                agent.reset_memory()
                print("\\n🤖 Conversation history cleared.")
                continue
            
            if user_input.lower() == 'help':
                print("""
                Available commands:
                - quit/exit/bye: Stop the agent
                - reset: Clear conversation history
                - help: Show this help message
                
                The agent has access to tools for:
                - Web search
                - File operations
                - API calls
                - Code execution
                - Calculations
                - Date/time operations
                """)
                continue
            
            if not user_input:
                continue
            
            print("\\n🤖 Agent: ", end="", flush=True)
            response = await agent.process_message(user_input)
            print(response)
            
        except KeyboardInterrupt:
            print("\\n\\n🤖 Interrupted. Goodbye!")
            break
        except Exception as e:
            logger.error(f"Error in interactive mode: {e}")
            print(f"\\n❌ Error: {e}")

async def batch_mode(agent: DevXAgent, input_file: str, output_file: str = None):
    """Run the agent in batch mode"""
    try:
        with open(input_file, 'r') as f:
            messages = [line.strip() for line in f if line.strip()]
        
        logger.info(f"Processing {len(messages)} messages from {input_file}")
        
        responses = await agent.batch_process(messages)
        
        if output_file:
            with open(output_file, 'w') as f:
                for i, (msg, resp) in enumerate(zip(messages, responses)):
                    f.write(f"Message {i+1}: {msg}\\n")
                    f.write(f"Response {i+1}: {resp}\\n\\n")
            logger.info(f"Results saved to {output_file}")
        else:
            for i, (msg, resp) in enumerate(zip(messages, responses)):
                print(f"\\nMessage {i+1}: {msg}")
                print(f"Response {i+1}: {resp}")
                
    except Exception as e:
        logger.error(f"Error in batch mode: {e}")

async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="DevX AI Agent")
    parser.add_argument("--mode", choices=["interactive", "batch"], 
                       default="interactive", help="Agent mode")
    parser.add_argument("--input", help="Input file for batch mode")
    parser.add_argument("--output", help="Output file for batch mode")
    parser.add_argument("--config", help="Configuration file path")
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config()
    
    # Create agent
    try:
        agent = DevXAgent(config)
        logger.info("Agent initialized successfully")
        
        if args.mode == "interactive":
            await interactive_mode(agent)
        elif args.mode == "batch":
            if not args.input:
                print("Error: --input file required for batch mode")
                sys.exit(1)
            await batch_mode(agent, args.input, args.output)
            
    except Exception as e:
        logger.error(f"Failed to initialize agent: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Set up environment
    if not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY environment variable not set")
        print("Please set your OpenAI API key before running the agent")
    
    # Run the main function
    asyncio.run(main())
`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; format: string } }
) {
  const { id: generationId, format } = params
  const templateType = getTemplateType(generationId)
  
  // Check if format is supported for this template type
  const supportedFormats = FORMAT_SUPPORT[templateType as keyof typeof FORMAT_SUPPORT] || ['text']
  if (!supportedFormats.includes(format)) {
    return NextResponse.json(
      { 
        error: `Format '${format}' not supported for template type '${templateType}'.`,
        supportedFormats: supportedFormats
      },
      { status: 400 }
    )
  }
  
  // Generate files
  const files = generateServiceCode(generationId, templateType)
  
  // Format content based on requested format
  let content: string
  let contentType: string
  let fileExtension: string
  
  switch (format) {
    case 'json':
      content = formatAsJSON(files, generationId, templateType)
      contentType = 'application/json'
      fileExtension = 'json'
      break
      
    case 'hcl':
      content = formatAsHCL(files, generationId, templateType)
      contentType = 'text/plain'
      fileExtension = 'tf'
      break
      
    case 'yaml':
      content = formatAsYAML(files, generationId, templateType)
      contentType = 'text/yaml'
      fileExtension = 'yaml'
      break
      
    case 'py':
      content = formatAsPython(files, generationId, templateType)
      contentType = 'text/x-python'
      fileExtension = 'py'
      break
      
    default: // text
      content = formatAsText(files, generationId, templateType)
      contentType = 'text/plain'
      fileExtension = 'txt'
  }
  
  // Return formatted content
  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="devx-${templateType}-${generationId}.${fileExtension}"`,
    },
  })
}