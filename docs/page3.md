# Docs Generation

With our Lambda Function now deployed across three distinct stages, the next step involves creating documentation for our endpoints.

## Setting Up a S3 Bucket for Documentation

Begin by creating a S3 Bucket, which will serve as the storage location for your documentation files.

Once the bucket is created, update your `cdk.json` file with the bucket's name as shown below:

```json title="cdk.json" hl_lines="9" linenums="40"
...
"region": "us-east-2",
"account": "",
"name": "Lambda-Forge-Demo",
"repo": {
    "owner": "$GITHUB-USER",
    "name": "$GITHUB-REPO"
},
"bucket": "$S3-BUCKET",
"coverage": 80,
...
```

## Activating Documentation Generation

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

Since the project was initiated using the `--no-docs` flag, the documentation generation step is absent from the PostDeployment phase in both the Staging and Production stacks.

To activate the docs, update the relevant sections in your stack configurations as follows:

In your Staging stack, enable documentation generation by including it in the `post` array of the pipeline configuration. The updated section should look like this:

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
        post=[integration_tests, generate_docs], # Documentation generation enabled
    )
```

Similarly, for the Production stack, ensure that documentation generation is enabled by adding it to the post section of your pipeline setup:

```{.py3 title="infra/stacks/prod_stack.py" linenums="56", hl_lines="6"}
    # post
    generate_docs = steps.generate_docs()

    pipeline.add_stage(
        DeployStage(self, context),
        post=[generate_docs], # Documentation generation enabled
    )

```

At this point, we have all the necessary components to generate our documentation.

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

- **Staging Environment**: [https://hxca5fw6h4.execute-api.us-east-2.amazonaws.com/staging/docs](https://hxca5fw6h4.execute-api.us-east-2.amazonaws.com/staging/docs)
- **Production Environment**: [https://5sk3lmuuh2.execute-api.us-east-2.amazonaws.com/prod/docs](https://5sk3lmuuh2.execute-api.us-east-2.amazonaws.com/prod/docs)

The documentation includes information on all supported features, structured as follows:

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

This code snippet demonstrates the types of data you can expect to work with, including simple data types, lists, custom objects, optional fields, and literal types, offering a clear understanding of the input and output contracts for the API.

You may have observed that our documentation endpoint is currently public. While in some scenarios, having public documentation is desirable, in others, it can pose a significant security risk. In the following section, we will explore methods to secure this and other endpoints, making them accessible only through an authorizer.
