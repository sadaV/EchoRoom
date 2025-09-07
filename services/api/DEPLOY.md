# EchoRoom API Deployment Guide

This guide covers deploying the EchoRoom FastAPI backend to AWS App Runner.

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI v2** installed and configured
   ```bash
   aws configure
   # Ensure your credentials have ECR and App Runner permissions
   ```

2. **Docker** installed and running locally

3. **AWS ECR Repository** created for the container images
   ```bash
   aws ecr create-repository --repository-name echoroom-api --region <REGION>
   ```

4. **App Runner IAM Role** with permissions:
   - `AWSAppRunnerServicePolicyForECRAccess` (managed policy)
   - ECR access to pull images from your repository

## Build and Push Container Image

### 1. Login to ECR
```bash
aws ecr get-login-password --region <REGION> | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com
```

### 2. Build the Docker Image
```bash
docker build -t echoroom-api:latest services/api
```

### 3. Tag and Push to ECR
```bash
docker tag echoroom-api:latest <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/echoroom-api:latest
docker push <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/echoroom-api:latest
```

## Create App Runner Service

### Option A: AWS Console
1. Go to AWS App Runner in the AWS Console
2. Click "Create service"
3. Select "Container registry" → "Amazon ECR"
4. Choose your ECR repository and tag
5. Configure deployment settings:
   - **Deployment trigger**: Manual
   - **ECR access role**: Select or create role with ECR access

### Option B: AWS CLI
```bash
aws apprunner create-service \
  --service-name "echoroom-api" \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "<ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/echoroom-api:latest",
      "ImageConfiguration": {
        "Port": "8080"
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": false
  }' \
  --instance-configuration '{
    "Cpu": "0.25 vCPU",
    "Memory": "0.5 GB"
  }' \
  --region <REGION>
```

## Service Configuration

### Port Settings
- **Port**: 8080
- **Health check path**: `/health`

### Auto Scaling
- **Min size**: 1 (or 0 if available in your region)
- **Max size**: 2
- **Target CPU**: 70%

### Environment Variables
Configure the following environment variables in App Runner:

```bash
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o-mini
DAILY_TOKEN_CAP=150000
MIN_INTERVAL_SECONDS=2
MAX_REQ_PER_10MIN=10
PUBLIC_DEMO_MODE=on
CORS_ORIGINS=*
```

### Observability
- **Enable logs**: Yes
- **Log level**: INFO
- **CloudWatch integration**: Enabled

## Post-Deployment Testing

After deployment, test your API with these commands:

### Health Check
```bash
curl https://<APP_RUNNER_URL>/health
```
Expected response:
```json
{"status": "healthy", "service": "EchoRoom API"}
```

### Chat Endpoint Test
```bash
curl -X POST https://<APP_RUNNER_URL>/chat \
  -H "Content-Type: application/json" \
  -d '{
    "persona": "Einstein",
    "message": "Hello, can you explain relativity?",
    "sessionId": "test-session-123"
  }'
```

### Personas Endpoint Test
```bash
curl https://<APP_RUNNER_URL>/personas
```

### Roundtable Endpoint Test
```bash
curl -X POST https://<APP_RUNNER_URL>/roundtable \
  -H "Content-Type: application/json" \
  -d '{
    "personas": ["Einstein", "Shakespeare", "Cleopatra"],
    "message": "What is the meaning of life?",
    "sessionId": "test-roundtable-123"
  }'
```

**Note**: The `/roundtable` endpoint now creates a flowing conversation where each persona responds in sequence, building on previous responses. The first persona responds to the user's question, the second persona responds knowing what the first said, and so on. This creates natural dialogue between historical figures rather than independent responses.

## Update Mobile App Configuration

After successful deployment, update your mobile app to use the live API:

### 1. Update API Base URL
Edit `app-mobile/app.json`:
```json
{
  "expo": {
    "extra": {
      "API_BASE": "https://<APP_RUNNER_URL>"
    }
  }
}
```

### 2. Rebuild Metro Cache
```bash
cd app-mobile
npx expo start -c
```

## Updating the Deployment

To deploy updates:

1. **Rebuild and push** the Docker image (steps 1-3 above)
2. **Trigger deployment** in App Runner:
   ```bash
   aws apprunner start-deployment --service-arn <SERVICE_ARN>
   ```

## Monitoring and Logs

### View Logs
```bash
aws logs describe-log-groups --log-group-name-prefix "/aws/apprunner"
aws logs tail /aws/apprunner/<service-name>/<service-id>/application --follow
```

### Metrics
Monitor these key metrics in CloudWatch:
- **RequestCount**: Total API requests
- **2XXCount**: Successful requests  
- **4XXCount**: Client errors
- **5XXCount**: Server errors
- **ResponseTime**: Average response time
- **InstanceCount**: Number of running instances

## Production Considerations

### Security
- **CORS**: For production, replace `CORS_ORIGINS=*` with specific domains
- **Rate Limiting**: Current settings allow 10 requests per 10 minutes per session
- **API Keys**: Store OpenAI API key in AWS Secrets Manager for enhanced security

### Cost Optimization
- **Instance Size**: Start with 0.25 vCPU / 0.5 GB and scale as needed
- **Min Instances**: Set to 0 in supported regions to reduce costs during low usage
- **Token Cap**: Monitor OpenAI usage and adjust `DAILY_TOKEN_CAP` as needed

### High Availability
- **Multi-AZ**: App Runner automatically runs across multiple AZs
- **Health Checks**: Ensure `/health` endpoint always returns quickly
- **Error Handling**: All endpoints include graceful error handling

## Troubleshooting

### Common Issues

**Container won't start**:
- Check CloudWatch logs for Python/dependency errors
- Verify all required environment variables are set
- Test Docker image locally first

**API returning errors**:
- Verify OpenAI API key is valid and has credits
- Check rate limiting settings if getting 429 errors
- Monitor CloudWatch for application logs

**Mobile app can't connect**:
- Verify App Runner URL is accessible via browser
- Check CORS configuration
- Ensure mobile app has updated API_BASE URL

### Local Testing
```bash
# Build and test locally
docker build -t echoroom-api:local services/api
docker run -p 8080:8080 --env OPENAI_API_KEY=<your-key> echoroom-api:local
curl http://localhost:8080/health
```

## Resources

- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [ECR User Guide](https://docs.aws.amazon.com/AmazonECR/latest/userguide/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)