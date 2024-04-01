# Generating Docs With Swagger and ReDoc

With our Lambda Function now deployed across three distinct stages, the next step involves creating documentation for our endpoints.

## Setting Up a S3 Bucket for Documentation

Create an Amazon S3 bucket to serve as the primary storage for your documentation files. Follow these steps to create your S3 bucket:

1. **Access the AWS Management Console**: Open the Amazon S3 console at [https://console.aws.amazon.com/s3/](https://console.aws.amazon.com/s3/).
2. **Create a New Bucket**: Click on the "Create bucket" button. It's important to note that each bucket's name must be globally unique across all of Amazon S3.
3. **Set Bucket Name**: Choose a unique and descriptive name for your bucket. This name will be crucial for accessing your documentation files. Remember, once a bucket name is set, it cannot be changed.
4. **Choose a Region**: Select an AWS Region for your bucket. Choose the same region defined in your `cdk.json`.
5. **Configure Options**: You may leave the default settings or configure additional options like versioning, logging, or add tags according to your needs.
6. **Review and Create**: Before creating the bucket, review your settings. Once everything is confirmed, click "Create bucket".

Once the bucket is created, update your `cdk.json` file with the bucket's name as shown below:

```json title="cdk.json" hl_lines="2 9" linenums="40"
...
"region": "us-east-2",
"account": "",
"name": "Lambda-Forge-Demo",
"repo": {
    "owner": "$GITHUB-USER",
    "name": "$GITHUB-REPO"
},
"bucket": "$S3-BUCKET-NAME",
"coverage": 80,
...
```

## Activating Docs

To activate documentation generation, navigate to the `deploy.py` file located at `infra/stages/deploy.py`. Modify the `enabled` parameter by setting it from `False` to `True` on line 13, as demonstrated below:

```python title="infra/stages/deploy.py" linenums="1" hl_lines="13"
import aws_cdk as cdk
from constructs import Construct

from infra.stacks.lambda_stack import LambdaStack


class DeployStage(cdk.Stage):
    def __init__(self, scope: Construct, context, **kwargs):
        super().__init__(scope, context.stage, **kwargs)

        lambda_stack = LambdaStack(self, context)

        lambda_stack.services.api_gateway.create_docs(enabled=True, authorizer=None)
```

**By default, Lambda Forge does not include documentation for the Development stage.**

Since the project was initiated using the `--no-docs` flag, the generate docs step is absent from the post deployment phase in both the Staging and Production stacks.

To activate the docs, update the relevant sections in your stack configurations as follows:

In your Staging stack, enable generate docs by including it in the `post` array of the pipeline configuration. The updated section should look like this:

```python title="infra/stacks/staging_stack.py" linenums="43", hl_lines="13"
    # post
    generate_docs = steps.generate_docs()
    integration_tests = steps.run_integration_tests()

    pipeline.add_stage(
        DeployStage(self, context),
        pre=[
            unit_tests,
            coverage,
            validate_integration_tests,
            validate_docs,
        ],
        post=[integration_tests, generate_docs], # Generate docs enabled
    )
```

Similarly, for the Production stack, ensure that generate docs is enabled by adding it to the post section of your pipeline setup:

```{.py3 title="infra/stacks/prod_stack.py" linenums="56", hl_lines="6"}
    # post
    generate_docs = steps.generate_docs()

    pipeline.add_stage(
        DeployStage(self, context),
        post=[generate_docs], # Generate docs enabled
    )

```

At this point, we have all the necessary components to automatically generate our docs.

To proceed, commit your changes and push them to GitHub using the following commands:

```bash
git add .

git commit -m "Adding documentation support"

# Push changes to the 'dev' branch
git push origin dev

# Merge 'dev' into 'staging' and push
git checkout staging
git merge dev
git push origin staging

# Finally, merge 'staging' into 'main' and push
git checkout main
git merge staging
git push origin main
```

Upon successful completion of the pipeline, the Swagger documentation for your endpoints can be accessed via the `/docs` path. This documentation provides comprehensive details about the available endpoints, including request formats, response structures, and query parameters.

You can view the Swagger documentation at the following URLs for each environment:

- **Staging Environment**: [https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/docs](https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/docs)
- **Production Environment**: [https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/docs](https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/docs)

This code snippet below demonstrates all the types of data you can expect to work with, including simple data types, lists, custom objects, optional fields, and literal types, offering a clear understanding of the input and output contracts for the API.

```python
from dataclasses import dataclass
from typing import List, Optional, Literal

@dataclass
class Path:
    id: str # If your endpoint requires a path parameter in the URL, document it here

@dataclass
class Object:
    a_string: str
    an_int: int

@dataclass
class Input:
    a_string: str
    an_int: int
    a_boolean: bool
    a_list: List[str]
    an_object: Object
    a_list_of_object: List[Object]
    a_literal: Literal["a", "b", "c"]
    an_optional: Optional[str]

@dataclass
class Output:
    pass
```

You may have observed that our documentation endpoint is currently public. While in some scenarios, having public documentation is desirable, in others, it can pose a significant security risk. In the following section, we will explore methods to secure this and other endpoints, making them accessible only through an authorizer.
