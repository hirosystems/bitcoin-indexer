# Contributing

Thank you for considering contributing to this product! We welcome any contributions, whether it's bug fixes, new features, or improvements to the existing codebase.

## Your First Pull Request

Working on your first Pull Request? You can learn how from this free video series:

[How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

To help you get familiar with our contribution process, we have a list of [good first issues](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) that contain bugs that have a relatively limited scope. This is a great place to get started.

If you decide to fix an issue, please be sure to check the comment thread in case somebody is already working on a fix. If nobody is working on it at the moment, please leave a comment stating that you intend to work on it so other people don’t accidentally duplicate your effort.

If somebody claims an issue but doesn’t follow up for more than two weeks, it’s fine to take it over but you should still leave a comment. **Issues won't be assigned to anyone outside the core team**.

## How to run the repo test suite

```bash
docker-compose -f dockerfiles/docker-compose.dev.postgres.yml up
cargo test --workspace
docker-compose -f dockerfiles/docker-compose.dev.postgres.yml down
```

## How CI Mutants Output should be treated

1. **New Function Created in This PR:**
    - **Knowledgeable:** 
    Ideally, write unit tests. 
    This takes more time initially but is beneficial long-term.
    - **Not Knowledgeable:** 
    Create an issue to highlight the gap, check examples, using the `mutation-testing` label on GitHub: [Mutation Testing Issues](https://github.com/hirosystems/runehook/issues?q=is%3Aissue%20state%3Aopen%20label%3Amutation-testing).

2. **Modified Function in This PR:** 
Review the commit history to identify the developer who is familiar with the context of the function, create a new issue and tag him.

### Types of Mutants

1. **Caught:** 
No action is needed as these represent well-tested functions.
2. **Missed:** 
Add tests where coverage is lacking.
3. **Timeout:** 
Use the skip flag for functions that include network requests/responses to avoid hang-ups due to alterations.
4. **Unviable:** 
Implement defaults to enable running tests with these mutants.


### How to treat different types of mutants

#### 1. Caught

Caught mutants indicate functions that are well-tested, where mutations break the unit tests. 
Aim to achieve this status.

#### 2. Timeout

Timeouts often occur in functions altered to include endless waits (e.g., altered HTTP requests/responses). Apply the `#[cfg_attr(test, mutants::skip)]` flag. 
Look into the function that has the mutation creating a timeout and if it has http requests/responses, or any one or multiple child levels have requests/responses, add this flag like showcased in the below example.
  ```rust
  impl PeerNetwork {
      #[cfg_attr(test, mutants::skip)]
      /// Check that the sender is authenticated.
      /// Returns Some(remote sender address) if so
      /// Returns None otherwise
      fn check_peer_authenticated(&self, event_id: usize) -> Option<NeighborKey> {
  ```

#### 3. Missed
Missed mutants highlight that the function doesn’t have tests for specific cases.  
eg. if the function returns a `bool` and the mutant replaces the function’s body with `true`, then a missed mutant reflects that the function is not tested for the `false` case as it passes all test cases by having this default `true` value.

1. If you are the person creating the functions, most probably you are most adequate to create these tests. 
2. If you are the person modifying the function, if you are aware of how it works it would be best to be added by you as in the long run it would create less context switching for others that are aware of the function’s tests. 
3. If the context switching is worthy or you aren’t aware of the full context to add all the missing tests, than an issue should be created to highlight the problem and afterwards the tests be added or modified by someone else. [eg. issue format](https://github.com/stacks-network/stacks-core/issues/4872) 

#### 4. Unviable

Unviable mutants show a need for a default value for the return type of the function. 
This is needed in order for the function’s body to be replaced with this default value and run the test suite. 
While this increases the chances of catching untested scenarios, it doesn’t mean it catches all of them.  
[eg. issue format](https://github.com/stacks-network/stacks-core/issues/4867)  
If a default implementation would not cover it, or it can’t be created for this structure for various reasons, it can be skipped in the same way as timeouts `#[cfg_attr(test, mutants::skip)]`

```rust
// Define the Car struct with appropriate field types
#[derive(Debug, Clone)]
struct Car {
    color: String,
    model: String,
    year: i64,
}

// Manually implement the Default trait for Car
impl Default for Car {
    fn default() -> Self {
        Self {
            color: "Black".to_string(),
            model: "Generic Model".to_string(),
            year: 2020, // Specific default year
        }
    }
}

impl Car {
    // Constructor to create a new Car instance with specific attributes
    fn new(color: &str, model: &str, year: i64) -> Self {
        Self {
            color: color.to_string(),
            model: model.to_string(),
            year,
        }
    }
}

// Example usage of Car
fn main() {
    // Create a default Car using the Default trait
    let default_car = Car::default();
    println!("Default car: {:?}", default_car);

    // Create a custom Car using the new constructor
    let custom_car = Car::new("Red", "Ferrari", 2022);
    println!("Custom car: {:?}", custom_car);
}

```

### Contribution Prerequisites

... 🚧 Work in progress 🚧 ...
