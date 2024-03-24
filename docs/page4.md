# Steps

### Pre

- **Coverage**: This step measures the amount of production code that is covered by unit tests. This step will fail if the percentage of coverage is below `80%`. You can access the generated coverage report by clicking on `Details -> Reports` on CodePipeline.

- **Unit Tests**: This step executes unit tests on the code to verify the behavior of individual code components. You can access the generated unit test report by clicking on `Details -> Reports` on CodePipeline.

- **Validate Docs**: This step ensures that all lambda functions triggered by the API Gateway has the `Input` and `Output` dataclasses defined on the `main.py` file.

- **Validate Integration Tests**: This step ensures that all endpoints triggered by the API Gateway are covered by at least one integration test. To achieve this, use the custom decorator `@pytest.mark.integration` and specify the method and endpoint arguments to declare that the test covers a specific endpoint.

### Post

- **Generate Docs**: This step automatically generates Swagger docs for all endpoints attached to the API Gateway. In order to do so, each lambda function must have a corresponding `Input` and `Output` dataclass defined in the respective `main.py`. Once these dataclasses are defined, the documentation will be automatically deployed to the API Gateway and can be accessed on the endpoint `/docs`.

- **Integration Tests**: This step executes integration tests on the code to verify the behavior of the system as a whole. You can access the generated integration test report by clicking on `Details -> Reports` on CodePipeline.
