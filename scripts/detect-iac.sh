#!/bin/bash
#
# detect-iac.sh
# Detects Infrastructure-as-Code type by scanning for marker files
# Returns: sam|cdk|terraform|serverless|cloudformation|lambda|unknown
#

set -e

# Color output for readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check for AWS SAM (must have template.yaml with AWS::Serverless transform)
if [ -f "template.yaml" ] || [ -f "template.yml" ]; then
    TEMPLATE_FILE=$([ -f "template.yaml" ] && echo "template.yaml" || echo "template.yml")

    if grep -q "AWS::Serverless" "$TEMPLATE_FILE"; then
        log_info "Detected AWS SAM (template: $TEMPLATE_FILE)"
        echo "sam"
        exit 0
    fi
fi

# Check for AWS CDK (cdk.json is the marker)
if [ -f "cdk.json" ]; then
    log_info "Detected AWS CDK (cdk.json found)"
    echo "cdk"
    exit 0
fi

# Check for Serverless Framework
if [ -f "serverless.yml" ] || [ -f "serverless.yaml" ]; then
    SERVERLESS_FILE=$([ -f "serverless.yml" ] && echo "serverless.yml" || echo "serverless.yaml")
    log_info "Detected Serverless Framework (file: $SERVERLESS_FILE)"
    echo "serverless"
    exit 0
fi

# Check for Terraform (any .tf files)
if ls *.tf 1> /dev/null 2>&1; then
    TF_FILES=$(ls *.tf | wc -l)
    log_info "Detected Terraform ($TF_FILES .tf files found)"
    echo "terraform"
    exit 0
fi

# Check for raw CloudFormation
if [ -f "cloudformation.yaml" ] || [ -f "cloudformation.yml" ] || [ -f "stack.yaml" ] || [ -f "stack.yml" ]; then
    CF_FILE=$(ls cloudformation.{yaml,yml} stack.{yaml,yml} 2>/dev/null | head -1)
    log_info "Detected CloudFormation (file: $CF_FILE)"
    echo "cloudformation"
    exit 0
fi

# Check for simple Lambda function (index.js/ts + package.json, no framework)
if ([ -f "index.js" ] || [ -f "index.ts" ]) && [ -f "package.json" ]; then
    # Make sure it's not a CDK project (which also has package.json)
    if [ ! -f "cdk.json" ]; then
        log_info "Detected simple Lambda function (index.js/ts + package.json)"
        echo "lambda"
        exit 0
    fi
fi

# Check for template.yaml without SAM (plain CloudFormation)
if [ -f "template.yaml" ] || [ -f "template.yml" ]; then
    TEMPLATE_FILE=$([ -f "template.yaml" ] && echo "template.yaml" || echo "template.yml")
    log_info "Detected plain CloudFormation (template: $TEMPLATE_FILE, no SAM transform)"
    echo "cloudformation"
    exit 0
fi

# No IaC type detected
log_error "No Infrastructure-as-Code type detected"
log_error "Looked for: SAM, CDK, Terraform, Serverless, CloudFormation, Lambda"
log_warn "Current directory contents:"
ls -la >&2

echo "unknown"
exit 1
