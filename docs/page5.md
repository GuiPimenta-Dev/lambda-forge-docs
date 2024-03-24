# Configuration

The `cdk.json` file is used to configure your application:

- `region`: the AWS region.
- `account`: the AWS account.
- `name`: the name of the project.
- `repo`:
  `owner`: the owner of the GitHub repository where the source code is hosted.
  `name`: the name of the GitHub repository where the source code is hosted.
- `bucket`: The bucket used to store the docs artifact.
- `coverage`: The coverage threshold to be used on the coverage step (default is 80).
- `base_url`: The base url of the API Gateway used on the integration tests.
- `dev`:
  `arns`: The arns used for the development resources.
- `staging`:
  `arns`: The arns used for the staging resources.
- `prod`:
  `arns`: The arns used for the prod resources.

By default, all lambda functions are going to be created with the name: **`$STAGE-$PROJECT_NAME-$FUNCTION_NAME`**
