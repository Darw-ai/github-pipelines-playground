#!/bin/bash
#
# extract-outputs.sh
# Extracts deployment outputs (API URLs, resources, etc.) from deployed stack
# Args:
#   $1 - IAC_TYPE
#   $2 - STACK_NAME
# Output: JSON to stdout
#

set -e

IAC_TYPE=$1
STACK_NAME=$2
AWS_REGION=${AWS_REGION:-us-east-1}

if [ -z "$IAC_TYPE" ] || [ -z "$STACK_NAME" ]; then
    echo '{"error": "IAC_TYPE and STACK_NAME required"}' >&2
    exit 1
fi

case $IAC_TYPE in
    sam|cloudformation|lambda)
        # Query CloudFormation stack outputs
        aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --region "$AWS_REGION" \
            --query 'Stacks[0].Outputs' \
            --output json | jq 'reduce .[] as $item ({}; .[$item.OutputKey] = $item.OutputValue)'
        ;;

    cdk)
        # CDK writes outputs to cdk-outputs.json
        if [ -f "cdk-outputs.json" ]; then
            # Flatten all stack outputs into single object
            cat cdk-outputs.json | jq 'reduce to_entries[] as $stack ({}; . + $stack.value)'
        else
            echo '{"error": "cdk-outputs.json not found"}' >&2
            exit 1
        fi
        ;;

    terraform)
        # Get Terraform outputs
        terraform output -json | jq 'with_entries(.value = .value.value)'
        ;;

    serverless)
        # Serverless Framework stores info in .serverless directory
        if [ -f ".serverless/serverless-state.json" ]; then
            cat .serverless/serverless-state.json | jq '{
                service: .service.service,
                stage: .service.provider.stage,
                region: .service.provider.region,
                endpoints: .service.functions | to_entries | map(select(.value.events[]?.http) | {(.key): .value.events[].http}) | add
            }'
        else
            # Try to extract from AWS
            SLS_SERVICE=$(grep "^service:" serverless.y*ml | awk '{print $2}')
            SLS_STAGE=${STAGE:-dev}

            aws cloudformation describe-stacks \
                --stack-name "${SLS_SERVICE}-${SLS_STAGE}" \
                --region "$AWS_REGION" \
                --query 'Stacks[0].Outputs' \
                --output json | jq 'reduce .[] as $item ({}; .[$item.OutputKey] = $item.OutputValue)'
        fi
        ;;

    *)
        echo "{\"error\": \"Unsupported IaC type: $IAC_TYPE\"}" >&2
        exit 1
        ;;
esac
