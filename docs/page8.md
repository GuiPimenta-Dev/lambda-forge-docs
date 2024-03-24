# Pre-requisites

Before diving into Lambda Forge, ensure you have the following prerequisites covered:

### Install and Configure AWS CDK

The AWS Cloud Development Kit (CDK) is essential for defining cloud infrastructure in code and provisioning it through AWS CloudFormation. Execute the following commands to install the AWS CDK globally and set up your AWS credentials:

```
npm install -g aws-cdk
aws configure
```

During the configuration, you will be prompted to enter your AWS Access Key ID, Secret Access Key, default region name, and output format. This step grants the CDK access to manage your AWS resources. Skip this step if your credentials are already configured.

### Create a GitHub Personal Access Token

Lambda Forge uses CodePipeline to interact with your GitHub repository. To enable this, generate a GitHub personal access token by following these steps:

1. Navigate to "Developer Settings" in your GitHub account.
2. Select "Personal access tokens," then "Tokens (classic)."
3. Click "Generate new token," ensuring the "repo" scope is selected for full control of private repositories.
4. Complete the token generation process.

### Store the token on AWS Secrets Manager

Store this token in AWS Secrets Manager under the name **github-token**. It's crucial to use this exact name because that's the default identifier the CDK will search for in your AWS account.

### Create a S3 bucket

Create a s3 bucket for the docs.
