# Getting started

```
pip install lambda-forge --extra-index-url https://pypi.org/simple --extra-index-url https://test.pypi.org/simple/
```

## Create a new project:

```
forge project lambda-forge --repo-owner "$GITHUB-USER" --repo-name "lambda-forge" --bucket "$S3-BUCKET"
```

## Create a new public function:

```
forge function hello_world --method "GET" --description "A simple hello world" --public
```

## Create a repository called lambda-forge on GitHub:

```
git init
git add .
git commit -m "Initial commit"
git branch -M dev
git remote add origin git@github.com:$GITHUB-USER/lambda-forge.git
git push -u origin dev
```

## Deploy the dev stack to AWS:

```
cdk synth
cdk deploy Dev-Lambda Forge-Stack
```

# Go to the CodePipeline section on the AWS Console and see the magic happening!

After the pipeline has successfully completed its execution, navigate to the AWS Lambda Functions console. Search for Dev-Lambda Forge-HelloWorld among your Lambda functions.

Locate the API Gateway trigger associated with this function and click on the URL provided.

This action will lead you to a page demonstrating that we have successfully deployed a "Hello World" Lambda function.

** By default, the development stage is configured not to generate documentation. **

# Publish your staging branch to Github.

```
git checkout -b staging
git push --set-upstream origin staging
```

## Deploy the staging stack to the cloud:

```
cdk synth
cdk deploy Staging-Lambda-Forge-Stack
```

# Go to the Pipeline section on the AWS console and see the magic happening!

You'll observe that our Staging Pipeline incorporates several additional steps to
ensure the integrity of our code.

The integration test step is expected to fail. This is not a cause for concern; it
occurs because the URL for our lambda function has not yet been established.

Once the Generate_Staging_Docs step is complete, proceed to your Lambda functions
console and find the Staging-Lambda-Forge-HelloWorld function.

Identify the API Gateway trigger linked to this function and click on the URL
provided.

At this point, our lambda function has been deployed to Staging. Modifying the
endpoint to /staging/docs will display the automatically generated Swagger
documentation.
