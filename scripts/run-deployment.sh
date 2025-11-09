#!/bin/bash
#
# run-deployment.sh
# Executes deployment based on detected IaC type
# Environment Variables:
#   IAC_TYPE - Type of IaC (sam|cdk|terraform|serverless|cloudformation|lambda)
#   STACK_NAME - Name for the CloudFormation/Terraform stack
#   AWS_REGION - AWS region (defaults to us-east-1)
#

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Validate inputs
if [ -z "$IAC_TYPE" ]; then
    log_error "IAC_TYPE environment variable is required"
    exit 1
fi

if [ -z "$STACK_NAME" ]; then
    log_error "STACK_NAME environment variable is required"
    exit 1
fi

AWS_REGION=${AWS_REGION:-us-east-1}

log_info "Starting deployment"
log_info "IaC Type: $IAC_TYPE"
log_info "Stack Name: $STACK_NAME"
log_info "AWS Region: $AWS_REGION"

# Deploy based on IaC type
case $IAC_TYPE in
    sam)
        log_step "Deploying with AWS SAM..."

        # Find template file
        TEMPLATE=$([ -f "template.yaml" ] && echo "template.yaml" || echo "template.yml")

        # Build
        log_info "Building SAM application..."
        sam build --template "$TEMPLATE"

        # Deploy
        log_info "Deploying SAM application..."
        sam deploy \
            --stack-name "$STACK_NAME" \
            --region "$AWS_REGION" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
            --no-confirm-changeset \
            --no-fail-on-empty-changeset \
            --resolve-s3

        log_info "SAM deployment completed successfully"
        ;;

    cdk)
        log_step "Deploying with AWS CDK..."

        # Install dependencies
        if [ -f "package.json" ]; then
            log_info "Installing Node.js dependencies..."
            npm install
        fi

        if [ -f "requirements.txt" ]; then
            log_info "Installing Python dependencies..."
            pip install -r requirements.txt
        fi

        # Synthesize
        log_info "Synthesizing CDK application..."
        npx cdk synth

        # Deploy all stacks
        log_info "Deploying CDK application..."
        npx cdk deploy --all \
            --require-approval never \
            --region "$AWS_REGION" \
            --outputs-file cdk-outputs.json

        log_info "CDK deployment completed successfully"
        ;;

    terraform)
        log_step "Deploying with Terraform..."

        # Initialize
        log_info "Initializing Terraform..."
        terraform init -input=false

        # Plan
        log_info "Planning Terraform deployment..."
        terraform plan \
            -out=tfplan \
            -var="stack_name=$STACK_NAME" \
            -var="region=$AWS_REGION" \
            -input=false

        # Apply
        log_info "Applying Terraform plan..."
        terraform apply -auto-approve -input=false tfplan

        log_info "Terraform deployment completed successfully"
        ;;

    serverless)
        log_step "Deploying with Serverless Framework..."

        # Install dependencies
        if [ -f "package.json" ]; then
            log_info "Installing Node.js dependencies..."
            npm install
        fi

        # Find serverless config
        CONFIG=$([ -f "serverless.yml" ] && echo "serverless.yml" || echo "serverless.yaml")

        # Deploy
        log_info "Deploying Serverless application..."
        serverless deploy \
            --config "$CONFIG" \
            --stage "${STAGE:-dev}" \
            --region "$AWS_REGION" \
            --verbose

        log_info "Serverless deployment completed successfully"
        ;;

    cloudformation)
        log_step "Deploying with AWS CloudFormation..."

        # Find template file
        if [ -f "cloudformation.yaml" ]; then
            TEMPLATE="cloudformation.yaml"
        elif [ -f "cloudformation.yml" ]; then
            TEMPLATE="cloudformation.yml"
        elif [ -f "stack.yaml" ]; then
            TEMPLATE="stack.yaml"
        elif [ -f "stack.yml" ]; then
            TEMPLATE="stack.yml"
        elif [ -f "template.yaml" ]; then
            TEMPLATE="template.yaml"
        elif [ -f "template.yml" ]; then
            TEMPLATE="template.yml"
        else
            log_error "No CloudFormation template found"
            exit 1
        fi

        log_info "Deploying CloudFormation template: $TEMPLATE"

        # Deploy using AWS CLI
        aws cloudformation deploy \
            --template-file "$TEMPLATE" \
            --stack-name "$STACK_NAME" \
            --region "$AWS_REGION" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
            --no-fail-on-empty-changeset

        log_info "CloudFormation deployment completed successfully"
        ;;

    lambda)
        log_step "Deploying simple Lambda function..."

        # Install dependencies
        if [ -f "package.json" ]; then
            log_info "Installing Node.js dependencies..."
            npm install --production
        fi

        if [ -f "requirements.txt" ]; then
            log_info "Installing Python dependencies..."
            pip install -r requirements.txt -t .
        fi

        # Create a basic CloudFormation template for the Lambda
        log_info "Generating CloudFormation template for Lambda..."
        cat > auto-generated-template.yaml <<EOF
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Auto-generated SAM template for simple Lambda

Resources:
  Function:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      Handler: index.handler
      Runtime: nodejs20.x
      Timeout: 30
      MemorySize: 512

Outputs:
  FunctionArn:
    Description: Lambda Function ARN
    Value: !GetAtt Function.Arn
  FunctionName:
    Description: Lambda Function Name
    Value: !Ref Function
EOF

        # Deploy with SAM
        sam build --template auto-generated-template.yaml
        sam deploy \
            --stack-name "$STACK_NAME" \
            --region "$AWS_REGION" \
            --capabilities CAPABILITY_IAM \
            --no-confirm-changeset \
            --resolve-s3

        log_info "Lambda deployment completed successfully"
        ;;

    *)
        log_error "Unsupported IaC type: $IAC_TYPE"
        log_error "Supported types: sam, cdk, terraform, serverless, cloudformation, lambda"
        exit 1
        ;;
esac

log_info "✅ Deployment completed successfully!"
