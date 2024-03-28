# Building A Serverless Web Scraper with Layers, Dynamo DB, SNS and Event Bridge

It's time to elevate our tutorial to the next level.

In this section, we will develop a serverless web scraper designed to extract information about books from [https://books.toscrape.com/](https://books.toscrape.com/) utilizing the Requests library and Beautiful Soup. The retrieved data will be stored in DynamoDB, enabling us to perform queries via an endpoint.

Additionally, we will cover how to configure our Lambda function to execute daily, ensuring our dataset remains current and accurate.

## Dynamo DB

Considering the write access to our database will be exclusively reserved for the scraper, maintaining three separate databases for each deployment stage is unnecessary. Therefore, let's just create a singular DynamoDB table designed to serve all three environments uniformly.

Instead of setting up each environment's details separately in the `cdk.json` file, like we did to the users table, we'll make things simpler by putting the books table ARN directly into our DynamoDB class.

```python title="infra/services/dynamo_db.py" linenums="5" hl_lines="10-14"
class DynamoDB:
  def __init__(self, scope, resources: dict) -> None:

      self.users_table = dynamo_db.Table.from_table_arn(
          scope,
          "UsersTable",
          resources["arns"]["users_table"],
      )

      self.books_table = dynamo_db.Table.from_table_arn(
          scope,
          "BooksTable",
          "$BOOKS-TABLE-ARN",
      )

```

## Lambda Layers

Another essential aspect of our project involves leveraging external libraries like `requests` and `Beautiful Soup` for our web scraping tasks. Since these libraries are not built into Python's standard library, we'll need to incorporate them into our AWS Lambda functions as Lambda Layers.

### What Are Lambda Layers?

Lambda Layers are essentially ZIP archives containing libraries, custom runtime environments, or other dependencies. You can include these layers in your Lambda function’s execution environment without having to bundle them directly with your function's deployment package. This means you can use libraries or custom runtimes across multiple Lambda functions without needing to include them in each function’s codebase.

#### Key Benefits

- **Code Reusability**: Lambda Layers promote code reuse. By storing common components in layers, you can easily share them across multiple functions.
- **Simplified Management**: Managing your function’s dependencies becomes easier. You can update a shared library in a layer without updating every function that uses it.
- **Efficiency**: Layers can reduce the size of your deployment package, making uploads faster and reducing the time it takes to update or deploy functions.
- **Flexibility**: You can create layers for different programming languages or purposes, offering flexibility in how you organize and manage dependencies.

#### How They Work

When you create a Lambda function, you specify which layers to include in its execution environment. During execution, AWS Lambda configures the function's environment to include the content of the specified layers. This content is available to your function's code just as if it were included in the deployment package directly.

#### Use Cases

- **Sharing libraries**: Commonly used libraries can be placed in a layer and shared among multiple functions.
- **Custom runtimes**: You can use layers to deploy functions in languages that AWS Lambda does not natively support by including the necessary runtime in a layer.
- **Configuration files**: Layers can be used to store configuration files that multiple functions need to access.

### Incorporating Layers Into Our Service Class

Just as we previously set up our DynamoDB Service Class, it's now time to integrate the Lambda Layers into our Service Class using Forge. To accomplish this, simply execute the following command:

`forge service layers`

A new `layers.py` file has been created on `infra/services` and automatically incorporated into our Services class. This convenience allows us to focus more on development and less on configuration.

```
infra
├── services
    ├── __init__.py
    ├── api_gateway.py
    ├── aws_lambda.py
    ├── dynamo_db.py
    └── layers.py
```

```python title="infra/services/__init__.py" hl_lines="12"
from infra.services.layers import Layers
from infra.services.dynamo_db import DynamoDB
from infra.services.api_gateway import APIGateway
from infra.services.aws_lambda import AWSLambda


class Services:
    def __init__(self, scope, context) -> None:
        self.api_gateway = APIGateway(scope, context)
        self.aws_lambda = AWSLambda(scope, context)
        self.dynamo_db = DynamoDB(scope, context.resources)
        self.layers = Layers(scope)
```

### Incorporating Requests and Beautiful Soup via Public Layers

The `requests` and `Beautiful Soup` libraries are widely used and recognized for their utility in web scraping and data extraction tasks. Fortunately, AWS Lambda offers these libraries as public layers, simplifying the process of integrating them into your projects without the need to create custom layers.

For projects utilizing Python 3.9, we can leverage the specific Amazon Resource Names (ARNs) for both requests and Beautiful Soup libraries made available through Klayers. This provides an efficient way to add these libraries to your Lambda functions. You can explore the complete list of public layers for Python 3.9 in the `us-east-2` region [here](https://api.klayers.cloud//api/v2/p3.9/layers/latest/us-east-2/json).

Here are the ARNs you'll need:

- Requests: `arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-requests:19`

- Beautiful Soup 4: `arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-beautifulsoup4:7`

Let's add them both to our Layers class.

```python title="infra/services/layers.py" hl_lines="7-11 13-17"
from aws_cdk import aws_lambda as _lambda


class Layers:
    def __init__(self, scope) -> None:

        self.requests_layer = _lambda.LayerVersion.from_layer_version_arn(
            scope,
            id="RequestsLayer",
            layer_version_arn="arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-requests:19",
        )

        self.bs4_layer = _lambda.LayerVersion.from_layer_version_arn(
            scope,
            id="BS4Layer",
            layer_version_arn="arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-beautifulsoup4:7",
        )
```

## Developing The Web Scraper

Our web scraper will extract the following details: `upc`, `title`, `price`, `category`, `stock`, `description` and `url`.

Let's create it with forge.

```
forge function scraper --description "Web scraper to populate Dynamo with books data" --no-api --belongs books
```

Remember, although users can access the scraper's results, the scraper itself won't serve as a direct endpoint. We've included the `--no-api` flag in our Forge setup to signify that this function won't be connected to the API Gateway. Its primary role is to enrich our database. Additionally, the `--belongs` flag was used to organize it within the `books` directory, aligning it with related functions planned for the future.

Here is the structure created for the books directory:

```
functions
├── books
   ├── scraper
   │   ├── __init__.py
   │   ├── config.py
   │   ├── main.py
   │   └── unit.py
   └── utils
       └── __init__.py
```

### Building a Web Scraper with Pagination Handling Using a While Loop

Our focus is on understanding how AWS resources are integrated with Lambda Forge, not on the intricacies of developing a web scraper. Therefore, we will not cover the source code in detail. Nevertheless, we encourage you to experiment with creating your own web scraper, as the core concepts we're discussing will remain applicable.

Below, you'll find the source code accompanied by comments that explain the concepts it illustrates.

```python title="functions/books/scraper/main.py"
import os
import re
import boto3
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://books.toscrape.com"

def lambda_handler(event, context):

    # DynamoDB table name for storing books information
    BOOKS_TABLE_NAME = os.environ.get("BOOKS_TABLE_NAME")

    # Initialize a DynamoDB resource
    dynamodb = boto3.resource("dynamodb")

    # Reference the DynamoDB table
    books_table = dynamodb.Table(BOOKS_TABLE_NAME)

    # Determine the URL to scrape, defaulting to BASE_URL
    url = event.get("url") or BASE_URL

    while url:
        # Fetch and parse the webpage at the given URL
        response = requests.get(url)
        soup = BeautifulSoup(response.text, "html.parser")

        for article in soup.find_all("article"):
            # Extract book details
            title = article.find("h3").find("a").get("title").title()
            price = article.find("p", {"class": "price_color"}).get_text()[1:]

            # Correct the href if it doesn't contain "catalogue/"
            href = article.find("h3").find("a").get("href")
            if "catalogue/" not in href:
                href = f"catalogue/{href}"

            # Fetch and parse the book detail page
            url = f"{BASE_URL}/{href}"
            detail_response = requests.get(url)
            detail_soup = BeautifulSoup(detail_response.text, "html.parser")

            # Extract additional details from the book detail page
            upc = detail_soup.find("th", string="UPC").find_next("td").get_text().strip()
            category = (
                detail_soup.find("ul", {"class", "breadcrumb"})
                .find_all("li")[2]
                .text.strip()
            )
            stock = (
                detail_soup.find("p", {"class": "instock availability"}).get_text().strip()
            )
            stock = re.search(r"\d+", stock)[0]
            description = detail_soup.find("div", {"id": "product_description"})
            if description:
                description = description.find_next("p").get_text()

            # Construct the item to store in DynamoDB
            item = {
                "PK": upc,
                "category": category,
                "title": title,
                "price": price,
                "description": description,
                "stock": stock,
                "url": url,
            }

            # Store the item in DynamoDB
            books_table.put_item(Item=item)

        # Check for and process the next page
        next_page = soup.find("li", {"class": "next"})
        if next_page:
            next_href = next_page.find("a")["href"]
            if "catalogue/" not in next_href:
                next_href = f"catalogue/{next_href}"
            url = f"{BASE_URL}/{next_href}"
        else:
            url = None
```

Due to AWS's predefined operational constraints, Lambda functions are explicitly engineered for rapid execution, with a maximum duration limit of **15 minutes**.

To evaluate the efficiency of our function, we will incorporate print statements that monitor execution time throughout our local testing phase.

```
Execution time: 1024.913999080658 seconds
```

The execution time approaches nearly **17 minutes**, exceeding the maximum duration allowed for a Lambda function. Consequently, we need to seek alternative strategies to ensure our scraper remains compliant with the limitations.

Utilizing a while loop within a solitary AWS Lambda function to perform book data extraction from the website is functional yet lacks efficiency and scalability. This is particularly pertinent within the AWS ecosystem, which is rich in services tailored for distributed computing and intricate task orchestration.

### Building a Web Scraper with Pagination Handling Using SNS

Amazon Simple Notification Service (SNS) is a fully managed messaging service provided by AWS, enabling seamless communication between distributed systems. It operates on a publish-subscribe model, where messages are published to topics and subscribers receive notifications from these topics. With support for various types of subscriptions including HTTP, SQS, Lambda, email, and SMS, SNS ensures reliable and scalable message delivery across multiple AWS regions. It also offers features like message filtering, retry mechanisms, and dead-letter queues to enhance message processing and system resilience.

Instead of using a while loop to process all pages in a single function, let's design a Lambda function to process a maximum of 10 pages. After completing these pages, it should dispatch a message with the URL of the next starting page to an SNS topic. This triggers another Lambda function dedicated to harvesting book information from the subsequent 10 pages.

As an initial step, we have to integrate SNS into our Services class.

```
forge service sns
```

A new `sns.py` file was created on `infra/services`, so let's create a new SNS topic.

```python title="infra/services/sns.py" hl_lines="8-13"
from aws_cdk.aws_sns import Topic
from aws_cdk import aws_lambda_event_sources


class SNS:
    def __init__(self, scope, resources) -> None:

        self.books_scraper_topic = Topic(
            scope,
            "BooksScraperTopic",
            topic_name="BooksScraperTopic",
            display_name="Books Scraper Topic"
        )

    @staticmethod
    def create_trigger(topic, function):
        sns_subscription = aws_lambda_event_sources.SnsEventSource(topic)
        function.add_event_source(sns_subscription)
```

Note that the SNS class contains a handy helper method, streamlining the process of establishing triggers that connect an SNS topic to a Lambda function.

Now, let's revise the original code to eliminate the while loop that processes all pages and instead publish a message to SNS containing the URL of the new starting point.

```python title="functions/books/scraper/main.py"
import os
import re
import json
import time
import boto3
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://books.toscrape.com"

def lambda_handler(event, context):
    # Get the DynamoDB table name and SNS topic ARN from environment variables.
    BOOKS_TABLE_NAME = os.environ.get("BOOKS_TABLE_NAME", "Books")
    SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")

    # Initialize the DynamoDB and SNS clients.
    dynamodb = boto3.resource("dynamodb")
    sns = boto3.client("sns")

    # Reference the DynamoDB table.
    books_table = dynamodb.Table(BOOKS_TABLE_NAME)

    # Determine the URL to scrape, defaulting to BASE_URL
    try:
        url = json.loads(event['Records'][0]['Sns']['Message'].replace("'", '"'))["url"]
    except:
        url = BASE_URL

    # Keep track of the number of pages processed
    pages_processed = 0

    # Maximum number of pages to process
    MAX_PAGES = 10

    while pages_processed < MAX_PAGES:
        response = requests.get(url)
        soup = BeautifulSoup(response.text, "html.parser")

        for article in soup.find_all("article"):
            # Extract book details
            title = article.find("h3").find("a").get("title").title()
            price = article.find("p", {"class": "price_color"}).get_text()[1:]

            # Correct the href if it doesn't contain "catalogue/"
            href = article.find("h3").find("a").get("href")
            if "catalogue/" not in href:
                href = f"catalogue/{href}"

            # Fetch and parse the book detail page
            detail_url = f"{BASE_URL}/{href}"
            detail_response = requests.get(detail_url)
            detail_soup = BeautifulSoup(detail_response.text, "html.parser")

            # Extract additional details from the book detail page
            upc = detail_soup.find("th", string="UPC").find_next("td").get_text().strip()
            category = (
                detail_soup.find("ul", {"class", "breadcrumb"})
                .find_all("li")[2]
                .text.strip()
            )
            description = detail_soup.find("div", {"id": "product_description"})
            stock = (
                detail_soup.find("p", {"class": "instock availability"})
                .get_text().strip()
            )
            stock = re.search(r"\d+", stock)[0]
            if description:
                description = description.find_next("p").get_text()

            # Construct the item to store in DynamoDB
            item = {
                "PK": upc,
                "category": category,
                "title": title,
                "price": price,
                "description": description,
                "stock": stock,
                "url": detail_url,
            }

            # Store the item in DynamoDB
            books_table.put_item(Item=item)

        # Increment the number of pages processed
        pages_processed += 1

        # Check for the next page
        next_page = soup.find("li", {"class": "next"})
        if not next_page:
            break

        # Correct the href if it doesn't contain "catalogue/"
        next_href = next_page.find("a")["href"]
        if "catalogue/" not in next_href:
            next_href = f"catalogue/{next_href}"

        # Construct the URL for the next page
        url = f"{BASE_URL}/{next_href}"

    if next_page:
        # Publish a message to the SNS topic to process the next 10 pages
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=str({"url": url}),
            Subject=f"Process next {MAX_PAGES} pages of books",
        )
```

Let's measure how long that function took to run locally:

```
Execution time: 167.53530287742615 seconds
```

Fantastic, it took under **3 minutes**!

This approach ensures that we never exceed the 15-minute timeout limit, as each time a new message is published to SNS, the timeout counter is refreshed, allowing continuous execution without interruption.

## Configuring The Web Scraper

Now that we have developed our function, let's proceed to configure the necessary AWS resources for its executions on the cloud.

```python title="functions/books/scraper/config.py" hl_lines="12-17 20 22 23"
from infra.services import Services


class ScraperConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="Scraper",
            path="./functions/books",
            description="Web scraper to populate Dynamo with books data",
            directory="scraper",
            timeout=5,
            layers=[services.layers.requests_layer, services.layers.bs4_layer],
            environment={
                "BOOKS_TABLE_NAME": services.dynamo_db.books_table.table_name,
                "SNS_TOPIC_ARN": services.sns.books_scraper_topic.topic_arn
            }
        )

        services.dynamo_db.books_table.grant_write_data(function)

        services.sns.create_trigger(services.sns.books_scraper_topic, function)
        services.sns.books_scraper_topic.grant_publish(function)
```

This configuration file outlines the setup and permissions for a Lambda function, detailing:

- **Timeout:** Specifies a maximum duration of 5 minutes for Lambda execution.
- **Layers:** Adds the requests and bs4 layers to the Lambda function.
- **Environment Variables:** Establishes the required environment variables for operation.
- **DynamoDB Access:** Provides the Lambda function with write access to the DynamoDB books table.
- **SNS Trigger:** Utilizes the SNS class helper method to link an SNS topic with the Lambda function.
- **SNS Publishing Permissions:** Empowers the Lambda function to publish messages to the books topic.

## Scheduling Executions With Event Bridge

The current configuration file equips us to execute the Lambda function as needed. However, it necessitates manual intervention for each run, which is an impractical approach for dynamic tasks like web scraping. The crux of the issue lies in the volatile nature of our target: website data, such as book prices and inventory, can change unpredictably.

To mitigate this, we must ensure our web scraper operates automatically at regular intervals, thus capturing updates without manual oversight. By leveraging **AWS EventBridge**, we can schedule our Lambda function to run periodically, ensuring our data collection remains current with minimal effort.

### Integrating EventBridge To The Services Class

To integrate AWS EventBridge for scheduling tasks, we begin by creating an EventBridge class using Forge. This is achieved with the following command:

```
forge service event_bridge
```

After executing the command, a new file named `event_bridge.py` is generated within the `infra/services` directory. Let's explore its contents and functionalities:

```python title="infra/services/event_bridge.py"

import aws_cdk.aws_events as events
import aws_cdk.aws_events_targets as targets


class EventBridge:
    def __init__(self, scope, resources, stage) -> None:
        self.scope = scope
        self.stage = stage

        self.event_bridge = events.EventBus.from_event_bus_arn(
            scope,
            id="EventBridge",
            event_bus_arn=resources["arns"]["event_bridge_arn"],
        )

    def create_rule(self, name, expression, target, only_prod=False):
        if only_prod and self.stage != "Prod":
            return
        events.Rule(
            self.scope,
            name,
            schedule=events.Schedule.expression(expression),
            targets=[targets.LambdaFunction(handler=target)],
        )
```

This class introduces a streamlined method for creating EventBridge rules, enabling the scheduling of Lambda function executions. Notably, it includes a condition to restrict rule creation to production environments, offering flexibility in deployment strategies.

Let's proceed to integrate our Lambda Function with the newly created EventBridge class.

```python title="functions/books/scraper/config.py" hl_lines="25-30"
from infra.services import Services


class ScraperConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="Scraper",
            path="./functions/books",
            description="Web scraper to populate Dynamo with books data",
            directory="scraper",
            timeout=5,
            layers=[services.layers.requests_layer, services.layers.bs4_layer],
            environment={
                "BOOKS_TABLE_NAME": services.dynamo_db.books_table.table_name,
                "SNS_TOPIC_ARN": services.sns.books_scraper_topic.topic_arn
            }
        )

        services.dynamo_db.books_table.grant_write_data(function)

        services.sns.create_trigger(services.sns.books_scraper_topic, function)
        services.sns.books_scraper_topic.grant_publish(function)

        services.event_bridge.create_rule(
            name="BooksScraperRule",
            expression="cron(0 12 ? * * *)",
            target=function,
            only_prod=True,
        )
```

### Cron Expression Explanation

The cron expression `cron(0 12 ? * * *)` is structured as follows:

- **0**: Represents the minute part of the time schedule. The `0` means the action will trigger at the zeroth minute of the hour.
- **12**: This is the hour part, set in 24-hour format. `12` signifies that the action will trigger at 12 PM.
- **?**: In the day-of-month field, a `?` indicates that this field is not specified, because the day-of-week field is being used or vice versa. AWS cron expressions require one of these fields to be a question mark to avoid confusion.
- **\***: The asterisk in the month field means "every month." The schedule does not limit the action to specific months; it will be eligible to run every month of the year.
- **\***: In the day-of-week field, an asterisk signifies "every day of the week." This makes the action eligible to run on any day of the week.
- **\***: The asterisk in the year field indicates "every year," ensuring the schedule is not limited to a specific year.

The cron expression `cron(0 12 ? * * *)` sets a schedule to trigger an action at 12 PM UTC every day.

### Preventing Redundant Triggers in Multi-Stage Environments

In a multi-stage deployment setup where all stages share a single DynamoDB table, it's inefficient and unnecessary to trigger the web scraper multiple times for each stage. This redundancy could lead to excessive resource utilization and potential data duplication issues.

To streamline operations and ensure efficient use of resources, we implement a strategic approach by activating the `only_prod` flag. This configuration ensures that the lambda function is scheduled to run exclusively in the Production environment. By doing so, we avoid repetitive triggers across development and staging environments, yet maintain up-to-date data in our shared DynamoDB table.
