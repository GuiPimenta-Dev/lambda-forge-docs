# Mocking AWS Resources for Unit Testing

Coming soon...

<!-- ### Unit Tests

Integrating AWS resources directly into our Lambda function introduces complexities when it comes to testing. Utilizing actual AWS services for unit testing is not optimal due to several reasons: it can incur unnecessary costs, lead to potential side effects on production data, and slow down testing due to reliance on internet connectivity and service response times. To address these challenges and ensure our tests are both efficient and isolated from real-world side effects, we'll simulate AWS resources using mock implementations. This approach allows us to control both the input and output, creating a more predictable and controlled testing environment.

To facilitate this, we'll employ the moto library, which is specifically designed for mocking AWS services. This enables us to replicate AWS service responses without the need to interact with the actual services themselves.

To get started with moto, install it using the following command:

```
pip install moto==4.7.1
```

Given that pytest is our chosen testing framework, it's worth highlighting how it utilizes fixtures to execute specific code segments before or after each test. Fixtures are a significant feature of pytest, enabling the setup and teardown of test environments or mock objects. This capability is particularly beneficial for our purposes, as it allows us to mock AWS resources effectively. By default, pytest automatically detects and loads fixtures defined in a file named `conftest.py`.

Positioning our `conftest.py` file within the `functions/users` directory ensures that all unit tests within this scope can automatically access the defined fixtures. This strategic placement under the users folder allows every test in the directory to utilize the mocked AWS resources without additional configuration, streamlining the testing process for all tests related to the users functionality.

Here's how the structure with the `conftest.py` file looks:

```
functions/users
├── conftest.py
├── create_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
└── utils
    └── __init__.py
```

Below is the content of our fixture specifically designed to mock DynamoDB interactions.

```python title="functions/users/conftest.py"
import json
import os
import moto
import boto3
import pytest

# Defines a pytest fixture with name users_table.
@pytest.fixture
def users_table():
    # Set an environment variable to use a fake table name within tests.
    os.environ["USERS_TABLE_NAME"] = "FAKE-USERS-TABLE"

    # The `moto.mock_dynamodb` context manager simulates DynamoDB for the duration of the test.
    with moto.mock_dynamodb():
        db = boto3.client("dynamodb")
        db.create_table(
            AttributeDefinitions=[
                {"AttributeName": "PK", "AttributeType": "S"},
            ],
            TableName="FAKE-USERS-TABLE",
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table = boto3.resource("dynamodb").Table("FAKE-USERS-TABLE")

        # `yield` returns the table resource to the test function, ensuring cleanup after tests.
        yield table
```

Having established this fixture, it is now readily available for use in our unit tests. Next, we will utilize this fixture to conduct tests on our create function, aiming to confirm its behavior under simulated conditions.

```python title="functions/users/create_user/unit.py"
import json
from .main import lambda_handler


# Test the create user function leveraging the users_table fixture from the conftest.py file automatically imported by pytest.
def test_lambda_handler(users_table):
    # Simulate an event with a request body, mimicking a POST request payload containing a user's name and age.
    event = {"body": json.dumps({"name": "John Doe", "age": 30})}

    # Invoke the `lambda_handler` function with the simulated event and `None` for the context.
    response = lambda_handler(event, None)

    # Parse the JSON response body to work with the data as a Python dictionary.
    response = json.loads(response["body"])

    # Retrieve the user item from the mocked DynamoDB table using the ID returned in the response.
    # This action simulates the retrieval operation that would occur in a live DynamoDB instance.
    user = users_table.get_item(Key={"PK": response["user_id"]})["Item"]

    # Assert that the name and age in the DynamoDB item match the input values.
    # These assertions confirm that the `lambda_handler` function correctly processes the input
    # and stores the expected data in the DynamoDB table.
    assert user["name"] == "John Doe"
    assert user["age"] == 30
```

By running the command `pytest functions/users -k unit`, we initiate the execution of only the unit tests located within the `functions/users` directory.

```
============================ test session starts ==============================

platform darwin -- Python 3.10.4, pytest-8.1.1, pluggy-1.4.0
configfile: pytest.ini
collected 2 items / 1 deselected / 1 selected

functions/users/create_user/unit.py .                                    [100%]

=========================== 1 passed, 1 deselected in 2.45s ===================
```

As evidenced, our unit test has successfully passed. -->
